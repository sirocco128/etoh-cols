import Link from "next/link";
import { redirect } from "next/navigation";
import { isOpsAuthConfigured, requireOpsActor } from "@/lib/ops-auth";
import { getOrderRepository } from "@/lib/order-repository";
import {
  FULFILLMENT_LABELS,
  FULFILLMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUSES,
  type FulfillmentStatus,
  type PaymentStatus,
} from "@/lib/order-types";
import { paymentStatusLabelForOrder } from "@/lib/order-service";
import { listDistinctOpsTags } from "@/lib/ops-tag-links";
import { TagChips } from "@/components/TagChips";
import { formatThaiDateTime, formatThb } from "@/lib/th-billing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SearchParams = Promise<{
  q?: string;
  payment?: string;
  fulfillment?: string;
  tag?: string;
}>;

export default async function OpsOrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!isOpsAuthConfigured() || !(await requireOpsActor("orders.read"))) {
    redirect("/ops/login");
  }

  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const paymentRaw = (sp.payment || "all").trim();
  const fulfillmentRaw = (sp.fulfillment || "all").trim();
  const paymentStatus =
    paymentRaw === "all" ||
    (PAYMENT_STATUSES as readonly string[]).includes(paymentRaw)
      ? (paymentRaw as PaymentStatus | "all")
      : "all";
  const fulfillmentStatus =
    fulfillmentRaw === "all" ||
    (FULFILLMENT_STATUSES as readonly string[]).includes(fulfillmentRaw)
      ? (fulfillmentRaw as FulfillmentStatus | "all")
      : "all";
  const tag = (sp.tag || "").trim();

  const repo = getOrderRepository();
  const orders = repo.listOrders({
    q,
    paymentStatus,
    fulfillmentStatus,
    tag,
    limit: 100,
  });
  const total = repo.countOrders({ q, paymentStatus, fulfillmentStatus, tag });
  const knownTags = listDistinctOpsTags();

  return (
    <div>
      <h1 className="text-2xl font-bold text-forest">ออเดอร์ / รับชำระเงิน</h1>
      <p className="mt-1 text-sm text-ink/70">
        พบ {total} รายการ — วงจรมัดจำ VAT 7% และใบกำกับภาษีแบบบริษัทไทย
      </p>

      <form className="mt-6 flex flex-wrap gap-3" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="ค้นหาเลขออเดอร์ / บริษัท / อีเมล"
          className="min-w-[220px] flex-1 rounded border border-forest/20 bg-paper px-3 py-2 text-sm"
        />
        <select
          name="payment"
          defaultValue={paymentStatus}
          className="rounded border border-forest/20 bg-paper px-3 py-2 text-sm"
        >
          <option value="all">ทุกสถานะเงิน</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PAYMENT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          name="fulfillment"
          defaultValue={fulfillmentStatus}
          className="rounded border border-forest/20 bg-paper px-3 py-2 text-sm"
        >
          <option value="all">ทุกสถานะสินค้า</option>
          {FULFILLMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {FULFILLMENT_LABELS[s]}
            </option>
          ))}
        </select>
        <input
          name="tag"
          defaultValue={tag}
          list="ops-order-tags"
          placeholder="แท็กบิล"
          className="w-32 rounded border border-forest/20 bg-paper px-3 py-2 text-sm"
        />
        <datalist id="ops-order-tags">
          {knownTags.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
        <button
          type="submit"
          className="rounded bg-forest px-4 py-2 text-sm font-medium text-paper"
        >
          กรอง
        </button>
      </form>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-forest/15 text-forest">
              <th className="px-2 py-2 font-semibold">เลขออเดอร์</th>
              <th className="px-2 py-2 font-semibold">บริษัท</th>
              <th className="px-2 py-2 font-semibold">แท็ก</th>
              <th className="px-2 py-2 font-semibold">ยอดรวม</th>
              <th className="px-2 py-2 font-semibold">ชำระแล้ว</th>
              <th className="px-2 py-2 font-semibold">เงิน</th>
              <th className="px-2 py-2 font-semibold">สินค้า</th>
              <th className="px-2 py-2 font-semibold">เมื่อ</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-2 py-8 text-center text-ink/60">
                  ยังไม่มีออเดอร์ — เปิดจากใบเสนอราคาที่ส่งแล้ว
                </td>
              </tr>
            ) : (
              orders.map((row) => (
                <tr
                  key={row.orderId}
                  className="border-b border-forest/10 hover:bg-paper/80"
                >
                  <td className="px-2 py-2.5">
                    <Link
                      href={`/ops/orders/${row.orderId}`}
                      className="font-mono text-xs text-forest underline-offset-2 hover:underline"
                    >
                      {row.orderId}
                    </Link>
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="font-medium">{row.company}</div>
                    <div className="text-xs text-ink/65">{row.email}</div>
                  </td>
                  <td className="px-2 py-2.5">
                    <TagChips tags={row.tags} hrefBase="/ops/orders?tag=" />
                  </td>
                  <td className="px-2 py-2.5">{formatThb(row.totalAmount)}</td>
                  <td className="px-2 py-2.5">{formatThb(row.paidAmount)}</td>
                  <td className="px-2 py-2.5">
                    {paymentStatusLabelForOrder(row)}
                  </td>
                  <td className="px-2 py-2.5">
                    {FULFILLMENT_LABELS[row.fulfillmentStatus]}
                  </td>
                  <td className="px-2 py-2.5 text-xs text-ink/70">
                    {formatThaiDateTime(row.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
