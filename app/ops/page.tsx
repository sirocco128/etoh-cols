import Link from "next/link";
import { actorMay, requireOpsPage } from "@/lib/ops-auth";
import { countQuoteRequests } from "@/lib/quote-repository";
import { countApprovalQueue } from "@/lib/payment-approval";
import { listPos } from "@/lib/factory-po-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function OpsIndexPage() {
  const actor = await requireOpsPage();
  const newQuotes = countQuoteRequests({ leadStatus: "new" });
  const approvals = actorMay(actor, "orders.read") ? countApprovalQueue() : 0;
  const inbound = actorMay(actor, "factory.read")
    ? listPos({ status: "all" }).filter(
        (po) =>
          po.status !== "cancelled" &&
          po.status !== "draft" &&
          po.status !== "received" &&
          po.receivedQty < po.quantity,
      ).length
    : 0;

  const cards = [
    actorMay(actor, "quotes.read")
      ? {
          href: "/ops/quotes?status=new",
          title: "คำขอใหม่",
          count: newQuotes,
          body: "ใบเสนอราคาที่ยังไม่ได้ติดต่อ",
        }
      : null,
    actorMay(actor, "orders.read")
      ? {
          href: "/ops/approvals",
          title: "รออนุมัติยอด",
          count: approvals,
          body: "สลิปที่บัญชีต้องตรวจ",
        }
      : null,
    actorMay(actor, "factory.read")
      ? {
          href: actorMay(actor, "factory.write")
            ? "/ops/inbound"
            : "/ops/factory-po",
          title: "ค้างรับของ",
          count: inbound,
          body: "ใบสั่งโรงงานที่ยังรับไม่ครบ",
        }
      : null,
  ].filter((card) => card !== null);

  return (
    <div>
      <h1 className="text-2xl font-bold text-forest">ภาพรวมงานวันนี้</h1>
      <p className="mt-1 text-sm text-ink/70">
        คิวที่ต้องเคลียร์ — เปิดรายการจากบัตรด้านล่าง
      </p>
      {cards.length ? (
        <ul className="mt-6 grid gap-4 sm:grid-cols-3">
          {cards.map((card) => (
            <li key={card.href}>
              <Link
                href={card.href}
                className="block rounded-xl border border-forest/15 bg-paper p-5 hover:border-brass/50"
              >
                <p className="text-sm text-ink/65">{card.title}</p>
                <p className="mt-2 text-3xl font-bold text-forest">{card.count}</p>
                <p className="mt-2 text-sm text-ink/70">{card.body}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-ink/70">ยังไม่มีคิวที่บัญชีนี้ดูได้</p>
      )}
    </div>
  );
}
