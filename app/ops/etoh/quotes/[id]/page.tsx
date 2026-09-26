import Link from "next/link";
import { notFound } from "next/navigation";
import { EtohForm } from "@/components/etoh/EtohForm";
import { EtohPrintButton } from "@/components/etoh/EtohPrintButton";
import { convertQuoteToOrderAction, setEtohQuoteStatusAction } from "@/app/actions/ops-etoh";
import { creditPosition } from "@/lib/etoh/sales";
import { actorMay, requireOpsPage } from "@/lib/ops-auth";
import { ETOH_QUOTE_STATUS_LABELS, getQuote, type EtohQuoteStatus } from "@/lib/etoh/repository";
import { ETOH_DOCUMENT_LABELS, getGrade, getTier } from "@/lib/etoh/catalog";
import { stripEtohCost } from "@/lib/etoh/pricing";
import { formatThaiDate, formatThb } from "@/lib/etoh/ops-data";
import { bahtText } from "@/lib/th-baht-text";
import { getSiteConfig } from "@/lib/site";
import { formatRegisteredAddress, isPlaceholderTaxId } from "@/lib/company";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NEXT_STATUS: Record<EtohQuoteStatus, EtohQuoteStatus[]> = {
  draft: ["sent", "rejected", "expired"],
  sent: ["accepted", "rejected", "expired"],
  accepted: [],
  rejected: [],
  expired: [],
};

