import Link from "next/link";
import { notFound } from "next/navigation";
import { EtohForm } from "@/components/etoh/EtohForm";
import { EtohSubnav } from "@/components/etoh/EtohSubnav";
import { markDeliveredAction, shipOrderAction } from "@/app/actions/ops-etoh";
import { actorMay, requireOpsPage } from "@/lib/ops-auth";
import { getOrderBundle } from "@/lib/order-service";
import { BILLING_DOCUMENT_LABELS, FULFILLMENT_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/order-types";
import { getGrade, getPack, type EtohGradeCode } from "@/lib/etoh/catalog";
import { getQuote } from "@/lib/etoh/repository";
import { availableLitresByGrade, getEtohOrder, listShipmentsByOrder, orderProgress } from "@/lib/etoh/sales";
import { formatThaiDate, formatThb } from "@/lib/etoh/ops-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const inputCls = "mt-1 w-full rounded border border-forest/20 px-3 py-2 text-sm";

export default async function EtohOrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const actor = await requireOpsPage("orders.read");
  const { orderId } = await params;
  const bundle = getOrderBundle(orderId);
  const meta = getEtohOrder(orderId);
  if (!bundle || !meta) notFound();
  const { order } = bundle;
  const quote = getQuote(meta.quoteId);
  const shipments = listShipmentsByOrder(orderId);
  const progress = orderProgress(meta, shipments);
  const stock = availableLitresByGrade();
  const needByGrade = new Map<EtohGradeCode, number>();
  meta.lines.forEach((l, i) => {
    const remainingLitres = getPack(l.pack).litres * (progress.lines[i]?.remaining ?? 0);
    if (remainingLitres > 0) needByGrade.set(l.grade, (needByGrade.get(l.grade) ?? 0) + remainingLitres);
  });
  const cashNotPaid = meta.creditTermDays <= 0 && order.paymentStatus !== "paid";
  const canShip = actorMay(actor, "stock.write") && !progress.fullyShipped && order.fulfillmentStatus !== "cancelled";
  const canWrite = actorMay(actor, "stock.write");

  return (
    <div>
      <p className="text-sm">
        <Link href="/ops/etoh/orders" className="text-forest underline-offset-2 hover:underline">← ออเดอร์เอทานอล</Link>
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-mono text-2xl font-bold text-forest">{order.orderId}</h1>
          <p className="text-sm text-ink/70">
            {order.billingName} · {meta.creditTermDays ? `เครดิต ${meta.creditTermDays} วัน` : "เงินสด (ชำระก่อนส่ง)"}
            {quote ? (
              <>
                {" "}· จาก <Link href={`/ops/etoh/quotes/${quote.id}`} className="font-mono underline">{quote.docNo}</Link>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="rounded-full bg-forest-mist px-3 py-1 text-forest">{PAYMENT_STATUS_LABELS[order.paymentStatus]}</span>
          <span className="rounded-full bg-forest-mist px-3 py-1 text-forest">{FULFILLMENT_LABELS[order.fulfillmentStatus]}</span>
        </div>
      </div>
      <EtohSubnav current="orders" />

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="rounded-xl border border-forest/15 bg-paper p-5">
          <h2 className="font-semibold text-forest">รายการ</h2>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b border-forest/15 text-left text-forest">
                <th className="py-2 pr-2 font-semibold">สินค้า</th>
                <th className="py-2 pr-2 text-right font-semibold">จำนวน</th>
                <th className="py-2 pr-2 text-right font-semibold">ส่งแล้ว</th>
                <th className="py-2 pr-2 text-right font-semibold">ลิตร</th>
                <th className="py-2 text-right font-semibold">รวม</th>
              </tr>
            </thead>
            <tbody>
              {meta.lines.map((l, i) => (
                <tr key={`${l.sku}-${i}`} className="border-b border-forest/10">
                  <td className="py-2 pr-2">
                    {getGrade(l.grade).nameTh} · {getPack(l.pack).nameTh}
                    <p className="font-mono text-xs text-ink/50">{l.sku}</p>
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums">{l.qty}</td>
                  <td className={`py-2 pr-2 text-right tabular-nums ${progress.lines[i]?.remaining ? "text-amber-700" : "text-forest"}`}>
                    {progress.lines[i]?.shipped ?? 0}
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums">{l.litres.toLocaleString("th-TH")}</td>
                  <td className="py-2 text-right tabular-nums">{formatThb(l.lineTotalThb)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="ml-auto mt-3 max-w-xs space-y-1 text-sm tabular-nums">
            <div className="flex justify-between"><dt className="text-ink/70">ก่อน VAT</dt><dd>{formatThb(order.subtotalExVat)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink/70">VAT 7%</dt><dd>{formatThb(order.vatAmount)}</dd></div>
            <div className="flex justify-between font-bold text-forest"><dt>รวม</dt><dd>{formatThb(order.totalAmount)}</dd></div>
            <div className="flex justify-between text-ink/70"><dt>ออกใบกำกับแล้ว</dt><dd>{formatThb(progress.invoicedTotal)}</dd></div>
            <div className="flex justify-between text-ink/70"><dt>ชำระแล้ว</dt><dd>{formatThb(order.paidAmount)}</dd></div>
            {meta.depositThb > 0 ? (
              <p className="pt-1 text-xs text-ink/55">มัดจำภาชนะ {formatThb(meta.depositThb)} บาท (นอกฐาน VAT · ทะเบียนถัง)</p>
            ) : null}
          </dl>

          <h3 className="mt-6 font-semibold text-forest">เอกสาร</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {bundle.documents.length === 0 ? <li className="text-ink/60">ยังไม่มีเอกสาร</li> : null}
            {bundle.documents.map((d) => (
              <li key={d.documentId}>
                <span className="font-mono">{d.documentId}</span> · {BILLING_DOCUMENT_LABELS[d.documentType]} · {formatThb(d.grandTotal)} บาท
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink/60">
            รับชำระ / อนุมัติสลิป / พิมพ์เอกสาร:{" "}
            <Link href={`/ops/orders/${order.orderId}`} className="text-forest underline">หน้าออเดอร์ฝ่ายบัญชี</Link>
          </p>
        </section>

        <section className="space-y-4">
          {shipments.map((shipment) => (
            <div key={shipment.id} className="rounded-xl border border-forest/15 bg-paper p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-forest">ใบส่งของ {shipment.dnNo}</h2>
                <Link href={`/ops/etoh/orders/${order.orderId}/dn?dn=${shipment.dnNo}`} className="rounded border border-forest/30 px-3 py-1 text-xs text-forest">พิมพ์</Link>
              </div>
              <p className="mt-1 text-sm text-ink/70">
                ส่งเมื่อ {formatThaiDate(shipment.shippedAt)} · ใบกำกับภาษี <span className="font-mono">{shipment.taxInvoiceId}</span> ({formatThb(shipment.grandTotal)} บาท)
                {shipment.dueDate ? ` · ครบกำหนด ${formatThaiDate(shipment.dueDate)}` : ""}
                {shipment.depositThb > 0 ? ` · มัดจำภาชนะ ${formatThb(shipment.depositThb)}` : ""}
              </p>
              <ul className="mt-3 space-y-1 text-sm">
                {shipment.items.map((it) => {
                  const line = meta.lines[it.lineIndex];
                  return (
                    <li key={it.lineIndex}>
                      {line ? `${getGrade(line.grade).nameTh} · ${getPack(line.pack).nameTh}` : "—"} × {it.qty}
                      <span className="ml-2 text-xs text-ink/55">
                        {shipment.lots
                          .filter((l) => l.lineIndex === it.lineIndex)
                          .map((l) => `${l.lotNo} ${l.litres.toLocaleString("th-TH")} ล. (CoA ${l.coaPurityPct ?? "—"}%)`)
                          .join(" · ")}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {shipment.status === "delivered" ? (
                <p className="mt-3 rounded-lg bg-forest-mist px-3 py-2 text-sm text-forest">
                  ส่งถึงแล้ว {formatThaiDate(shipment.deliveredAt)} · ผู้รับ {shipment.receivedBy}
                </p>
              ) : canWrite ? (
                <EtohForm action={markDeliveredAction} submitLabel="บันทึกส่งถึงลูกค้า" compact className="mt-3 flex flex-wrap items-end gap-2">
                  <input type="hidden" name="shipmentId" value={shipment.id} />
                  <label className="text-xs">
                    ผู้รับสินค้า
                    <input name="receivedBy" required className="ml-1 rounded border border-forest/20 px-2 py-1" />
                  </label>
                </EtohForm>
              ) : null}
            </div>
          ))}

          {!progress.fullyShipped ? (
            <div className="rounded-xl border border-forest/15 bg-paper p-5">
              <h2 className="font-semibold text-forest">{progress.anyShipped ? "ส่งรอบถัดไป" : "ออกใบส่งของ"}</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {[...needByGrade].map(([g, need]) => (
                  <li key={g} className={(stock[g] ?? 0) < need ? "text-amber-700" : "text-ink/75"}>
                    {getGrade(g).nameTh}: ค้างส่ง {need.toLocaleString("th-TH")} ล. · พร้อมขาย {(stock[g] ?? 0).toLocaleString("th-TH")} ล.
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-ink/60">
                ส่งแบ่งหลายรอบได้ — ทุกรอบตัดล็อต FIFO ออกใบกำกับภาษีตามของที่ส่ง บันทึกถังออก และออกใบรับมัดจำภาชนะ
                รอบสุดท้ายรวมค่าขนส่ง / ส่วนลดท้ายบิลที่เหลือให้ยอดตรงกับออเดอร์
              </p>
              {cashNotPaid ? (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">ลูกค้าเงินสด — รอรับชำระครบก่อนส่งของ</p>
              ) : canShip ? (
                <EtohForm action={shipOrderAction} submitLabel="ออกใบส่งของ + ใบกำกับภาษี" className="mt-4 space-y-3">
                  <input type="hidden" name="orderId" value={order.orderId} />
                  <div className="space-y-2">
                    {meta.lines.map((l, i) =>
                      (progress.lines[i]?.remaining ?? 0) > 0 ? (
                        <label key={i} className="flex items-center justify-between gap-3 text-sm">
                          <span>
                            {getGrade(l.grade).nameTh} · {getPack(l.pack).nameTh}
                            <span className="ml-1 text-xs text-ink/55">ค้างส่ง {progress.lines[i]!.remaining}</span>
                          </span>
                          <input
                            name={`qty_${i}`}
                            type="number"
                            min={0}
                            max={progress.lines[i]!.remaining}
                            defaultValue={progress.lines[i]!.remaining}
                            className="w-24 rounded border border-forest/20 px-2 py-1 text-right"
                          />
                        </label>
                      ) : null,
                    )}
                  </div>
                  <label className="block text-sm">
                    <span className="font-medium">ส่งถึง</span>
                    <input name="shipTo" defaultValue={[order.shipToName, order.shipToAddress, order.shipToProvince].filter(Boolean).join(" ")} className={inputCls} />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm">
                      <span className="font-medium">ทะเบียนรถ</span>
                      <input name="vehicle" className={inputCls} />
                    </label>
                    <label className="block text-sm">
                      <span className="font-medium">พนักงานขับรถ</span>
                      <input name="driver" className={inputCls} />
                    </label>
                  </div>
                </EtohForm>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-xl border border-forest/15 bg-paper p-5">
            <h2 className="font-semibold text-forest">ความเคลื่อนไหว</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {bundle.events.map((e, i) => (
                <li key={i}>
                  <p>{e.message}</p>
                  <p className="text-xs text-ink/50">{formatThaiDate(e.createdAt)} · {e.actor || "ระบบ"}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
