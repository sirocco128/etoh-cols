/**
 * Etoh Cols sales flow on top of the shared order / billing / ledger engine:
 *
 *   accepted EQ quote ──► order (orders table, ORD-…) ──► delivery note (DN-…)
 *                                                          ├─ FIFO lot allocation (released lots only)
 *                                                          ├─ ใบกำกับภาษี issued at delivery (tax point)
 *                                                          ├─ revenue + VAT (AR for credit customers)
 *                                                          └─ returnable drums / IBC out to customer
 *
 * An order can ship in several delivery notes; each one carries its own
 * ใบกำกับภาษี for the goods delivered and the final one reconciles the order
 * total (delivery fee, header discount, rounding).
 *
 * Cash customers (credit term 0) must pay before shipping. Credit customers
 * ship first; one PromptPay voucher tracks invoiced-but-unpaid goods and each
 * delivery note's due date is shipped date + credit term.
 *
 * Refundable container deposits stay outside the VAT base: each delivery note
 * with drums / IBC opens a deposit charge (DP-…), a container return opens a
 * refund (RF-…) — after cancelling any charge that was never collected — and
 * settling either posts to account 2150 (container deposits held).
 */

import { randomBytes } from "node:crypto";
import { getDb } from "@/lib/database";
import { withTransaction } from "@/lib/db-transaction";
import { bangkokDateYmd } from "@/lib/bangkok-date";
import { getCustomerById, recomputeCustomerRollups } from "@/lib/customer-repository";
import { postRevenueRecognition, upsertJournal } from "@/lib/ledger-service";
import { ACCOUNT_CODES } from "@/lib/ledger-types";
import { getOrderRepository } from "@/lib/order-repository";
import { issueOrderDocument, openOrderPayment } from "@/lib/order-service";
import type { OrderRecord } from "@/lib/order-types";
import { normalizeThaiTaxId, roundSatang } from "@/lib/th-billing";
import { getGrade, getPack, type EtohGradeCode, type EtohPackCode } from "@/lib/etoh/catalog";
import {
  bangkokToday,
  buddhistPeriod,
  drumBalances,
  EtohValidationError,
  getCustomerTerms,
  getQuote,
  recordDrumMovement,
  type EtohSavedQuote,
} from "@/lib/etoh/repository";

function nowIso(): string {
  return new Date().toISOString();
}

