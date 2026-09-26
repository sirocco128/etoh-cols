import Link from "next/link";
import { notFound } from "next/navigation";
import { EtohPrintButton } from "@/components/etoh/EtohPrintButton";
import { requireOpsPage } from "@/lib/ops-auth";
import { getOrderRepository } from "@/lib/order-repository";
import { getGrade, getPack, ETOH_DOCUMENT_LABELS } from "@/lib/etoh/catalog";
import { getEtohOrder, getShipmentByOrder } from "@/lib/etoh/sales";
import { formatThaiDate } from "@/lib/etoh/ops-data";
import { getSiteConfig } from "@/lib/site";
import { isPlaceholderTaxId } from "@/lib/company";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function DeliveryNotePage({ params }: { params: Promise<{ orderId: string }> }) {
  await requireOpsPage("orders.read");
  const { orderId } = await params;
  const order = getOrderRepository().getOrderByOrderId(orderId);
  const meta = getEtohOrder(orderId);
  const shipment = getShipmentByOrder(orderId);
  if (!order || !meta || !shipment) notFound();
  const site = getSiteConfig();
  const documents = Array.from(new Set(meta.lines.flatMap((l) => getGrade(l.grade).documents)));

  return (
    <div>
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/ops/etoh/orders/${orderId}`} className="text-sm text-forest underline-offset-2 hover:underline">← ออเดอร์</Link>
        <EtohPrintButton />
      </div>
      <article className="mx-auto mt-6 max-w-4xl rounded-xl border border-forest/15 bg-white p-8 text-ink print:mt-0 print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-forest/20 pb-5">
          <div>
            <p className="text-xl font-bold text-forest">{site.legalName}</p>
            <p className="text-sm text-ink/70">{site.name}</p>
            {!isPlaceholderTaxId(site.taxId) ? <p className="text-xs text-ink/70">เลขประจำตัวผู้เสียภาษี {site.taxId}</p> : null}
            <p className="text-xs text-ink/70">{site.phoneDisplay} · {site.email}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">ใบส่งของ</p>
            <p className="text-xs text-ink/60">DELIVERY NOTE</p>
            <p className="mt-2 font-mono text-sm">{shipment.dnNo}</p>
            <p className="text-xs text-ink/70">วันที่ {formatThaiDate(shipment.shippedAt)}</p>
            <p className="text-xs text-ink/70">อ้างอิงใบกำกับภาษี {shipment.taxInvoiceId}</p>
            <p className="text-xs text-ink/70">ออเดอร์ {order.orderId}</p>
          </div>
        </header>
        <section className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-ink/60">ลูกค้า</p>
            <p className="font-semibold">{order.billingName}</p>
            {order.billingTaxId ? <p className="text-xs">เลขผู้เสียภาษี {order.billingTaxId}</p> : null}
            <p className="text-xs">{order.contactName} · {order.phone}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs text-ink/60">ส่งถึง</p>
            <p>{shipment.shipTo || "—"}</p>
            <p className="text-xs">รถ {shipment.vehicle || "—"} · คนขับ {shipment.driver || "—"}</p>
          </div>
        </section>
        <table className="mt-5 w-full text-sm">
          <thead>
            <tr className="border-y border-forest/20 bg-forest-mist/50 text-left">
              <th className="px-2 py-2 font-semibold">#</th>
              <th className="px-2 py-2 font-semibold">รายการ</th>
              <th className="px-2 py-2 text-right font-semibold">จำนวน</th>
              <th className="px-2 py-2 text-right font-semibold">ลิตร</th>
              <th className="px-2 py-2 font-semibold">ล็อต / CoA</th>
            </tr>
          </thead>
          <tbody>
            {meta.lines.map((l, i) => (
              <tr key={i} className="border-b border-forest/10 align-top">
                <td className="px-2 py-2">{i + 1}</td>
                <td className="px-2 py-2">
                  {getGrade(l.grade).nameTh} · {getPack(l.pack).nameTh}
                  <p className="font-mono text-xs text-ink/50">{l.sku} · ≈ {(l.litres * getGrade(l.grade).densityKgPerL).toLocaleString("th-TH")} กก.</p>
                </td>
                <td className="px-2 py-2 text-right tabular-nums">{l.qty}</td>
                <td className="px-2 py-2 text-right tabular-nums">{l.litres.toLocaleString("th-TH")}</td>
                <td className="px-2 py-2 text-xs">
                  {shipment.lots.filter((s) => s.lineIndex === i).map((s) => (
                    <p key={`${s.lotId}`}>
                      <span className="font-mono">{s.lotNo}</span> · {s.litres.toLocaleString("th-TH")} ล. · {s.coaPurityPct ?? "—"}%
                    </p>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 text-xs text-ink/70">
          <p className="font-semibold text-ink">เอกสารแนบ</p>
          <ul className="mt-1 list-disc pl-5">
            {documents.map((d) => (
              <li key={d}>{ETOH_DOCUMENT_LABELS[d]} ตามเลขล็อตด้านบน</li>
            ))}
          </ul>
          <p className="mt-2">สินค้าเป็นของเหลวไวไฟ — จัดเก็บห่างจากความร้อนและประกายไฟ ตาม SDS</p>
        </div>
        <footer className="mt-10 grid gap-10 text-center text-xs text-ink/70 sm:grid-cols-3">
          {["ผู้จัดส่ง", "พนักงานขับรถ", "ผู้รับสินค้า"].map((role) => (
            <div key={role}>
              <div className="mx-auto h-12 w-40 border-b border-ink/40" />
              <p className="mt-1">{role}</p>
              <p className="text-ink/50">วันที่ ____/____/______</p>
            </div>
          ))}
        </footer>
      </article>
    </div>
  );
}
