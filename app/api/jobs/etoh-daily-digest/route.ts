import { NextResponse } from "next/server";
import { timingSafeEqualString } from "@/lib/security";
import { buildDashboard } from "@/lib/etoh/dashboard";
import { listFollowups } from "@/lib/etoh/followups";
import { formatDailyDigest, getLineNotifyConfig, pushLineText } from "@/lib/etoh/line-notify";
import { overdueInvoices } from "@/lib/etoh/sales";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Cron (e.g. 08:30 Asia/Bangkok): POST with `Authorization: Bearer $CRON_SECRET`. */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET || "";
  if (!secret || secret.length < 32) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!timingSafeEqualString(token, secret)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const dash = buildDashboard();
  const text = formatDailyDigest({
    date: dash.today,
    followups: listFollowups().map((f) => ({ company: f.company, phone: f.phone, daysLate: f.daysLate, status: f.status })),
    overdue: overdueInvoices(dash.today).map((o) => ({
      company: o.order.billingName,
      invoice: o.shipment.taxInvoiceId,
      daysOverdue: o.daysOverdue,
      amount: o.shipment.grandTotal,
    })),
    monthLitres: dash.delivered.litres,
    targetLitres: dash.target.litres,
    openQuotes: dash.quotes.openCount,
    baseUrl: getLineNotifyConfig().baseUrl,
  });
  const result = await pushLineText(text);
  return NextResponse.json({ ...result, preview: text });
}