function prefixedId(prefix: string, now = new Date()): string {
  return `${prefix}-${bangkokDateYmd(now)}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function enqueue(entity: string, entityId: string, event: string, data: unknown): void {
  getDb()
    .prepare(
      `INSERT INTO etoh_sync_outbox (entity, entity_id, event, payload_json, created_at) VALUES (?, ?, ?, ?, ?)`,
    )
    .run(entity, entityId, event, JSON.stringify({ sourceApp: "etoh-cols", entity, entityId, event, data }), nowIso());
}

function tx<T>(fn: () => T): T {
  return withTransaction(fn);
}

/* ------------------------------------------------------------ credit */

export type EtohCreditPosition = {
  creditLimitThb: number;
  creditTermDays: number;
  outstandingThb: number;
  availableThb: number;
};

/** Unpaid balance of this customer's ethanol orders (goods + VAT). */
export function creditPosition(customerId: number): EtohCreditPosition {
  const terms = getCustomerTerms(customerId);
  const row = getDb()
    .prepare(
      `SELECT COALESCE(SUM(o.total_amount - o.paid_amount), 0) AS outstanding
       FROM orders o JOIN etoh_orders e ON e.order_id = o.order_id
       WHERE e.customer_id = ? AND o.fulfillment_status <> 'cancelled' AND o.payment_status <> 'paid'`,
    )
    .get(customerId) as { outstanding: number };
  const outstanding = roundSatang(Number(row.outstanding) || 0);
  return {
    creditLimitThb: terms.creditLimitThb,
    creditTermDays: terms.creditTermDays,
    outstandingThb: outstanding,
    availableThb: roundSatang(Math.max(0, terms.creditLimitThb - outstanding)),
  };
}

/* ------------------------------------------------------- quote → order */

export type EtohOrderLine = {
  sku: string;
  grade: EtohGradeCode;
  pack: EtohPackCode;
  qty: number;
  litres: number;
  unitPriceThb: number;
  lineTotalThb: number;
  depositPerUnitThb: number;
};

export type ConvertQuoteInput = {
  quoteId: number;
  email?: string;
  phone?: string;
  contactName?: string;
  billingAddress?: string;
  shipToAddress?: string;
  shipToProvince?: string;
  /** Allow exceeding the credit limit (admin / sales admin only, audited by caller). */
  overrideCreditLimit?: boolean;
  actor: string;
};

export function orderLinesFromQuote(quote: EtohSavedQuote): EtohOrderLine[] {
  return quote.result.lines.map((l) => ({
    sku: l.sku,
    grade: l.grade,
    pack: l.pack,
    qty: l.qty,
    litres: l.litres,
    unitPriceThb: l.unitPriceThb,
    lineTotalThb: l.lineTotalThb,
    depositPerUnitThb: l.depositPerUnitThb,
  }));
}

export function summarizeLines(lines: EtohOrderLine[]): string {
  return lines
    .map((l) => `${getGrade(l.grade).nameTh} ${getPack(l.pack).nameTh} × ${l.qty}`)
    .join(", ")
    .slice(0, 480);
}

export function convertQuoteToOrder(input: ConvertQuoteInput): OrderRecord {
  const quote = getQuote(input.quoteId);
  if (!quote) throw new EtohValidationError("ไม่พบใบเสนอราคา");
  if (quote.status !== "accepted") throw new EtohValidationError("ต้องเปลี่ยนสถานะเป็น \"ลูกค้ายืนยัน\" ก่อนเปิดออเดอร์");
  const repo = getOrderRepository();
  const already = getDb()
    .prepare(`SELECT order_id FROM etoh_orders WHERE quote_id = ?`)
    .get(quote.id) as { order_id: string } | undefined;
  if (already) {
    const existing = repo.getOrderByOrderId(already.order_id);
    if (existing) return existing;
  }
  if (!quote.customerId) throw new EtohValidationError("ใบเสนอราคานี้ไม่ได้ผูกลูกค้าใน CRM — สร้าง/ผูกลูกค้าก่อนเปิดออเดอร์");
  const customer = getCustomerById(quote.customerId);
  if (!customer) throw new EtohValidationError("ไม่พบลูกค้าใน CRM");

  const email = (input.email || customer.email || "").trim();
  const phone = (input.phone || customer.phone || "").trim();
  if (!email || !phone) throw new EtohValidationError("ลูกค้าต้องมีอีเมลและเบอร์โทรก่อนเปิดออเดอร์");

  const terms = getCustomerTerms(customer.id);
  const r = quote.result;
  const subtotal = roundSatang(r.vatBaseThb);
  const vat = roundSatang(r.vatThb);
  const total = roundSatang(subtotal + vat);
  if (!(total > 0)) throw new EtohValidationError("ยอดออเดอร์ต้องมากกว่า 0");

  const credit = terms.creditTermDays > 0;
  if (credit && !input.overrideCreditLimit) {
    const pos = creditPosition(customer.id);
    if (terms.creditLimitThb > 0 && total > pos.availableThb) {
      throw new EtohValidationError(
        `เกินวงเงินเครดิต (คงเหลือ ${pos.availableThb.toLocaleString("th-TH")} บาท, ออเดอร์ ${total.toLocaleString("th-TH")} บาท)`,
      );
    }
  }

  const lines = orderLinesFromQuote(quote);
  const qty = lines.reduce((s, l) => s + l.qty, 0);
  const summary = summarizeLines(lines);
  const now = nowIso();

  return tx(() => {
    const order = repo.insertOrder({
      orderId: prefixedId("ORD"),
      quoteRequestId: null,
      customerId: customer.id,
      company: customer.company,
      contactName: (input.contactName || customer.contactName || quote.contact || customer.company).trim(),
      email,
      phone,
      billingName: (customer.billingName || quote.customerName).trim(),
      billingTaxId: normalizeThaiTaxId(customer.taxId || quote.customerTaxId),
      billingAddress: input.billingAddress?.trim() || customer.billingAddress || null,
      billingBranch: customer.billingBranch || "สำนักงานใหญ่",
      shipToName: customer.contactName || customer.company,
      shipToPhone: phone,
      shipToAddress: input.shipToAddress?.trim() || null,
      shipToProvince: input.shipToProvince?.trim() || customer.defaultShipProvince || null,
      productSummary: summary,
      quantity: qty,
      currency: "THB",
      vatRate: 7,
      vatMode: "exclusive",
      subtotalExVat: subtotal,
      vatAmount: vat,
      totalAmount: total,
      depositMode: "full",
      depositPercent: 100,
      depositAmount: credit ? 0 : total,
      remainingAmount: total,
      paidAmount: 0,
      paymentStatus: credit ? "balance_due" : "deposit_due",
      fulfillmentStatus: "reserved",
      accessToken: randomBytes(18).toString("hex"),
      notes: [
        `จากใบเสนอราคา ${quote.docNo}`,
        credit ? `เครดิต ${terms.creditTermDays} วัน (ออกใบกำกับภาษีเมื่อส่งของ)` : "ชำระก่อนส่งของ",
        r.depositThb > 0 ? `มัดจำภาชนะ ${r.depositThb.toFixed(2)} บาท (นอกฐาน VAT, ติดตามในทะเบียนถัง)` : "",
      ]
        .filter(Boolean)
        .join(" · "),
      createdAt: now,
    });

    if (!credit) {
      issueOrderDocument({
        type: "deposit_invoice",
        order,
        paymentId: null,
        subtotalExVat: subtotal,
        vatAmount: vat,
        grandTotal: total,
        lineDescription: `แจ้งหนี้ค่าสินค้าเต็มจำนวน (ชำระก่อนส่งของ) — ${summary}`,
        now,
      });
      openOrderPayment(order, "full", total);
    }

    repo.insertEvent({
      orderId: order.orderId,
      eventType: "created",
      message: credit
        ? `เปิดออเดอร์จาก ${quote.docNo} · เครดิต ${terms.creditTermDays} วัน · ยอด ${total.toFixed(2)} บาท`
        : `เปิดออเดอร์จาก ${quote.docNo} · แจ้งหนี้เต็มจำนวน ${total.toFixed(2)} บาท (ชำระก่อนส่ง)`,
      actor: input.actor,
      createdAt: now,
    });

    getDb()
      .prepare(
        `INSERT INTO etoh_orders (order_id, quote_id, customer_id, credit_term_days, lines_json, deposit_thb, total_litres, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(order.orderId, quote.id, customer.id, terms.creditTermDays, JSON.stringify(lines), r.depositThb, r.totalLitres, input.actor, now);
    getDb().prepare(`UPDATE etoh_quotes SET order_id = ?, updated_at = ? WHERE id = ?`).run(order.orderId, now, quote.id);
    enqueue("order", order.orderId, "order.created", {
      quoteDocNo: quote.docNo,
      customerId: customer.id,
      totalLitres: r.totalLitres,
      subtotalExVat: subtotal,
      vatAmount: vat,
      totalAmount: total,
      creditTermDays: terms.creditTermDays,
      lines: lines.map((l) => ({ sku: l.sku, qty: l.qty, litres: l.litres, unitPriceThb: l.unitPriceThb })),
    });
    recomputeCustomerRollups(customer.id);
    return repo.getOrderByOrderId(order.orderId) ?? order;
  });
}

