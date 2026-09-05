import { NextResponse } from "next/server";
import { requireOpsActor } from "@/lib/ops-auth";
import { buildExecutivePnl, defaultFinanceRange, pnlToCsv } from "@/lib/finance-report";

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
  const csv = pnlToCsv(buildExecutivePnl({ fromDate, toDate }));
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="pnl-${fromDate}-${toDate}.csv"`,
    },
  });
}
