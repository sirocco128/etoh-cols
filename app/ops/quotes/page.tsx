import Link from "next/link";
import { requireOpsPage } from "@/lib/ops-auth";
import { OpsPager } from "@/components/OpsPager";
import {
  OPS_LIST_PAGE_SIZE,
  opsPageWindow,
  parseOpsPage,
} from "@/lib/ops-pagination";
import {
  countQuoteRequests,
  listQuoteRequests,
} from "@/lib/quote-repository";
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  type LeadStatus,
} from "@/lib/quote-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SearchParams = Promise<{
  q?: string;
  status?: string;
  page?: string;
}>;

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Bangkok",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default async function OpsQuotesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireOpsPage("quotes.read");

  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const statusRaw = (sp.status || "all").trim();
  const leadStatus =
    statusRaw === "all" ||
    (LEAD_STATUSES as readonly string[]).includes(statusRaw)
      ? (statusRaw as LeadStatus | "all")
      : "all";

  const total = countQuoteRequests({ q, leadStatus });
  const pageWindow = opsPageWindow(total, parseOpsPage(sp.page), OPS_LIST_PAGE_SIZE);
  const quotes = listQuoteRequests({
    q,
    leadStatus,
    limit: pageWindow.pageSize,
    offset: pageWindow.offset,
  });
  const filterParams = { q, status: leadStatus === "all" ? undefined : leadStatus };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-forest">ใบเสนอราคา</h1>
          <p className="mt-1 text-sm text-ink/70">พบ {total} รายการ</p>
        </div>
      </div>

      <form className="mt-6 flex flex-wrap gap-3" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="ค้นหา บริษัท / อีเมล / เลขคำขอ"
          className="min-w-[220px] flex-1 rounded border border-forest/20 bg-paper px-3 py-2 text-sm"
        />
        <select
          name="status"
          defaultValue={leadStatus}
          className="rounded border border-forest/20 bg-paper px-3 py-2 text-sm"
        >
          <option value="all">ทุกสถานะ</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {LEAD_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded bg-forest px-4 py-2 text-sm font-medium text-paper"
        >
          กรอง
        </button>
      </form>

      {quotes.length === 0 ? (
        <p className="mt-6 rounded-xl border border-forest/10 px-4 py-8 text-center text-sm text-ink/60">
          ยังไม่มีคำขอ —{" "}
          <Link href="/contact" className="text-forest underline-offset-2 hover:underline">
            ส่งแบบฟอร์มติดต่อ
          </Link>
        </p>
      ) : (
        <>
          <ul className="mt-6 space-y-3 md:hidden">
            {quotes.map((row) => (
              <li key={row.requestId} className="rounded-xl border border-forest/10 p-4">
                <Link
                  href={`/ops/quotes/${row.requestId}`}
                  className="font-mono text-xs text-forest underline-offset-2 hover:underline"
                >
                  {row.requestId}
                </Link>
                <p className="mt-1 font-medium">{row.company}</p>
                <p className="text-xs text-ink/65">
                  {row.name} · {row.email}
                </p>
                <p className="mt-2 text-sm text-ink/75">
                  {LEAD_STATUS_LABELS[row.leadStatus] || row.leadStatus} · จำนวน {row.quantity}
                </p>
                <p className="mt-1 text-xs text-ink/55">{formatWhen(row.createdAt)}</p>
              </li>
            ))}
          </ul>

          <div className="mt-6 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-forest/15 text-forest">
                  <th className="px-2 py-2 font-semibold">เลขคำขอ</th>
                  <th className="px-2 py-2 font-semibold">บริษัท / ผู้ติดต่อ</th>
                  <th className="px-2 py-2 font-semibold">จำนวน</th>
                  <th className="px-2 py-2 font-semibold">สถานะ</th>
                  <th className="px-2 py-2 font-semibold">Webhook</th>
                  <th className="px-2 py-2 font-semibold">เมื่อ</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((row) => (
                  <tr
                    key={row.requestId}
                    className="border-b border-forest/10 hover:bg-paper/80"
                  >
                    <td className="px-2 py-2.5">
                      <Link
                        href={`/ops/quotes/${row.requestId}`}
                        className="font-mono text-xs text-forest underline-offset-2 hover:underline"
                      >
                        {row.requestId}
                      </Link>
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="font-medium">{row.company}</div>
                      <div className="text-xs text-ink/65">
                        {row.name} · {row.email}
                      </div>
                    </td>
                    <td className="px-2 py-2.5">{row.quantity}</td>
                    <td className="px-2 py-2.5">
                      {LEAD_STATUS_LABELS[row.leadStatus] || row.leadStatus}
                    </td>
                    <td className="px-2 py-2.5 font-mono text-xs">
                      {row.webhookStatus}
                    </td>
                    <td className="px-2 py-2.5 text-xs text-ink/70">
                      {formatWhen(row.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <OpsPager pathname="/ops/quotes" params={filterParams} window={pageWindow} />
        </>
      )}
    </div>
  );
}