export type EtohOrderMeta = {
  orderId: string;
  quoteId: number;
  customerId: number | null;
  creditTermDays: number;
  lines: EtohOrderLine[];
  depositThb: number;
  totalLitres: number;
  createdAt: string;
};

export function getEtohOrder(orderId: string): EtohOrderMeta | null {
  const row = getDb().prepare(`SELECT * FROM etoh_orders WHERE order_id = ?`).get(orderId) as
    | {
        order_id: string;
        quote_id: number;
        customer_id: number | null;
        credit_term_days: number;
        lines_json: string;
        deposit_thb: number;
        total_litres: number;
        created_at: string;
      }
    | undefined;
  if (!row) return null;
  return {
    orderId: row.order_id,
    quoteId: row.quote_id,
    customerId: row.customer_id,
    creditTermDays: row.credit_term_days,
    lines: JSON.parse(row.lines_json) as EtohOrderLine[],
    depositThb: Number(row.deposit_thb),
    totalLitres: Number(row.total_litres),
    createdAt: row.created_at,
  };
}

export type EtohOrderListItem = {
  order: OrderRecord;
  meta: EtohOrderMeta;
  shipments: EtohShipment[];
  progress: EtohOrderProgress;
};

export function listEtohOrders(limit = 200): EtohOrderListItem[] {
  const rows = getDb()
    .prepare(`SELECT order_id FROM etoh_orders ORDER BY created_at DESC LIMIT ?`)
    .all(limit) as { order_id: string }[];
  const repo = getOrderRepository();
  const out: EtohOrderListItem[] = [];
  for (const r of rows) {
    const order = repo.getOrderByOrderId(r.order_id);
    const meta = getEtohOrder(r.order_id);
    if (order && meta) {
      const shipments = listShipmentsByOrder(r.order_id);
      out.push({ order, meta, shipments, progress: orderProgress(meta, shipments) });
    }
  }
  return out;
}

/* ---------------------------------------------------- lot allocation */

export type LotAllocation = { lotId: number; lotNo: string; litres: number; coaPurityPct: number | null };

/** Litres still available in a lot (received minus already shipped). */
export function lotRemainingLitres(lotId: number): number {
  const row = getDb()
    .prepare(
      `SELECT l.received_litres - COALESCE((SELECT SUM(s.litres) FROM etoh_shipment_lots s WHERE s.lot_id = l.id), 0) AS remaining
       FROM etoh_lots l WHERE l.id = ?`,
    )
    .get(lotId) as { remaining: number } | undefined;
  return roundSatang(Number(row?.remaining ?? 0));
}

export function availableLitresByGrade(): Partial<Record<EtohGradeCode, number>> {
  const today = bangkokToday();
  const rows = getDb()
    .prepare(
      `SELECT l.grade_code AS grade,
              SUM(l.received_litres - COALESCE((SELECT SUM(s.litres) FROM etoh_shipment_lots s WHERE s.lot_id = l.id), 0)) AS remaining
       FROM etoh_lots l
       WHERE l.status = 'released' AND (l.expiry_date IS NULL OR l.expiry_date >= ?)
       GROUP BY l.grade_code`,
    )
    .all(today) as { grade: EtohGradeCode; remaining: number }[];
  const out: Partial<Record<EtohGradeCode, number>> = {};
  for (const r of rows) out[r.grade] = roundSatang(Number(r.remaining) || 0);
  return out;
}

/**
 * FIFO by expiry then arrival: only released, unexpired lots. FOOD lots are
 * released only with an อย. reference, so the release gate covers FDA paperwork.
 */
export function planLotAllocation(grade: EtohGradeCode, litres: number): LotAllocation[] {
  const today = bangkokToday();
  const lots = getDb()
    .prepare(
      `SELECT id, lot_no, coa_purity_pct, received_litres,
              received_litres - COALESCE((SELECT SUM(s.litres) FROM etoh_shipment_lots s WHERE s.lot_id = etoh_lots.id), 0) AS remaining
       FROM etoh_lots
       WHERE grade_code = ? AND status = 'released' AND (expiry_date IS NULL OR expiry_date >= ?)
       ORDER BY COALESCE(expiry_date, '9999-12-31'), COALESCE(arrival_date, created_at), id`,
    )
    .all(grade, today) as { id: number; lot_no: string; coa_purity_pct: number | null; remaining: number }[];
  let need = roundSatang(litres);
  const plan: LotAllocation[] = [];
  for (const lot of lots) {
    if (need <= 0) break;
    const available = roundSatang(Number(lot.remaining));
    if (available <= 0) continue;
    const take = Math.min(available, need);
    plan.push({ lotId: lot.id, lotNo: lot.lot_no, litres: roundSatang(take), coaPurityPct: lot.coa_purity_pct });
    need = roundSatang(need - take);
  }
  if (need > 0) {
    throw new EtohValidationError(
      `สต็อก ${getGrade(grade).nameTh} ที่ปล่อยขายได้ไม่พอ (ขาด ${need.toLocaleString("th-TH")} ลิตร)`,
    );
  }
  return plan;
}

/* ---------------------------------------------------------- shipments */

export type EtohShipmentItem = {
  lineIndex: number;
  qty: number;
  litres: number;
  lineTotalThb: number;
  depositThb: number;
};

export type EtohShipmentLot = {
  lineIndex: number;
  sku: string;
  grade: EtohGradeCode;
  pack: EtohPackCode;
  lotId: number;
  lotNo: string;
  litres: number;
  coaPurityPct: number | null;
};

export type EtohShipment = {
  id: number;
  dnNo: string;
  orderId: string;
  customerId: number | null;
  status: "shipped" | "delivered";
  shipTo: string | null;
  vehicle: string | null;
  driver: string | null;
  taxInvoiceId: string | null;
  subtotalExVat: number;
  vatAmount: number;
  grandTotal: number;
  depositThb: number;
  dueDate: string | null;
  shippedAt: string;
  deliveredAt: string | null;
  receivedBy: string | null;
  createdBy: string;
  items: EtohShipmentItem[];
  lots: EtohShipmentLot[];
};

