/**
 * LINE push notifications to the Etoh Cols sales team (Messaging API).
 *
 * Env:
 *   LINE_CHANNEL_ACCESS_TOKEN  channel access token of the company LINE OA
 *   ETOH_SALES_LINE_TO         comma-separated LINE userId / groupId (U… / C…)
 *                              — add the OA to the sales group and use its groupId
 *   ETOH_OPS_BASE_URL          optional, e.g. https://www.etohcols.co.th (for links)
 *
 * Notifications never throw into the caller: a failed push is logged and the
 * business action (RFQ submission, cron job) still succeeds.
 */

export type LineNotifyConfig = {
  token: string;
  recipients: string[];
  baseUrl: string;
  enabled: boolean;
};

export function getLineNotifyConfig(): LineNotifyConfig {
  const token = (process.env.LINE_CHANNEL_ACCESS_TOKEN || "").trim();
  const recipients = (process.env.ETOH_SALES_LINE_TO || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[UCR][0-9a-f]{32}$/i.test(s));
  const baseUrl = (process.env.ETOH_OPS_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/$/, "");
  return { token, recipients, baseUrl, enabled: token.length > 20 && recipients.length > 0 };
}

/** LINE text messages are capped at 5,000 characters. */
export function clampLineText(text: string): string {
  return text.length <= 4900 ? text : `${text.slice(0, 4890)}…`;
}

export type LinePushResult = { sent: number; failed: number; skipped?: string };

export async function pushLineText(
  text: string,
  fetchImpl: typeof fetch = fetch,
  config: LineNotifyConfig = getLineNotifyConfig(),
): Promise<LinePushResult> {
  if (!config.enabled) return { sent: 0, failed: 0, skipped: "LINE_CHANNEL_ACCESS_TOKEN / ETOH_SALES_LINE_TO ยังไม่ได้ตั้ง" };
  let sent = 0;
  let failed = 0;
  for (const to of config.recipients) {
    try {
      const res = await fetchImpl("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${config.token}` },
        body: JSON.stringify({ to, messages: [{ type: "text", text: clampLineText(text) }] }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) sent += 1;
      else {
        failed += 1;
        console.error("[line-notify] push failed", res.status, await res.text().catch(() => ""));
      }
    } catch (error) {
      failed += 1;
      console.error("[line-notify] push error", error instanceof Error ? error.message : error);
    }
  }
  return { sent, failed };
}

export function formatRfqNotice(p: {
  inquiryId: string;
  name: string;
  company?: string;
  phone: string;
  email: string;
  summary: string;
  baseUrl?: string;
}): string {
  const lines = [
    "🟠 คำขอใบเสนอราคาเอทานอลใหม่",
    `เลขที่: ${p.inquiryId}`,
    `ลูกค้า: ${p.company ? `${p.company} · ` : ""}${p.name}`,
    `โทร: ${p.phone}`,
    `อีเมล: ${p.email}`,
    "",
    p.summary.replace(/^\[ขอใบเสนอราคาเอทานอล\]\s*\|?\s*/, "").split(" | ").join("\n"),
  ];
  if (p.baseUrl) lines.push("", `เปิดดู: ${p.baseUrl}/ops/inquiries`);
  lines.push("", "เป้าหมาย: ติดต่อกลับภายใน 2 ชั่วโมงทำการ");
  return lines.join("\n");
}

export function formatDailyDigest(p: {
  date: string;
  followups: { company: string; phone: string | null; daysLate: number; status: string }[];
  overdue: { company: string; invoice: string | null; daysOverdue: number; amount: number }[];
  monthLitres: number;
  targetLitres: number;
  openQuotes: number;
  baseUrl?: string;
}): string {
  const pct = p.targetLitres > 0 ? Math.round((p.monthLitres / p.targetLitres) * 100) : 0;
  const lines = [
    `📊 สรุปประจำวัน ${p.date}`,
    `ยอดส่งเดือนนี้ ${p.monthLitres.toLocaleString("th-TH")} / ${p.targetLitres.toLocaleString("th-TH")} ลิตร (${pct}%)`,
    `ใบเสนอราคาที่ยังเปิดอยู่ ${p.openQuotes} ใบ`,
  ];
  if (p.followups.length) {
    lines.push("", `📞 ลูกค้าถึงรอบสั่ง ${p.followups.length} ราย`);
    for (const f of p.followups.slice(0, 15)) {
      lines.push(`• ${f.company}${f.phone ? ` ${f.phone}` : ""}${f.daysLate > 0 ? ` (เลย ${f.daysLate} วัน)` : " (ถึงรอบ)"}`);
    }
  }
  if (p.overdue.length) {
    lines.push("", `⚠️ ใบกำกับเกินกำหนดชำระ ${p.overdue.length} ใบ`);
    for (const o of p.overdue.slice(0, 15)) {
      lines.push(`• ${o.company} ${o.invoice ?? ""} เลย ${o.daysOverdue} วัน ${o.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท`);
    }
  }
  if (!p.followups.length && !p.overdue.length) lines.push("", "ไม่มีลูกค้าถึงรอบหรือบิลเกินกำหนดวันนี้");
  if (p.baseUrl) lines.push("", `${p.baseUrl}/ops/etoh/dashboard`);
  return lines.join("\n");
}
