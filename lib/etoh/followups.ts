/**
 * Reorder follow-ups: who should have ordered again by now.
 *
 * Cycle = the reorder cycle set on the customer's terms, otherwise the
 * average gap between their last ethanol orders (needs ≥ 2 orders).
 * Next due = last order + cycle. A follow-up with a next date snoozes the
 * customer until that date; outcome "lost" removes them from the list.
 */

import { getDb } from "@/lib/database";
import { listCustomers } from "@/lib/customer-repository";
import { bangkokToday, EtohValidationError, getCustomerTerms } from "@/lib/etoh/repository";

export const FOLLOWUP_OUTCOMES = ["ordered", "quote_sent", "call_back", "not_now", "no_answer", "lost"] as const;
export type FollowupOutcome = (typeof FOLLOWUP_OUTCOMES)[number];

export const FOLLOWUP_OUTCOME_LABELS: Record<FollowupOutcome, string> = {
  ordered: "สั่งแล้ว",
  quote_sent: "ส่งใบเสนอราคาแล้ว",
  call_back: "นัดโทรกลับ",
  not_now: "ยังไม่ต้องการ",
  no_answer: "ติดต่อไม่ได้",
  lost: "ย้ายไปผู้ขายอื่น",
};

export type FollowupStatus = "overdue" | "due" | "upcoming";

export type FollowupItem = {
  customerId: number;
  company: string;
  phone: string | null;
  contactName: string | null;
  lastOrderAt: string | null;
  orderCount: number;
  cycleDays: number;
  cycleSource: "terms" | "history";
  nextDue: string;
  daysLate: number;
  status: FollowupStatus;
  lastFollowup: { outcome: FollowupOutcome; note: string | null; createdAt: string; actor: string } | null;
};

function ymd(iso: string): string {
  // Asia/Bangkok calendar date of an ISO timestamp
  return new Date(Date.parse(iso) + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function diffDays(a: string, b: string): number {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86400000);
}

/** Average gap in days between consecutive order dates (oldest → newest). */
export function inferCycleDays(orderDates: string[]): number | null {
  const days = Array.from(new Set(orderDates.map(ymd))).sort();
  if (days.length < 2) return null;
  let total = 0;
  for (let i = 1; i < days.length; i += 1) total += diffDays(days[i]!, days[i - 1]!);
  const avg = Math.round(total / (days.length - 1));
  return avg > 0 ? avg : null;
}

export function listFollowups(options: { asOf?: string; dueSoonDays?: number; includeUpcoming?: boolean } = {}): FollowupItem[] {
  const today = options.asOf ?? bangkokToday();
  const soon = options.dueSoonDays ?? 3;
  const db = getDb();
  const orderRows = db
    .prepare(`SELECT customer_id, created_at FROM etoh_orders WHERE customer_id IS NOT NULL ORDER BY created_at`)
    .all() as { customer_id: number; created_at: string }[];
  const ordersByCustomer = new Map<number, string[]>();
  for (const r of orderRows) {
    const list = ordersByCustomer.get(r.customer_id) ?? [];
    list.push(r.created_at);
    ordersByCustomer.set(r.customer_id, list);
  }
  const lastFollowupStmt = db.prepare(
    `SELECT outcome, note, next_date, actor, created_at FROM etoh_followups WHERE customer_id = ? ORDER BY id DESC LIMIT 1`,
  );

  const items: FollowupItem[] = [];
  for (const c of listCustomers({ status: "active", limit: 500 })) {
    const terms = getCustomerTerms(c.id);
    const dates = ordersByCustomer.get(c.id) ?? [];
    const lastOrderAt = dates.length ? dates[dates.length - 1]! : c.lastOrderAt;
    if (!lastOrderAt) continue;
    const inferred = inferCycleDays(dates);
    const cycleDays = terms.reorderCycleDays ?? inferred;
    if (!cycleDays) continue;

    const last = lastFollowupStmt.get(c.id) as
      | { outcome: FollowupOutcome; note: string | null; next_date: string | null; actor: string; created_at: string }
      | undefined;
    // A follow-up logged after the last order counts; older ones are stale.
    const followupCurrent = last && last.created_at > lastOrderAt;
    if (followupCurrent && last.outcome === "lost") continue;
    if (followupCurrent && last.next_date && last.next_date > today) continue;

    const nextDue = addDays(ymd(lastOrderAt), cycleDays);
    const daysLate = diffDays(today, nextDue);
    const status: FollowupStatus = daysLate > 0 ? "overdue" : daysLate >= -soon ? "due" : "upcoming";
    if (status === "upcoming" && !options.includeUpcoming) continue;

    items.push({
      customerId: c.id,
      company: c.billingName || c.company,
      phone: c.phone,
      contactName: c.contactName,
      lastOrderAt,
      orderCount: dates.length,
      cycleDays,
      cycleSource: terms.reorderCycleDays ? "terms" : "history",
      nextDue,
      daysLate,
      status,
      lastFollowup: followupCurrent
        ? { outcome: last.outcome, note: last.note, createdAt: last.created_at, actor: last.actor }
        : null,
    });
  }
  return items.sort((a, b) => b.daysLate - a.daysLate);
}

export function logFollowup(params: {
  customerId: number;
  outcome: string;
  note?: string | null;
  nextDate?: string | null;
  actor: string;
}): void {
  if (!(FOLLOWUP_OUTCOMES as readonly string[]).includes(params.outcome)) {
    throw new EtohValidationError("เลือกผลการติดตาม");
  }
  const next = (params.nextDate || "").trim() || null;
  if (next && !/^\d{4}-\d{2}-\d{2}$/.test(next)) throw new EtohValidationError("วันนัดครั้งถัดไปไม่ถูกต้อง");
  if (params.outcome === "call_back" && !next) throw new EtohValidationError("นัดโทรกลับต้องระบุวันที่");
  getDb()
    .prepare(
      `INSERT INTO etoh_followups (customer_id, outcome, note, next_date, actor, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(params.customerId, params.outcome, (params.note || "").trim().slice(0, 1000) || null, next, params.actor, new Date().toISOString());
}

export function listFollowupHistory(customerId: number, limit = 20) {
  return getDb()
    .prepare(`SELECT * FROM etoh_followups WHERE customer_id = ? ORDER BY id DESC LIMIT ?`)
    .all(customerId, limit) as {
    id: number;
    outcome: FollowupOutcome;
    note: string | null;
    next_date: string | null;
    actor: string;
    created_at: string;
  }[];
}