type ShipmentRow = {
  id: number;
  dn_no: string;
  order_id: string;
  customer_id: number | null;
  status: "shipped" | "delivered";
  ship_to: string | null;
  vehicle: string | null;
  driver: string | null;
  tax_invoice_id: string | null;
  subtotal_ex_vat: number;
  vat_amount: number;
  grand_total: number;
  deposit_thb: number;
  due_date: string | null;
  shipped_at: string;
  delivered_at: string | null;
  received_by: string | null;
  created_by: string;
};

function mapShipment(row: ShipmentRow): EtohShipment {
  const db = getDb();
  const items = db
    .prepare(`SELECT * FROM etoh_shipment_items WHERE shipment_id = ? ORDER BY line_index`)
    .all(row.id) as { line_index: number; qty: number; litres: number; line_total_thb: number; deposit_thb: number }[];
  const lots = db
    .prepare(
      `SELECT s.*, l.lot_no, l.coa_purity_pct FROM etoh_shipment_lots s JOIN etoh_lots l ON l.id = s.lot_id
       WHERE s.shipment_id = ? ORDER BY s.line_index, s.id`,
    )
    .all(row.id) as {
    line_index: number;
    sku: string;
    grade_code: EtohGradeCode;
    pack_code: EtohPackCode;
    lot_id: number;
    lot_no: string;
    litres: number;
    coa_purity_pct: number | null;
  }[];
  return {
    id: row.id,
    dnNo: row.dn_no,
    orderId: row.order_id,
    customerId: row.customer_id,
    status: row.status,
    shipTo: row.ship_to,
    vehicle: row.vehicle,
    driver: row.driver,
    taxInvoiceId: row.tax_invoice_id,
    subtotalExVat: Number(row.subtotal_ex_vat),
    vatAmount: Number(row.vat_amount),
    grandTotal: Number(row.grand_total),
    depositThb: Number(row.deposit_thb),
    dueDate: row.due_date,
    shippedAt: row.shipped_at,
    deliveredAt: row.delivered_at,
    receivedBy: row.received_by,
    createdBy: row.created_by,
    items: items.map((i) => ({
      lineIndex: i.line_index,
      qty: i.qty,
      litres: Number(i.litres),
      lineTotalThb: Number(i.line_total_thb),
      depositThb: Number(i.deposit_thb),
    })),
    lots: lots.map((l) => ({
      lineIndex: l.line_index,
      sku: l.sku,
      grade: l.grade_code,
      pack: l.pack_code,
      lotId: l.lot_id,
      lotNo: l.lot_no,
      litres: Number(l.litres),
      coaPurityPct: l.coa_purity_pct,
    })),
  };
}

export function listShipmentsByOrder(orderId: string): EtohShipment[] {
  const rows = getDb()
    .prepare(`SELECT * FROM etoh_shipments WHERE order_id = ? ORDER BY shipped_at, id`)
    .all(orderId) as ShipmentRow[];
  return rows.map(mapShipment);
}

/** Latest delivery note of an order (kept for callers that show one). */
export function getShipmentByOrder(orderId: string): EtohShipment | null {
  const list = listShipmentsByOrder(orderId);
  return list.length ? list[list.length - 1]! : null;
}

export function getShipment(id: number): EtohShipment | null {
  const row = getDb().prepare(`SELECT * FROM etoh_shipments WHERE id = ?`).get(id) as ShipmentRow | undefined;
  return row ? mapShipment(row) : null;
}

export function getShipmentByDn(dnNo: string): EtohShipment | null {
  const row = getDb().prepare(`SELECT * FROM etoh_shipments WHERE dn_no = ?`).get(dnNo) as ShipmentRow | undefined;
  return row ? mapShipment(row) : null;
}

export type EtohLineProgress = {
  lineIndex: number;
  ordered: number;
  shipped: number;
  remaining: number;
};

export type EtohOrderProgress = {
  lines: EtohLineProgress[];
  fullyShipped: boolean;
  anyShipped: boolean;
  allDelivered: boolean;
  invoicedTotal: number;
  invoicedSubtotal: number;
  invoicedVat: number;
};

export function orderProgress(meta: EtohOrderMeta, shipments: EtohShipment[]): EtohOrderProgress {
  const lines = meta.lines.map((line, index) => {
    const shipped = shipments.reduce(
      (sum, s) => sum + (s.items.find((i) => i.lineIndex === index)?.qty ?? 0),
      0,
    );
    return { lineIndex: index, ordered: line.qty, shipped, remaining: Math.max(0, line.qty - shipped) };
  });
  return {
    lines,
    fullyShipped: lines.every((l) => l.remaining === 0),
    anyShipped: shipments.length > 0,
    allDelivered: shipments.length > 0 && shipments.every((s) => s.status === "delivered"),
    invoicedTotal: roundSatang(shipments.reduce((s, x) => s + x.grandTotal, 0)),
    invoicedSubtotal: roundSatang(shipments.reduce((s, x) => s + x.subtotalExVat, 0)),
    invoicedVat: roundSatang(shipments.reduce((s, x) => s + x.vatAmount, 0)),
  };
}

function nextDocNo(kind: string, now: Date): string {
  const db = getDb();
  const period = buddhistPeriod(now);
  const row = db.prepare(`SELECT last_value FROM document_sequences WHERE kind = ? AND period = ?`).get(kind, period) as
    | { last_value: number }
    | undefined;
  const next = (row?.last_value ?? 0) + 1;
  if (row) db.prepare(`UPDATE document_sequences SET last_value = ? WHERE kind = ? AND period = ?`).run(next, kind, period);
  else db.prepare(`INSERT INTO document_sequences (kind, period, last_value) VALUES (?, ?, ?)`).run(kind, period, next);
  return `${kind}-${period.slice(2)}-${String(next).padStart(4, "0")}`;
}