export default async function EtohQuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireOpsPage("quotes.read");
  const { id } = await params;
  const quote = getQuote(Number(id));
  if (!quote) notFound();
  const canSeeCost = actorMay(actor, "factory.read");
  const result = canSeeCost ? quote.result : stripEtohCost(quote.result);
  const site = getSiteConfig();
  const address = formatRegisteredAddress({
    streetAddress: site.localBusiness.streetAddress,
    locality: site.localBusiness.locality,
    region: site.localBusiness.region,
    postalCode: site.localBusiness.postalCode,
  });
  const documents = Array.from(new Set(result.lines.flatMap((l) => getGrade(l.grade).documents)));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/ops/etoh/quotes" className="text-sm text-forest underline-offset-2 hover:underline">
          ← ใบเสนอราคาทั้งหมด
        </Link>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-forest-mist px-3 py-1 text-sm text-forest">
            {ETOH_QUOTE_STATUS_LABELS[quote.status]}
          </span>
          <EtohPrintButton />
        </div>
      </div>

      {isPlaceholderTaxId(site.taxId) ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 print:hidden">
          ยังไม่ได้ตั้งเลขผู้เสียภาษี / ที่อยู่จดทะเบียนของบริษัท (SITE_TAX_ID, SITE_STREET_ADDRESS) — ใช้เป็นเอกสารภายในได้เท่านั้น
        </p>
      ) : null}

      <article className="mx-auto mt-6 max-w-4xl rounded-xl border border-forest/15 bg-white p-8 text-ink print:mt-0 print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-forest/20 pb-5">
          <div>
            <p className="text-xl font-bold text-forest">{site.legalName}</p>
            <p className="text-sm text-ink/70">{site.name}</p>
            {address.trim() ? <p className="mt-1 max-w-sm text-xs text-ink/70">{address}</p> : null}
            {!isPlaceholderTaxId(site.taxId) ? (
              <p className="text-xs text-ink/70">เลขประจำตัวผู้เสียภาษี {site.taxId}</p>
            ) : null}
            <p className="text-xs text-ink/70">
              {site.phoneDisplay} · {site.email}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">ใบเสนอราคา</p>
            <p className="text-xs text-ink/60">QUOTATION</p>
            <p className="mt-2 font-mono text-sm">{quote.docNo}</p>
            <p className="text-xs text-ink/70">วันที่ {formatThaiDate(quote.createdAt)}</p>
            <p className="text-xs text-ink/70">ยืนราคาถึง {formatThaiDate(quote.validUntil)}</p>
          </div>
        </header>

        <section className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-ink/60">เสนอราคาแก่</p>
            <p className="font-semibold">{quote.customerName}</p>
            {quote.customerTaxId ? <p className="text-xs">เลขผู้เสียภาษี {quote.customerTaxId}</p> : null}
            {quote.contact ? <p className="text-xs">ผู้ติดต่อ {quote.contact}</p> : null}
          </div>
          <div className="sm:text-right">
            <p className="text-xs text-ink/60">ระดับราคา</p>
            <p>
              {getTier(quote.appliedTier).nameTh}
              {result.appliedDiscountPct > 0 ? ` (ส่วนลด ${result.appliedDiscountPct}%)` : ""}
            </p>
          </div>
        </section>

        <table className="mt-5 w-full text-sm">
          <thead>
            <tr className="border-y border-forest/20 bg-forest-mist/50 text-left">
              <th className="px-2 py-2 font-semibold">#</th>
              <th className="px-2 py-2 font-semibold">รายการ</th>
              <th className="px-2 py-2 text-right font-semibold">จำนวน</th>
              <th className="px-2 py-2 text-right font-semibold">ราคา/หน่วย</th>
              <th className="px-2 py-2 text-right font-semibold">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            {result.lines.map((l, i) => (
              <tr key={`${l.sku}-${i}`} className="border-b border-forest/10 align-top">
                <td className="px-2 py-2">{i + 1}</td>
                <td className="px-2 py-2">
                  <p>{l.label}</p>
                  <p className="text-xs text-ink/60">
                    {l.sku} · รวม {l.litres.toLocaleString("th-TH")} ลิตร (≈ {l.kg.toLocaleString("th-TH")} กก.) ·{" "}
                    {formatThb(l.pricePerLitreThb)} บาท/ลิตร
                  </p>
                  {l.depositTotalThb > 0 ? (
                    <p className="text-xs text-ink/60">
                      มัดจำภาชนะ {formatThb(l.depositPerUnitThb)} × {l.qty} (คืนเงินเมื่อคืนภาชนะ)
                    </p>
                  ) : null}
                  {l.marginPct != null ? (
                    <p className="text-xs text-ink/50 print:hidden">
                      ต้นทุน {formatThb(l.costTotalThb ?? 0)} · กำไร {l.marginPct}%
                    </p>
                  ) : null}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">{l.qty.toLocaleString("th-TH")}</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatThb(l.unitPriceThb)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatThb(l.lineTotalThb)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex flex-wrap justify-between gap-6">
          <div className="max-w-sm text-xs text-ink/70">
            <p className="font-semibold text-ink">เอกสารที่แนบพร้อมสินค้า</p>
            <ul className="mt-1 list-disc pl-5">
              {documents.map((d) => (
                <li key={d}>{ETOH_DOCUMENT_LABELS[d]}</li>
              ))}
            </ul>
            {quote.note ? <p className="mt-3 whitespace-pre-line">หมายเหตุ: {quote.note}</p> : null}
          </div>
          <dl className="min-w-72 space-y-1 text-sm tabular-nums">
            <Row label="มูลค่าสินค้า" value={formatThb(result.goodsThb)} />
            {result.deliveryFeeThb > 0 ? <Row label="ค่าขนส่ง" value={formatThb(result.deliveryFeeThb)} /> : null}
            {result.extraDiscountThb > 0 ? (
              <Row label="ส่วนลด" value={`−${formatThb(result.extraDiscountThb)}`} />
            ) : null}
            <Row label="ยอดก่อนภาษี" value={formatThb(result.vatBaseThb)} />
            <Row label="ภาษีมูลค่าเพิ่ม 7%" value={formatThb(result.vatThb)} />
            {result.depositThb > 0 ? <Row label="มัดจำภาชนะ (ไม่มี VAT)" value={formatThb(result.depositThb)} /> : null}
            <div className="flex justify-between border-t border-forest/30 pt-2 text-base font-bold">
              <dt>รวมทั้งสิ้น</dt>
              <dd>{formatThb(result.grandTotalThb)}</dd>
            </div>
            <p className="text-right text-xs text-ink/70">({bahtText(result.grandTotalThb)})</p>
          </dl>
        </div>

        <footer className="mt-10 grid gap-10 text-center text-xs text-ink/70 sm:grid-cols-2">
          <div>
            <div className="mx-auto h-12 w-48 border-b border-ink/40" />
            <p className="mt-1">ผู้เสนอราคา ({quote.createdBy})</p>
          </div>
          <div>
            <div className="mx-auto h-12 w-48 border-b border-ink/40" />
            <p className="mt-1">ผู้อนุมัติสั่งซื้อ</p>
          </div>
        </footer>
      </article>

      {actorMay(actor, "quotes.write") && NEXT_STATUS[quote.status].length ? (
        <div className="mx-auto mt-6 flex max-w-4xl flex-wrap gap-3 print:hidden">
          {NEXT_STATUS[quote.status].map((s) => (
            <EtohForm key={s} action={setEtohQuoteStatusAction} submitLabel={`เปลี่ยนเป็น "${ETOH_QUOTE_STATUS_LABELS[s]}"`} compact className="space-y-2">
              <input type="hidden" name="id" value={quote.id} />
              <input type="hidden" name="status" value={s} />
            </EtohForm>
          ))}
        </div>
      ) : null}

      {quote.orderId ? (
        <div className="mx-auto mt-6 max-w-4xl rounded-xl border border-forest/20 bg-forest-mist px-5 py-4 text-sm print:hidden">
          เปิดออเดอร์แล้ว{" "}
          <Link href={`/ops/etoh/orders/${quote.orderId}`} className="font-mono font-semibold text-forest underline">
            {quote.orderId}
          </Link>
        </div>
      ) : quote.status === "accepted" && actorMay(actor, "orders.write") ? (
        <ConvertPanel quoteId={quote.id} customerId={quote.customerId} total={result.vatBaseThb + result.vatThb} canOverride={actorMay(actor, "catalog.write")} />
      ) : null}
    </div>
  );
}

function ConvertPanel({
  quoteId,
  customerId,
  total,
  canOverride,
}: {
  quoteId: number;
  customerId: number | null;
  total: number;
  canOverride: boolean;
}) {
  if (!customerId) {
    return (
      <div className="mx-auto mt-6 max-w-4xl rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 print:hidden">
        ใบเสนอราคานี้ไม่ได้ผูกลูกค้าใน CRM — สร้างลูกค้าที่ <Link href="/ops/customers/new" className="underline">CRM</Link> แล้วทำใบเสนอราคาใหม่โดยเลือกลูกค้า
      </div>
    );
  }
  const pos = creditPosition(customerId);
  const credit = pos.creditTermDays > 0;
  const over = credit && pos.creditLimitThb > 0 && total > pos.availableThb;
  return (
    <div className="mx-auto mt-6 max-w-4xl rounded-xl border border-forest/15 bg-paper p-5 print:hidden">
      <h2 className="font-semibold text-forest">เปิดออเดอร์จากใบเสนอราคานี้</h2>
      <p className="mt-1 text-sm text-ink/70">
        {credit
          ? `ลูกค้าเครดิต ${pos.creditTermDays} วัน — ส่งของได้ก่อน ใบกำกับภาษีออกตอนส่งของ`
          : "ลูกค้าเงินสด — ระบบออกใบแจ้งหนี้เต็มจำนวนพร้อม QR พร้อมเพย์ ต้องรับชำระก่อนส่งของ"}
      </p>
      {credit && pos.creditLimitThb > 0 ? (
        <p className={`mt-2 text-sm ${over ? "text-red-700" : "text-ink/70"}`}>
          วงเงิน {formatThb(pos.creditLimitThb)} · ค้างชำระ {formatThb(pos.outstandingThb)} · คงเหลือ {formatThb(pos.availableThb)} · ออเดอร์นี้ {formatThb(total)} บาท
        </p>
      ) : null}
      <EtohForm action={convertQuoteToOrderAction} submitLabel="เปิดออเดอร์" className="mt-4 space-y-3">
        <input type="hidden" name="quoteId" value={quoteId} />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium">ที่อยู่จัดส่ง</span>
            <input name="shipToAddress" className="mt-1 w-full rounded border border-forest/20 px-3 py-2 text-sm" />
          </label>
          <label className="block text-sm">
            <span className="font-medium">จังหวัด</span>
            <input name="shipToProvince" className="mt-1 w-full rounded border border-forest/20 px-3 py-2 text-sm" />
          </label>
        </div>
        {over && canOverride ? (
          <label className="flex items-center gap-2 text-sm text-red-700">
            <input type="checkbox" name="overrideCreditLimit" /> อนุมัติเกินวงเงิน (บันทึกใน audit log)
          </label>
        ) : null}
      </EtohForm>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-6">
      <dt className="text-ink/70">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
