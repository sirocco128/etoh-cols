import Link from "next/link";
import { EtohSubnav } from "@/components/etoh/EtohSubnav";
import { requireOpsPage } from "@/lib/ops-auth";
import { FULFILLMENT_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/order-types";
import { listEtohOrders } from "@/lib/etoh/sales";
import { formatThaiDate, formatThb } from "@/lib/etoh/ops-data";
import { bangkokToday } from "@/lib/etoh/repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function EtohOrdersPage() {
  await requireOpsPage("orders.read");
  const items = listEtohOrders();
  const today = bangkokToday();
  const toShip = items.filter((i) => !i.progress.fullyShipped && i.order.fulfillmentStatus !== "cancelled");
  const openAr = items.reduce((s, i) => s + Math.max(0, i.progress.invoicedTotal - i.order.paidAmount), 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-forest">ออเดอร์เอทานอล</h1>
      <p className="mt-1 text-sm text-ink/70">
        รอส่ง {toShip.length} ออเดอร์ · ลูกหนี้ค้างรับ {formatThb(openAr)} บาท · การรับชำระและเอกสารบัญชีดูได้ที่{" "}
        <Link href="/ops/orders" className="text-forest underline">ออเดอร์ (บัญชี)</Link>
      </p>
      <EtohSubnav current="orders" />
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-forest/15 text-left text-forest">
              <th className="px-2 py-2 font-semibold">ออเดอร์</th>
              <th className="px-2 py-2 font-semibold">ลูกค้า</th>
              <th className="px-2 py-2 text-right font-semibold">ลิตร</th>
              <th className="px-2 py-2 text-right font-semibold">ยอดรวม</th>
              <th className="px-2 py-2 font-semibold">ชำระ</th>
              <th className="px-2 py-2 font-semibold">จัดส่ง</th>
              <th className="px-2 py-2 font-semibold">ครบกำหนด</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-2 py-8 text-center text-ink/60">
                  ยังไม่มีออเดอร์ — เปิดจากใบเสนอราคาที่ลูกค้ายืนยันแล้ว
                </td>
              </tr>
            ) : (
              items.map(({ order, meta, shipments, progress }) => {
                const shipment = shipments[shipments.length - 1] ?? null;
                const overdue = shipments.some((s) => s.dueDate && s.dueDate < today) && order.paidAmount + 0.004 < progress.invoicedTotal;
                return (
                  <tr key={order.orderId} className="border-b border-forest/10">
                    <td className="px-2 py-2.5">
                      <Link href={`/ops/etoh/orders/${order.orderId}`} className="font-mono text-forest underline-offset-2 hover:underline">
                        {order.orderId}
                      </Link>
                      <p className="text-xs text-ink/50">{formatThaiDate(order.createdAt)}</p>
                    </td>
                    <td className="px-2 py-2.5">
                      {order.billingName}
                      <p className="text-xs text-ink/50">{meta.creditTermDays ? `เครดิต ${meta.creditTermDays} วัน` : "เงินสด"}</p>
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{meta.totalLitres.toLocaleString("th-TH")}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{formatThb(order.totalAmount)}</td>
                    <td className="px-2 py-2.5">{PAYMENT_STATUS_LABELS[order.paymentStatus]}</td>
                    <td className="px-2 py-2.5">
                      {shipment ? (
                        <span>
                          {shipments.length} ใบส่งของ · {progress.fullyShipped ? (progress.allDelivered ? "ส่งครบ ถึงแล้ว" : "ส่งครบ กำลังส่ง") : "ส่งบางส่วน"}
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">{FULFILLMENT_LABELS[order.fulfillmentStatus]} · รอส่ง</span>
                      )}
                    </td>
                    <td className={`px-2 py-2.5 ${overdue ? "font-semibold text-red-700" : "text-ink/70"}`}>
                      {shipment?.dueDate ? formatThaiDate(shipment.dueDate) : "—"}
                      {overdue ? " · เกินกำหนด" : ""}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