function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Credit customers: keep one open PromptPay voucher equal to what has been
 * invoiced (delivered) but not paid. A voucher the customer already submitted
 * a slip for is left alone; the next refresh after approval covers the rest.
 */
function refreshCreditVoucher(order: OrderRecord, invoicedTotal: number): void {
  const repo = getOrderRepository();
  const fresh = repo.getOrderByOrderId(order.orderId) ?? order;
  const due = roundSatang(invoicedTotal - fresh.paidAmount);
  const open = repo.findOpenPayment(fresh.orderId, "remaining");
  if (open && open.status === "submitted") return;
  if (open) {
    if (Math.abs(open.amount - due) < 0.005) return;
    getDb()
      .prepare(`UPDATE payments SET status = 'expired', updated_at = ? WHERE payment_id = ?`)
      .run(nowIso(), open.paymentId);
  }
  if (due > 0.004) openOrderPayment(fresh, "remaining", due);
}

export type ShipOrderInput = {
  orderId: string;
  /** Quantities to ship per order line; omitted = everything still open. */
  items?: { lineIndex: number; qty: number }[];
  shipTo?: string;
  vehicle?: string;
  driver?: string;
  actor: string;
};

export function shipOrder(input: ShipOrderInput): EtohShipment {
  const repo = getOrderRepository();
  const order = repo.getOrderByOrderId(input.orderId);
  const meta = getEtohOrder(input.orderId);
  if (!order || !meta) throw new EtohValidationError("ไม่พบออเดอร์เอทานอล");
  if (order.fulfillmentStatus === "cancelled") throw new EtohValidationError("ออเดอร์ถูกยกเลิก");
  if (meta.creditTermDays <= 0 && order.paymentStatus !== "paid") {
    throw new EtohValidationError("ลูกค้าเงินสด — ต้องรับชำระครบก่อนส่งของ");
  }

  const before = orderProgress(meta, listShipmentsByOrder(order.orderId));
  if (before.fullyShipped) throw new EtohValidationError("ส่งครบทุกรายการแล้ว");

  const wanted = new Map<number, number>();
  if (input.items && input.items.length) {
    for (const it of input.items) {
      if (!Number.isInteger(it.qty) || it.qty < 0) throw new EtohValidationError("จำนวนส่งต้องเป็นจำนวนเต็ม");
      if (it.qty > 0) wanted.set(it.lineIndex, it.qty);
    }
  } else {
    for (const l of before.lines) if (l.remaining > 0) wanted.set(l.lineIndex, l.remaining);
  }
  if (wanted.size === 0) throw new EtohValidationError("ระบุจำนวนที่จะส่งอย่างน้อย 1 รายการ");
  for (const [idx, qty] of wanted) {
    const prog = before.lines[idx];
    if (!prog) throw new EtohValidationError("รายการไม่ถูกต้อง");
    if (qty > prog.remaining) {
      throw new EtohValidationError(`รายการที่ ${idx + 1} ส่งได้อีกไม่เกิน ${prog.remaining}`);
    }
  }

  const picks = [...wanted].map(([lineIndex, qty]) => {
    const line = meta.lines[lineIndex]!;
    const litres = roundSatang(getPack(line.pack).litres * qty);
    return { lineIndex, qty, line, litres, lineTotal: roundSatang(line.unitPriceThb * qty), deposit: roundSatang(line.depositPerUnitThb * qty) };
  });

  // Check stock for the whole shipment (same grade on several lines adds up).
  const byGrade = new Map<EtohGradeCode, number>();
  for (const p of picks) byGrade.set(p.line.grade, (byGrade.get(p.line.grade) ?? 0) + p.litres);
  for (const [grade, litres] of byGrade) planLotAllocation(grade, litres);

  const willBeComplete = before.lines.every((l) => l.remaining - (wanted.get(l.lineIndex) ?? 0) === 0);

  // Invoice amount: goods shipped now; the final delivery takes the exact
  // remainder so delivery fee / header discount and rounding reconcile to the order.
  let subtotal = roundSatang(picks.reduce((s, p) => s + p.lineTotal, 0));
  let vat = roundSatang(subtotal * (order.vatRate / 100));
  if (willBeComplete) {
    subtotal = roundSatang(order.subtotalExVat - before.invoicedSubtotal);
    vat = roundSatang(order.vatAmount - before.invoicedVat);
  }
  const grand = roundSatang(subtotal + vat);
  const depositTotal = roundSatang(picks.reduce((s, p) => s + p.deposit, 0));

  const now = new Date();
  const nowStr = now.toISOString();
  const today = bangkokToday(now);

  return tx(() => {
    const dnNo = nextDocNo("DN", now);
    const dueDate = meta.creditTermDays > 0 ? addDays(today, meta.creditTermDays) : null;
    const shipTo =
      input.shipTo?.trim() ||
      [order.shipToName, order.shipToAddress, order.shipToProvince].filter(Boolean).join(" ") ||
      null;
    const res = getDb()
      .prepare(
        `INSERT INTO etoh_shipments
          (dn_no, order_id, customer_id, status, ship_to, vehicle, driver, subtotal_ex_vat, vat_amount, grand_total, deposit_thb, due_date, shipped_at, created_by)
         VALUES (?, ?, ?, 'shipped', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        dnNo,
        order.orderId,
        meta.customerId,
        shipTo,
        input.vehicle?.trim() || null,
        input.driver?.trim() || null,
        subtotal,
        vat,
        grand,
        depositTotal,
        dueDate,
        nowStr,
        input.actor,
      );
    const shipmentId = Number(res.lastInsertRowid);

    const insertItem = getDb().prepare(
      `INSERT INTO etoh_shipment_items (shipment_id, line_index, qty, litres, line_total_thb, deposit_thb) VALUES (?, ?, ?, ?, ?, ?)`,
    );
    const insertLot = getDb().prepare(
      `INSERT INTO etoh_shipment_lots (shipment_id, line_index, sku, grade_code, pack_code, qty, lot_id, litres)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const p of picks) {
      insertItem.run(shipmentId, p.lineIndex, p.qty, p.litres, p.lineTotal, p.deposit);
      for (const a of planLotAllocation(p.line.grade, p.litres)) {
        insertLot.run(shipmentId, p.lineIndex, p.line.sku, p.line.grade, p.line.pack, p.qty, a.lotId, a.litres);
        if (lotRemainingLitres(a.lotId) <= 0) {
          getDb().prepare(`UPDATE etoh_lots SET status = 'depleted', updated_at = ? WHERE id = ?`).run(nowStr, a.lotId);
        }
      }
    }

    const totalLitres = roundSatang(picks.reduce((s, p) => s + p.litres, 0));
    const summary = picks.map((p) => `${getGrade(p.line.grade).nameTh} ${getPack(p.line.pack).nameTh} × ${p.qty}`).join(", ");
    // Tax point for goods = delivery: one ใบกำกับภาษี per delivery note.
    const taxDoc = issueOrderDocument({
      type: "tax_invoice",
      order,
      paymentId: null,
      subtotalExVat: subtotal,
      vatAmount: vat,
      grandTotal: grand,
      lineDescription: `${summary} · รวม ${totalLitres.toLocaleString("th-TH")} ลิตร · ใบส่งของ ${dnNo}`,
      now: nowStr,
    });
    getDb().prepare(`UPDATE etoh_shipments SET tax_invoice_id = ? WHERE id = ?`).run(taxDoc.documentId, shipmentId);

    const invoicedSubtotal = roundSatang(before.invoicedSubtotal + subtotal);
    const invoicedVat = roundSatang(before.invoicedVat + vat);
    // Revenue journal is keyed per order and re-posted with the cumulative delivered amount.
    postRevenueRecognition({
      orderId: order.orderId,
      subtotalExVat: invoicedSubtotal,
      vatAmount: invoicedVat,
      grandTotal: roundSatang(invoicedSubtotal + invoicedVat),
      at: nowStr,
      actor: input.actor,
    });

    if (order.paymentStatus !== "paid") {
      refreshCreditVoucher(order, roundSatang(invoicedSubtotal + invoicedVat));
    }

    repo.updateFulfillment(order.orderId, "out_for_delivery");
    repo.insertEvent({
      orderId: order.orderId,
      eventType: "fulfillment",
      message: `ออกใบส่งของ ${dnNo} และใบกำกับภาษี ${taxDoc.documentId} (${grand.toFixed(2)} บาท)${
        willBeComplete ? " · ส่งครบทุกรายการ" : " · ส่งบางส่วน"
      }${dueDate ? ` · ครบกำหนดชำระ ${dueDate}` : ""}`,
      actor: input.actor,
      createdAt: nowStr,
    });

    if (meta.customerId) {
      for (const p of picks) {
        if (getPack(p.line.pack).kind === "returnable") {
          recordDrumMovement({
            customerId: meta.customerId,
            packCode: p.line.pack,
            qtyDelta: p.qty,
            depositPerUnitThb: p.line.depositPerUnitThb,
            refType: "DN",
            refId: dnNo,
            actor: input.actor,
          });
        }
      }
      if (depositTotal > 0) {
        const returnableQty = picks.filter((p) => p.deposit > 0).reduce((s, p) => s + p.qty, 0);
        createDepositDoc({
          kind: "charge",
          customerId: meta.customerId,
          shipmentId,
          qty: returnableQty,
          amountThb: depositTotal,
          note: `มัดจำภาชนะตามใบส่งของ ${dnNo}`,
          actor: input.actor,
          now,
        });
      }
    }

    enqueue("shipment", dnNo, "shipment.shipped", {
      orderId: order.orderId,
      taxInvoiceId: taxDoc.documentId,
      subtotalExVat: subtotal,
      vatAmount: vat,
      grandTotal: grand,
      depositThb: depositTotal,
      dueDate,
      totalLitres,
      complete: willBeComplete,
    });
    return getShipment(shipmentId)!;
  });
}

