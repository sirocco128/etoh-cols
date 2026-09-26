import Link from "next/link";
import { EtohForm } from "@/components/etoh/EtohForm";
import { EtohSubnav } from "@/components/etoh/EtohSubnav";
import { logFollowupAction } from "@/app/actions/ops-etoh";
import { actorMay, requireOpsPage } from "@/lib/ops-auth";
import { FOLLOWUP_OUTCOME_LABELS, FOLLOWUP_OUTCOMES, listFollowups } from "@/lib/etoh/followups";
import { overdueInvoices } from "@/lib/etoh/sales";
import { formatThaiDate, formatThb } from "@/lib/etoh/ops-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SearchParams = Promise<{ all?: string }>;

const STATUS_STYLE = {
  overdue: "bg-red-100 text-red-800",
  due: "bg-amber-100 text-amber-900",
  upcoming: "bg-forest-mist text-forest",
} as const;

const STATUS_LABEL = { overdue: "เลยรอบ", due: "ถึงรอบ", upcoming: "ยังไม่ถึง" } as const;

export default async function EtohFollowupsPage({ searchParams }: { searchParams: SearchParams }) {
  const actor = await requireOpsPage("customers.read");
  const sp = await searchParams;
  const showAll = sp.all === "1";
  const items = listFollowups({ includeUpcoming: showAll });
  const overdue = actorMay(actor, "orders.read") ? overdueInvoices() : [];
  const canLog = actorMay(actor, "customers.write");

  return (
    <div>
      <h1 className="text-2xl font-bold text-forest">ตามขาย — ลูกค้าที่ถึงรอบสั่งซื้อ</h1>
      <p className="mt-1 max-w-3xl text-sm text-ink/70">
        รอบสั่งซื้อจาก &quot;เงื่อนไขลูกค้า&quot; หรือคำนวณจากระยะห่างเฉลี่ยของออเดอร์ที่ผ่านมา (ต้องมี 2 ออเดอร์ขึ้นไป)
        บันทึกผลการโทรเพื่อเลื่อนนัดหรือปิดเรื่อง
      </p>
      <EtohSubnav current="followups" />

      <div className="mt-4 flex gap-2 text-sm">
        <Link href="/ops/etoh/followups" className={`rounded-full px-3 py-1 ${!showAll ? "bg-forest text-paper" : "border border-forest/20 text-forest"}`}>
          ถึงรอบ / เลยรอบ ({showAll ? "—" : items.length})
        </Link>
        <Link href="/ops/etoh/followups?all=1" className={`rounded-full px-3 py-1 ${showAll ? "bg-forest text-paper" : "border border-forest/20 text-forest"}`}>
          ทั้งหมด
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="rounded-xl border border-forest/10 p-6 text-center text-sm text-ink/60">
            ยังไม่มีลูกค้าถึงรอบ — ตั้ง &quot;รอบสั่งซื้อปกติ&quot; ที่ <Link href="/ops/etoh/customers" className="underline">เงื่อนไขลูกค้า</Link>
          </p>
        ) : (
          items.map((it) => (
            <div key={it.customerId} className="rounded-xl border border-forest/15 bg-paper p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-forest">{it.company}</p>
                  <p className="text-sm text-ink/70">
                    {it.contactName || "—"}
                    {it.phone ? (
                      <>
                        {" "}· <a href={`tel:${it.phone}`} className="text-forest underline">{it.phone}</a>
                      </>
                    ) : null}
                  </p>
                  <p className="mt-1 text-xs text-ink/60">
                    สั่งล่าสุด {formatThaiDate(it.lastOrderAt)} · รอบ {it.cycleDays} วัน ({it.cycleSource === "terms" ? "ตั้งค่า" : "จากประวัติ"}) · ควรสั่ง {formatThaiDate(it.nextDue)}
                    {it.daysLate > 0 ? ` · เลย ${it.daysLate} วัน` : ""}
                  </p>
                  {it.lastFollowup ? (
                    <p className="mt-1 text-xs text-ink/60">
                      ล่าสุด: {FOLLOWUP_OUTCOME_LABELS[it.lastFollowup.outcome]}
                      {it.lastFollowup.note ? ` — ${it.lastFollowup.note}` : ""} ({formatThaiDate(it.lastFollowup.createdAt)} · {it.lastFollowup.actor})
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs ${STATUS_STYLE[it.status]}`}>{STATUS_LABEL[it.status]}</span>
                  <Link href={`/ops/etoh?customer=${it.customerId}`} className="rounded bg-forest px-3 py-1 text-xs text-paper">ทำใบเสนอราคา</Link>
                </div>
              </div>
              {canLog ? (
                <EtohForm action={logFollowupAction} submitLabel="บันทึก" compact className="mt-3 flex flex-wrap items-end gap-2 text-xs">
                  <input type="hidden" name="customerId" value={it.customerId} />
                  <select name="outcome" className="rounded border border-forest/20 px-2 py-1" defaultValue="call_back">
                    {FOLLOWUP_OUTCOMES.map((o) => (
                      <option key={o} value={o}>{FOLLOWUP_OUTCOME_LABELS[o]}</option>
                    ))}
                  </select>
                  <label>
                    นัดครั้งถัดไป
                    <input type="date" name="nextDate" className="ml-1 rounded border border-forest/20 px-2 py-1" />
                  </label>
                  <input name="note" placeholder="หมายเหตุ" className="min-w-48 flex-1 rounded border border-forest/20 px-2 py-1" />
                </EtohForm>
              ) : null}
            </div>
          ))
        )}
      </div>

      {overdue.length ? (
        <section className="mt-10">
          <h2 className="text-lg font-bold text-red-700">ใบกำกับภาษีเกินกำหนดชำระ</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-forest/15 text-left text-forest">
                  <th className="px-2 py-2 font-semibold">ลูกค้า</th>
                  <th className="px-2 py-2 font-semibold">ใบกำกับ / ใบส่งของ</th>
                  <th className="px-2 py-2 font-semibold">ครบกำหนด</th>
                  <th className="px-2 py-2 text-right font-semibold">ค้างชำระ</th>
                </tr>
              </thead>
              <tbody>
                {overdue.map(({ shipment, order, daysOverdue }) => (
                  <tr key={shipment.id} className="border-b border-forest/10">
                    <td className="px-2 py-2">{order.billingName}</td>
                    <td className="px-2 py-2">
                      <Link href={`/ops/etoh/orders/${order.orderId}`} className="font-mono text-forest underline">{shipment.taxInvoiceId}</Link> · {shipment.dnNo}
                    </td>
                    <td className="px-2 py-2 text-red-700">{formatThaiDate(shipment.dueDate)} · เลย {daysOverdue} วัน</td>
                    <td className="px-2 py-2 text-right tabular-nums">{formatThb(order.totalAmount - order.paidAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
