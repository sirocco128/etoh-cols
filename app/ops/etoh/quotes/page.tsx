import Link from "next/link";
import { EtohSubnav } from "@/components/etoh/EtohSubnav";
import { requireOpsPage } from "@/lib/ops-auth";
import {
  ETOH_QUOTE_STATUS_LABELS,
  ETOH_QUOTE_STATUSES,
  listQuotes,
  type EtohQuoteStatus,
} from "@/lib/etoh/repository";
import { getTier } from "@/lib/etoh/catalog";
import { formatThaiDate, formatThb } from "@/lib/etoh/ops-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SearchParams = Promise<{ status?: string }>;

export default async function EtohQuotesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireOpsPage("quotes.read");
  const sp = await searchParams;
  const status = (ETOH_QUOTE_STATUSES as readonly string[]).includes(sp.status || "")
    ? (sp.status as EtohQuoteStatus)
    : undefined;
  const quotes = listQuotes({ status }, 200);
  const totalOpen = quotes
    .filter((q) => q.status === "draft" || q.status === "sent")
    .reduce((sum, q) => sum + q.grandTotalThb, 0);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-forest">ใบเสนอราคาเอทานอล</h1>
          <p className="mt-1 text-sm text-ink/70">
            มูลค่าที่ยังเปิดอยู่ (ร่าง + ส่งแล้ว): <span className="font-semibold tabular-nums">{formatThb(totalOpen)}</span> บาท
          </p>
        </div>
        <Link href="/ops/etoh" className="rounded bg-forest px-3 py-1.5 text-sm text-paper">
          สร้างใบเสนอราคา
        </Link>
      </div>
      <EtohSubnav current="quotes" />

      <form method="get" className="mt-4 flex gap-2">
        <select name="status" defaultValue={status || ""} className="rounded border border-forest/20 px-3 py-2 text-sm">
          <option value="">ทุกสถานะ</option>
          {ETOH_QUOTE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ETOH_QUOTE_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded bg-forest px-4 py-2 text-sm text-paper">
          กรอง
        </button>
      </form>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-forest/15 text-left text-forest">
              <th className="px-2 py-2 font-semibold">เลขที่</th>
              <th className="px-2 py-2 font-semibold">ลูกค้า</th>
              <th className="px-2 py-2 font-semibold">ระดับ</th>
              <th className="px-2 py-2 text-right font-semibold">ลิตร</th>
              <th className="px-2 py-2 text-right font-semibold">ยอดรวม</th>
              <th className="px-2 py-2 font-semibold">สถานะ</th>
              <th className="px-2 py-2 font-semibold">ยืนราคาถึง</th>
            </tr>
          </thead>
          <tbody>
            {quotes.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-2 py-8 text-center text-ink/60">
                  ยังไม่มีใบเสนอราคา
                </td>
              </tr>
            ) : (
              quotes.map((q) => (
                <tr key={q.id} className="border-b border-forest/10">
                  <td className="px-2 py-2.5">
                    <Link href={`/ops/etoh/quotes/${q.id}`} className="font-mono text-forest underline-offset-2 hover:underline">
                      {q.docNo}
                    </Link>
                    <p className="text-xs text-ink/50">{formatThaiDate(q.createdAt)}</p>
                  </td>
                  <td className="px-2 py-2.5">{q.customerName}</td>
                  <td className="px-2 py-2.5">{getTier(q.appliedTier).nameTh}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{q.result.totalLitres.toLocaleString("th-TH")}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{formatThb(q.grandTotalThb)}</td>
                  <td className="px-2 py-2.5">{ETOH_QUOTE_STATUS_LABELS[q.status]}</td>
                  <td className="px-2 py-2.5 text-ink/70">{formatThaiDate(q.validUntil)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
