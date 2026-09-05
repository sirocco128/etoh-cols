import { NextResponse } from "next/server";
import { requireOpsActor } from "@/lib/ops-auth";
import { listJournals, listLedgerAccounts } from "@/lib/ledger-repository";
import { journalsToCsv } from "@/lib/ledger-service";
import { defaultFinanceRange } from "@/lib/finance-report";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const actor = await requireOpsActor("finance.read");
  if (!actor) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const fallback = defaultFinanceRange();
  const fromDate = url.searchParams.get("from") || fallback.fromDate;
  const toDate = url.searchParams.get("to") || fallback.toDate;
  const names = new Map(listLedgerAccounts().map((a) => [a.code, a.nameTh]));
  const csv = journalsToCsv(listJournals({ fromDate, toDate, limit: 500 }), (code) => names.get(code) || code);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="journals-${fromDate}-${toDate}.csv"`,
    },
  });
}
