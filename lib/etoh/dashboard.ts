/**
 * Etoh Cols sales dashboard: delivered volume vs the monthly container target,
 * pipeline, receivables and stock cover. "Delivered volume" counts litres on
 * delivery notes (the tax point), not quotes.
 */

import { getDb } from "@/lib/database";
import { roundSatang } from "@/lib/th-billing";
import { ETOH_GRADES, type EtohGradeCode } from "@/lib/etoh/catalog";
import { bangkokToday, getSetting, litresPerContainer } from "@/lib/etoh/repository";
import { availableLitresByGrade, overdueInvoices } from "@/lib/etoh/sales";
import { listFollowups } from "@/lib/etoh/followups";

export const DEFAULT_TARGET_CONTAINERS = 12;

export type MonthKey = string; // YYYY-MM (Bangkok)

/** Bangkok month window as UTC ISO bounds. */
export function monthBounds(month: MonthKey): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const from = new Date(Date.UTC(y, m - 1, 1) - 7 * 3600 * 1000).toISOString();
  const to = new Date(Date.UTC(y, m, 1) - 7 * 3600 * 1000).toISOString();
  return { from, to };
}

export function shiftMonth(month: MonthKey, delta: number): MonthKey {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export function targetSettings(): { containers: number; litresPerContainer: number; litres: number } {
  const containers = Number(getSetting("monthly_target_containers", String(DEFAULT_TARGET_CONTAINERS))) || DEFAULT_TARGET_CONTAINERS;
  const perContainer = litresPerContainer();
  return { containers, litresPerContainer: perContainer, litres: containers * perContainer };
}

function deliveredIn(from: string, to: string): { litres: number; subtotal: number; shipments: number } {
  const row = getDb()
    .prepare(
      `SELECT COALESCE(SUM(i.litres), 0) AS litres,
              (SELECT COALESCE(SUM(s2.subtotal_ex_vat), 0) FROM etoh_shipments s2 WHERE s2.shipped_at >= ? AND s2.shipped_at < ?) AS subtotal,
              (SELECT COUNT(*) FROM etoh_shipments s3 WHERE s3.shipped_at >= ? AND s3.shipped_at < ?) AS shipments
       FROM etoh_shipment_items i JOIN etoh_shipments s ON s.id = i.shipment_id
       WHERE s.shipped_at >= ? AND s.shipped_at < ?`,
    )
    .get(from, to, from, to, from, to) as { litres: number; subtotal: number; shipments: number };
  return { litres: roundSatang(Number(row.litres)), subtotal: roundSatang(Number(row.subtotal)), shipments: Number(row.shipments) };
}

export type EtohDashboard = {
  month: MonthKey;
  today: string;
  target: { containers: number; litresPerContainer: number; litres: number };
  delivered: { litres: number; containers: number; subtotal: number; shipments: number; pct: number };
  /** Where the month should be by today if volume were spread evenly. */
  paceLitres: number;
  projectedLitres: number;
  history: { month: MonthKey; litres: number; containers: number }[];
  quotes: { openCount: number; openValue: number; createdThisMonth: number; acceptedThisMonth: number; winRate90d: number | null };
  rfqThisMonth: number;
  receivables: { outstanding: number; overdueCount: number; overdueAmount: number };
  followupsDue: number;
  stock: { grade: EtohGradeCode; name: string; litres: number; monthsCover: number | null }[];
  topCustomers: { customerId: number; name: string; litres: number; subtotal: number }[];
};

export function buildDashboard(month?: MonthKey): EtohDashboard {
  const db = getDb();
  const today = bangkokToday();
  const current = month ?? today.slice(0, 7);
  const { from, to } = monthBounds(current);
  const target = targetSettings();
  const perContainer = target.litresPerContainer;

  const delivered = deliveredIn(from, to);
  const [y, m] = current.split("-").map(Number) as [number, number];
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const isCurrent = current === today.slice(0, 7);
  const dayOfMonth = isCurrent ? Number(today.slice(8, 10)) : daysInMonth;
  const paceLitres = Math.round((target.litres * dayOfMonth) / daysInMonth);
  const projectedLitres = dayOfMonth > 0 ? Math.round((delivered.litres / dayOfMonth) * daysInMonth) : 0;

  const history = Array.from({ length: 6 }, (_, i) => shiftMonth(current, i - 5)).map((mk) => {
    const b = monthBounds(mk);
    const d = deliveredIn(b.from, b.to);
    return { month: mk, litres: d.litres, containers: Math.round((d.litres / perContainer) * 10) / 10 };
  });

  const open = db
    .prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(grand_total_thb), 0) AS v FROM etoh_quotes WHERE status IN ('draft', 'sent')`)
    .get() as { n: number; v: number };
  const created = db
    .prepare(`SELECT COUNT(*) AS n FROM etoh_quotes WHERE created_at >= ? AND created_at < ?`)
    .get(from, to) as { n: number };
  const accepted = db
    .prepare(`SELECT COUNT(*) AS n FROM etoh_quotes WHERE status = 'accepted' AND updated_at >= ? AND updated_at < ?`)
    .get(from, to) as { n: number };
  const since90 = new Date(Date.now() - 90 * 86400000).toISOString();
  const decided = db
    .prepare(
      `SELECT SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) AS won, COUNT(*) AS n
       FROM etoh_quotes WHERE status IN ('accepted', 'rejected', 'expired') AND updated_at >= ?`,
    )
    .get(since90) as { won: number | null; n: number };

  const rfq = db
    .prepare(
      `SELECT COUNT(*) AS n FROM contact_inquiries WHERE message LIKE '[ขอใบเสนอราคาเอทานอล]%' AND submitted_at >= ? AND submitted_at < ?`,
    )
    .get(from, to) as { n: number } | undefined;

  const ar = db
    .prepare(
      `SELECT COALESCE(SUM(inv - paid), 0) AS outstanding FROM (
         SELECT o.order_id, o.paid_amount AS paid,
                (SELECT COALESCE(SUM(s.grand_total), 0) FROM etoh_shipments s WHERE s.order_id = o.order_id) AS inv
         FROM orders o JOIN etoh_orders e ON e.order_id = o.order_id
         WHERE o.fulfillment_status <> 'cancelled'
       ) WHERE inv > paid`,
    )
    .get() as { outstanding: number };
  const overdue = overdueInvoices(today);

  // Stock cover: available litres ÷ average monthly delivered per grade (last 3 months incl. current).
  const available = availableLitresByGrade();
  const byGrade = db
    .prepare(
      `SELECT l.grade_code AS grade, COALESCE(SUM(sl.litres), 0) AS litres
       FROM etoh_shipment_lots sl JOIN etoh_shipments s ON s.id = sl.shipment_id JOIN etoh_lots l ON l.id = sl.lot_id
       WHERE s.shipped_at >= ? GROUP BY l.grade_code`,
    )
    .all(monthBounds(shiftMonth(current, -2)).from) as { grade: EtohGradeCode; litres: number }[];
  const stock = ETOH_GRADES.map((g) => {
    const litres = available[g.code] ?? 0;
    const shipped3m = byGrade.find((r) => r.grade === g.code)?.litres ?? 0;
    const monthly = shipped3m / 3;
    return {
      grade: g.code,
      name: g.nameTh,
      litres,
      monthsCover: monthly > 0 ? Math.round((litres / monthly) * 10) / 10 : null,
    };
  });

  const top = db
    .prepare(
      `SELECT s.customer_id AS customerId, COALESCE(c.billing_name, c.company, 'ลูกค้า') AS name,
              SUM(i.litres) AS litres,
              (SELECT COALESCE(SUM(s2.subtotal_ex_vat), 0) FROM etoh_shipments s2
                WHERE s2.customer_id = s.customer_id AND s2.shipped_at >= ? AND s2.shipped_at < ?) AS subtotal
       FROM etoh_shipment_items i JOIN etoh_shipments s ON s.id = i.shipment_id
       LEFT JOIN customers c ON c.id = s.customer_id
       WHERE s.shipped_at >= ? AND s.shipped_at < ? AND s.customer_id IS NOT NULL
       GROUP BY s.customer_id ORDER BY litres DESC LIMIT 5`,
    )
    .all(from, to, from, to) as { customerId: number; name: string; litres: number; subtotal: number }[];

  return {
    month: current,
    today,
    target,
    delivered: {
      ...delivered,
      containers: Math.round((delivered.litres / perContainer) * 10) / 10,
      pct: target.litres > 0 ? Math.round((delivered.litres / target.litres) * 1000) / 10 : 0,
    },
    paceLitres,
    projectedLitres,
    history,
    quotes: {
      openCount: Number(open.n),
      openValue: roundSatang(Number(open.v)),
      createdThisMonth: Number(created.n),
      acceptedThisMonth: Number(accepted.n),
      winRate90d: decided.n > 0 ? Math.round(((decided.won ?? 0) / decided.n) * 100) : null,
    },
    rfqThisMonth: Number(rfq?.n ?? 0),
    receivables: {
      outstanding: roundSatang(Number(ar.outstanding)),
      overdueCount: overdue.length,
      overdueAmount: roundSatang(overdue.reduce((s, o) => s + Math.max(0, o.shipment.grandTotal), 0)),
    },
    followupsDue: listFollowups().length,
    stock,
    topCustomers: top.map((t) => ({ ...t, litres: roundSatang(Number(t.litres)), subtotal: roundSatang(Number(t.subtotal)) })),
  };
}
