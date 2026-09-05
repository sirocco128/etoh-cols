import Link from "next/link";
import { requireOpsPage } from "@/lib/ops-auth";
import { listJournals, listLedgerAccounts } from "@/lib/ledger-repository";
import { formatThb } from "@/lib/th-billing";
import { defaultFinanceRange } from "@/lib/finance-report";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SearchParams = Promise<{ from?: string; to?: string }>;

export default async function JournalsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireOpsPage("finance.read");
  const sp = await searchParams;
  const fallback = defaultFinanceRange();
  const fromDate = /^\d{4}-\d{2}-\d{2}$/.test(sp.from || "") ? sp.from! : fallback.fromDate;
  const toDate = /^\d{4}-\d{2}-\d{2}$/.test(sp.to || "") ? sp.to! : fallback.toDate;
  const entries = listJournals({ fromDate, toDate, limit: 200 });
  const names = new Map(listLedgerAccounts().map((a) => [a.code, a.nameTh]));

  return (
    <div>
      <p className="text-sm">
        <Link href="/ops/finance" className="text-forest underline-offset-2 hover:underline">
          ← งบผู้บริหาร
        </Link>
      </p>
      <h1 className="mt-3 text-2xl font-bold text-forest">สมุดรายวัน</h1>
      <p className="mt-1 text-sm text-ink/70">
        รายการบัญชีคู่ พร้อมส่งออก CSV ไปโปรแกรมบัญชี เช่น FlowAccount / PEAK
      </p>

      <form className="mt-6 flex flex-wrap gap-3" method="get">
        <input type="date" name="from" defaultValue={fromDate} className="rounded border border-forest/20 px-3 py-2 text-sm" />
        <input type="date" name="to" defaultValue={toDate} className="rounded border border-forest/20 px-3 py-2 text-sm" />
        <button type="submit" className="rounded bg-forest px-4 py-2 text-sm text-paper">
          กรอง
        </button>
        <a
          href={`/ops/finance/export/journals?from=${fromDate}&to=${toDate}`}
          className="rounded border border-forest/30 px-4 py-2 text-sm text-forest"
        >
          ส่งออก CSV
        </a>
      </form>

      <div className="mt-6 space-y-5">
        {entries.length === 0 ? (
          <p className="text-sm text-ink/60">ยังไม่มีรายการในงวดนี้</p>
        ) : (
          entries.map((entry) => (
            <article key={entry.entryId} className="rounded-xl border border-forest/10 bg-paper p-4">
              <p className="font-mono text-xs text-ink/55">
                {entry.entryDate} · {entry.entryId}
                {entry.orderId ? ` · ${entry.orderId}` : ""}
                {entry.poId ? ` · ${entry.poId}` : ""}
              </p>
              <p className="mt-1 font-medium">{entry.memo}</p>
              <table className="mt-3 w-full text-sm">
                <tbody>
                  {entry.lines.map((line) => (
                    <tr key={`${entry.entryId}-${line.lineNo}`} className="border-t border-forest/10">
                      <td className="py-1.5">
                        <span className="font-mono text-xs">{line.accountCode}</span>{" "}
                        {names.get(line.accountCode) || ""}
                      </td>
                      <td className="py-1.5 text-right">
                        {line.debit ? formatThb(line.debit) : ""}
                      </td>
                      <td className="py-1.5 text-right">
                        {line.credit ? formatThb(line.credit) : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