export function markDelivered(shipmentId: number, receivedBy: string, actor: string): EtohShipment {
  const shipment = getShipment(shipmentId);
  if (!shipment) throw new EtohValidationError("ไม่พบใบส่งของ");
  if (shipment.status === "delivered") return shipment;
  const name = receivedBy.trim();
  if (!name) throw new EtohValidationError("ระบุชื่อผู้รับสินค้า");
  const now = nowIso();
  return tx(() => {
    getDb()
      .prepare(`UPDATE etoh_shipments SET status = 'delivered', delivered_at = ?, received_by = ? WHERE id = ?`)
      .run(now, name, shipmentId);
    const repo = getOrderRepository();
    const meta = getEtohOrder(shipment.orderId);
    const progress = meta ? orderProgress(meta, listShipmentsByOrder(shipment.orderId)) : null;
    if (progress?.fullyShipped && progress.allDelivered) {
      repo.updateFulfillment(shipment.orderId, "delivered");
    }
    repo.insertEvent({
      orderId: shipment.orderId,
      eventType: "fulfillment",
      message: `ส่งถึงลูกค้าแล้ว (${shipment.dnNo}) · ผู้รับ ${name}${
        progress?.fullyShipped && progress.allDelivered ? " · ส่งครบทั้งออเดอร์" : ""
      }`,
      actor,
      createdAt: now,
    });
    enqueue("shipment", shipment.dnNo, "shipment.delivered", { orderId: shipment.orderId, receivedBy: name });
    return getShipment(shipmentId)!;
  });
}

