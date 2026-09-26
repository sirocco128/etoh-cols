import Link from "next/link";
import { notFound } from "next/navigation";
import { EtohPrintButton } from "@/components/etoh/EtohPrintButton";
import { requireOpsPage } from "@/lib/ops-auth";
import { getCustomerById } from "@/lib/customer-repository";
import { getPack } from "@/lib/etoh/catalog";
import { DEPOSIT_METHOD_LABELS, getDepositDoc, getShipment, type DepositMethod } from "@/lib/etoh/sales";
import { formatThaiDate, formatThb } from "@/lib/etoh/ops-data";
import { bahtText } from "@/lib/th-baht-text";
import { getSiteConfig } from "@/lib/site";
import { isPlaceholderTaxId } from "@/lib/company";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function DepositDocPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOpsPage("stock.read");
  const { id } = await params;
  const doc = getDepositDoc(Number(id));
  if (!doc) notFound();
  const customer = getCustomerById(doc.customerId);
  const shipment = doc.shipmentId ? getShipment(doc.shipmentId) : null;
  const site = getSiteConfig();
  const isCharge = doc.kind === "charge";
  const packName = doc.packCode ? getPack(doc.packCode).nameTh : "ถัง 200 ลิตร / IBC";

  return (
    <div>
      <div className="flex items-center justify-between print:hidden">
        <Link href="/ops/etoh/drums" className="text-sm text-forest underline-offset-2 hover:underline">← ถังหมุนเวียน</Link>
        <EtohPrintButton />
      </div>
      <article className="mx-auto mt-6 max-w-3xl rounded-xl border border-forest/15 bg-white p-8 text-ink print:mt-0 print:border-0 print:p-0">
        {doc.status === "void" ? (
          <p className="mb-4 rounded bg-red-50 px-3 py-2 text-center text-sm font-bold text-red-700">ยกเลิกแล้ว</p>
        ) : null}
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-forest/20 pb-5">
          <div>
            <p className="text-xl font-bold text-forest">{site.legalName}</p>
            <p className="text-sm text-ink/70">{site.name}</p>
            {!isPlaceholderTaxId(site.taxId) ? <p className="text-xs text-ink/70">เลขประจำตัวผู้เสียภาษี {site.taxId}</p> : null}
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">{isCharge ? "ใบรับเงินมัดจำภาชนะ" : "ใบคืนเงินมัดจำภาชนะ"}</p>
            <p className="text-xs text-ink/60">{isCharge ? "CONTAINER DEPOSIT RECEIPT" : "CONTAINER DEPOSIT REFUND"}</p>
            <p className="mt-2 font-mono text-sm">{doc.docNo}</p>
            <p className="text-xs text-ink/70">วันที่ {formatThaiDate(doc.createdAt)}</p>
            {shipment ? <p className="text-xs text-ink/70">อ้างอิงใบส่งของ {shipment.dnNo}</p> : null}
          </div>
        </header>
        <section className="mt-5 text-sm">
          <p className="text-xs text-ink/60">{isCharge ? "ได้รับเงินจาก" : "จ่ายคืนให้แก่"}</p>
          <p className="font-semibold">{customer?.billingName || customer?.company || `ลูกค้า #${doc.customerId}`}</p>
          {customer?.taxId ? <p className="text-xs">เลขผู้เสียภาษี {customer.taxId}</p> : null}
        </section>
        <table className="mt-5 w-full text-sm">
          <thead>
            <tr className="border-y border-forest/20 bg-forest-mist/50 text-left">
              <th className="px-2 py-2 font-semibold">รายการ</th>
              <th className="px-2 py-2 text-right font-semibold">จำนวน</th>
              <th className="px-2 py-2 text-right font-semibold">จำนวนเงิน (บาท)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-forest/10">
              <td className="px-2 py-3">
                {isCharge ? "เงินมัดจำ" : "คืนเงินมัดจำ"}{packName}
                <p className="text-xs text-ink/60">{doc.note}</p>
              </td>
              <td className="px-2 py-3 text-right tabular-nums">{doc.qty}</td>
              <td className="px-2 py-3 text-right tabular-nums">{formatThb(doc.amountThb)}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-3 text-right font-bold">รวม {formatThb(doc.amountThb)} บาท</p>
        <p className="text-right text-xs text-ink/70">({bahtText(doc.amountThb)})</p>
        <div className="mt-5 space-y-1 text-xs text-ink/70">
          <p>
            สถานะ:{" "}
            {doc.status === "settled"
              ? `${isCharge ? "รับเงินแล้ว" : "จ่ายคืนแล้ว"} ${formatThaiDate(doc.settledAt)} · ${doc.method ? DEPOSIT_METHOD_LABELS[doc.method as DepositMethod] : ""}${doc.reference ? ` · ${doc.reference}` : ""}`
              : doc.status === "open"
                ? isCharge
                  ? "รอรับเงิน"
                  : "รอจ่ายคืน"
                : "ยกเลิก"}
          </p>
          <p>เงินมัดจำภาชนะไม่อยู่ในฐานภาษีมูลค่าเพิ่ม เอกสารนี้ไม่ใช่ใบกำกับภาษี · คืนเงินเมื่อส่งภาชนะคืนในสภาพใช้งานได้</p>
        </div>
        <footer className="mt-10 grid gap-10 text-center text-xs text-ink/70 sm:grid-cols-2">
          <div>
            <div className="mx-auto h-12 w-44 border-b border-ink/40" />
            <p className="mt-1">{isCharge ? "ผู้รับเงิน" : "ผู้จ่ายเงิน"}</p>
          </div>
          <div>
            <div className="mx-auto h-12 w-44 border-b border-ink/40" />
            <p className="mt-1">{isCharge ? "ผู้จ่ายเงิน (ลูกค้า)" : "ผู้รับเงิน (ลูกค้า)"}</p>
          </div>
        </footer>
      </article>
    </div>
  );
}