/** Credit tax invoices past due date while the order still has an unpaid balance. */
export function overdueInvoices(asOf = bangkokToday()): {
  shipment: EtohShipment;
  order: OrderRecord;
  daysOverdue: number;
}[] {
  const rows = getDb()
    .prepare(
      `SELECT s.* FROM etoh_shipments s JOIN orders o ON o.order_id = s.order_id
       WHERE s.due_date IS NOT NULL AND s.due_date < ? AND o.payment_status <> 'paid'
       ORDER BY s.due_date`,
    )
    .all(asOf) as ShipmentRow[];
  const repo = getOrderRepository();
  return rows.flatMap((row) => {
    const order = repo.getOrderByOrderId(row.order_id);
    if (!order) return [];
    // Oldest invoices are considered paid first.
    const earlier = getDb()
      .prepare(`SELECT COALESCE(SUM(grand_total), 0) AS t FROM etoh_shipments WHERE order_id = ? AND (shipped_at < ? OR (shipped_at = ? AND id <= ?))`)
      .get(row.order_id, row.shipped_at, row.shipped_at, row.id) as { t: number };
    if (order.paidAmount + 0.004 >= Number(earlier.t)) return [];
    const days = Math.round((Date.parse(`${asOf}T00:00:00Z`) - Date.parse(`${row.due_date}T00:00:00Z`)) / 86400000);
    return [{ shipment: mapShipment(row), order, daysOverdue: days }];
  });
}

/* --------------------------------------------------- container deposits */

export const DEPOSIT_METHODS = ["transfer", "cash", "cheque", "offset"] as const;
export type DepositMethod = (typeof DEPOSIT_METHODS)[number];
export const DEPOSIT_METHOD_LABELS: Record<DepositMethod, string> = {
  transfer: "โอนเงิน",
  cash: "เงินสด",
  cheque: "เช็ค",
  offset: "หักกลบกับยอดค้าง",
};

export type EtohDepositDoc = {
  id: number;
  docNo: string;
  kind: "charge" | "refund";
  customerId: number;
  shipmentId: number | null;
  packCode: EtohPackCode | null;
  qty: number;
  amountThb: number;
  status: "open" | "settled" | "void";
  method: string | null;
  reference: string | null;
  note: string | null;
  createdBy: string;
  createdAt: string;
  settledBy: string | null;
  settledAt: string | null;
};

type DepositRow = {
  id: number;
  doc_no: string;
  kind: "charge" | "refund";
  customer_id: number;
  shipment_id: number | null;
  pack_code: string | null;
  qty: number;
  amount_thb: number;
  status: "open" | "settled" | "void";
  method: string | null;
  reference: string | null;
  note: string | null;
  created_by: string;
  created_at: string;
  settled_by: string | null;
  settled_at: string | null;
};

function mapDeposit(r: DepositRow): EtohDepositDoc {
  return {
    id: r.id,
    docNo: r.doc_no,
    kind: r.kind,
    customerId: r.customer_id,
    shipmentId: r.shipment_id,
    packCode: (r.pack_code as EtohPackCode | null) ?? null,
    qty: r.qty,
    amountThb: Number(r.amount_thb),
    status: r.status,
    method: r.method,
    reference: r.reference,
    note: r.note,
    createdBy: r.created_by,
    createdAt: r.created_at,
    settledBy: r.settled_by,
    settledAt: r.settled_at,
  };
}

function createDepositDoc(p: {
  kind: "charge" | "refund";
  customerId: number;
  shipmentId?: number | null;
  packCode?: EtohPackCode | null;
  qty: number;
  amountThb: number;
  note: string;
  actor: string;
  now?: Date;
}): EtohDepositDoc {
  const now = p.now ?? new Date();
  const docNo = nextDocNo(p.kind === "charge" ? "DP" : "RF", now);
  const res = getDb()
    .prepare(
      `INSERT INTO etoh_deposit_docs (doc_no, kind, customer_id, shipment_id, pack_code, qty, amount_thb, status, note, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)`,
    )
    .run(docNo, p.kind, p.customerId, p.shipmentId ?? null, p.packCode ?? null, p.qty, roundSatang(p.amountThb), p.note, p.actor, now.toISOString());
  const doc = mapDeposit(getDb().prepare(`SELECT * FROM etoh_deposit_docs WHERE id = ?`).get(Number(res.lastInsertRowid)) as DepositRow);
  enqueue("deposit", doc.docNo, `deposit.${p.kind}_created`, { customerId: p.customerId, amountThb: doc.amountThb, qty: p.qty });
  return doc;
}

export function listDepositDocs(filter: { customerId?: number; status?: "open" | "settled" | "void"; kind?: "charge" | "refund" } = {}, limit = 200): EtohDepositDoc[] {
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (filter.customerId) {
    where.push("customer_id = ?");
    args.push(filter.customerId);
  }
  if (filter.status) {
    where.push("status = ?");
    args.push(filter.status);
  }
  if (filter.kind) {
    where.push("kind = ?");
    args.push(filter.kind);
  }
  args.push(limit);
  return (
    getDb()
      .prepare(`SELECT * FROM etoh_deposit_docs ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY id DESC LIMIT ?`)
      .all(...args) as DepositRow[]
  ).map(mapDeposit);
}

export function getDepositDoc(id: number): EtohDepositDoc | null {
  const r = getDb().prepare(`SELECT * FROM etoh_deposit_docs WHERE id = ?`).get(id) as DepositRow | undefined;
  return r ? mapDeposit(r) : null;
}

/**
 * Collect a deposit charge (DR cash / CR container deposits held) or pay out a
 * refund (DR container deposits held / CR cash). "offset" keeps cash untouched
 * and moves the amount against AR instead.
 */
export function settleDepositDoc(p: { id: number; method: string; reference?: string | null; actor: string }): EtohDepositDoc {
  const doc = getDepositDoc(p.id);
  if (!doc) throw new EtohValidationError("ไม่พบเอกสารมัดจำ");
  if (doc.status !== "open") throw new EtohValidationError("เอกสารนี้ปิดแล้ว");
  if (!(DEPOSIT_METHODS as readonly string[]).includes(p.method)) throw new EtohValidationError("เลือกวิธีรับ/จ่ายเงิน");
  const now = nowIso();
  const counter = p.method === "offset" ? ACCOUNT_CODES.ar : ACCOUNT_CODES.cash;
  return tx(() => {
    getDb()
      .prepare(`UPDATE etoh_deposit_docs SET status = 'settled', method = ?, reference = ?, settled_by = ?, settled_at = ? WHERE id = ?`)
      .run(p.method, (p.reference || "").trim() || null, p.actor, now, p.id);
    upsertJournal({
      sourceKey: `deposit:${doc.docNo}`,
      bookType: doc.kind === "charge" ? "cash_in" : "cash_out",
      memo:
        doc.kind === "charge"
          ? `รับเงินมัดจำภาชนะ ${doc.docNo} ${doc.amountThb.toFixed(2)} บาท`
          : `คืนเงินมัดจำภาชนะ ${doc.docNo} ${doc.amountThb.toFixed(2)} บาท`,
      postedBy: p.actor,
      at: now,
      lines:
        doc.kind === "charge"
          ? [
              { accountCode: counter, debit: doc.amountThb, credit: 0, memo: DEPOSIT_METHOD_LABELS[p.method as DepositMethod] },
              { accountCode: ACCOUNT_CODES.containerDeposit, debit: 0, credit: doc.amountThb, memo: "มัดจำภาชนะ" },
            ]
          : [
              { accountCode: ACCOUNT_CODES.containerDeposit, debit: doc.amountThb, credit: 0, memo: "คืนมัดจำภาชนะ" },
              { accountCode: counter, debit: 0, credit: doc.amountThb, memo: DEPOSIT_METHOD_LABELS[p.method as DepositMethod] },
            ],
    });
    enqueue("deposit", doc.docNo, `deposit.${doc.kind}_settled`, { amountThb: doc.amountThb, method: p.method });
    return getDepositDoc(p.id)!;
  });
}

export function voidDepositDoc(id: number, actor: string): EtohDepositDoc {
  const doc = getDepositDoc(id);
  if (!doc) throw new EtohValidationError("ไม่พบเอกสารมัดจำ");
  if (doc.status !== "open") throw new EtohValidationError("ยกเลิกได้เฉพาะเอกสารที่ยังไม่รับ/จ่ายเงิน");
  getDb().prepare(`UPDATE etoh_deposit_docs SET status = 'void', settled_by = ?, settled_at = ? WHERE id = ?`).run(actor, nowIso(), id);
  enqueue("deposit", doc.docNo, "deposit.voided", { actor });
  return getDepositDoc(id)!;
}

/**
 * Customer returns drums / IBCs: records the return in the drum ledger at the
 * average deposit they hold for that pack and opens a refund document.
 */
export function returnContainers(p: {
  customerId: number;
  packCode: EtohPackCode;
  qty: number;
  memo?: string | null;
  actor: string;
}): { refund: EtohDepositDoc | null } {
  if (!Number.isInteger(p.qty) || p.qty <= 0) throw new EtohValidationError("จำนวนคืนต้องเป็นจำนวนเต็มบวก");
  const bal = drumBalances(p.customerId).find((b) => b.packCode === p.packCode);
  if (!bal || bal.outstanding < p.qty) throw new EtohValidationError("คืนถังเกินจำนวนที่ลูกค้าถืออยู่");
  const perUnit = bal.outstanding > 0 ? roundSatang(bal.depositHeldThb / bal.outstanding) : 0;
  return tx(() => {
    recordDrumMovement({
      customerId: p.customerId,
      packCode: p.packCode,
      qtyDelta: -p.qty,
      depositPerUnitThb: perUnit,
      refType: "RETURN",
      memo: p.memo ?? null,
      actor: p.actor,
    });
    // Deposit billed but never collected must not be paid back: cancel open
    // charges first (oldest first), refund only what was actually received.
    let amount = roundSatang(perUnit * p.qty);
    const openCharges = getDb()
      .prepare(
        `SELECT * FROM etoh_deposit_docs WHERE customer_id = ? AND kind = 'charge' AND status = 'open' ORDER BY id`,
      )
      .all(p.customerId) as DepositRow[];
    const nowStr = nowIso();
    for (const charge of openCharges) {
      if (amount <= 0) break;
      const chargeAmt = Number(charge.amount_thb);
      if (chargeAmt <= amount + 0.004) {
        getDb()
          .prepare(
            `UPDATE etoh_deposit_docs SET status = 'void', settled_by = ?, settled_at = ?,
               note = COALESCE(note, '') || ' · ยกเลิก: หักกับการคืนถัง' WHERE id = ?`,
          )
          .run(p.actor, nowStr, charge.id);
        enqueue("deposit", charge.doc_no, "deposit.voided", { reason: "container_return" });
        amount = roundSatang(amount - chargeAmt);
      } else {
        getDb()
          .prepare(
            `UPDATE etoh_deposit_docs SET amount_thb = ?, note = COALESCE(note, '') || ? WHERE id = ?`,
          )
          .run(roundSatang(chargeAmt - amount), ` · ลดยอด ${amount.toFixed(2)} จากการคืนถัง`, charge.id);
        enqueue("deposit", charge.doc_no, "deposit.reduced", { byThb: amount, reason: "container_return" });
        amount = 0;
      }
    }
    const refund =
      amount > 0
        ? createDepositDoc({
            kind: "refund",
            customerId: p.customerId,
            packCode: p.packCode,
            qty: p.qty,
            amountThb: amount,
            note: `คืน${getPack(p.packCode).nameTh} ${p.qty} ใบ`,
            actor: p.actor,
          })
        : null;
    return { refund };
  });
}
