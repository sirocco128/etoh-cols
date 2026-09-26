/**
 * Etoh Cols sales flow on top of the shared order / billing / ledger engine:
 *
 *   accepted EQ quote ──► order (orders table, ORD-…) ──► delivery note (DN-…)
 *                                                          ├─ FIFO lot allocation (released lots only)
 *                                                          ├─ ใบกำกับภาษี issued at delivery (tax point)
 *                                                          ├─ revenue + VAT (AR for credit customers)
 *                                                          └─ returnable drums / IBC out to customer
 *
 * Cash customers (credit term 0) must pay before shipping. Credit customers
 * ship first; a PromptPay voucher for the full amount opens with the tax
 * invoice and the due date is shipped date + credit term.
 * Refundable container deposits are tracked in the drum ledger, not in the
 * VAT-able order total.
 */

import { randomBytes } from "node:crypto";
import { getDb } from "@/lib/database";
import { withTransaction } from "@/lib/db-transaction";
import { bangkokDateYmd } from "@/lib/bangkok-date";
import { getCustomerById, recomputeCustomerRollups } from "@/lib/customer-repository";
import { postRevenueRecognition } from "@/lib/ledger-service";
import { getOrderRepository } from "@/lib/order-repository";
import { issueOrderDocument, openOrderPayment } from "@/lib/order-service";
import type { OrderRecord } from "@/lib/order-types";
import { normalizeThaiTaxId, roundSatang } from "@/lib/th-billing";
import { getGrade, getPack, type EtohGradeCode, type EtohPackCode } from "@/lib/etoh/catalog";
import {
  bangkokToday,
  buddhistPeriod,
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
  shipment: EtohShipment | null;
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
    if (order && meta) out.push({ order, meta, shipment: getShipmentByOrder(r.order_id) });
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

export type EtohShipmentLot = {
  lineIndex: number;
  sku: string;
  grade: EtohGradeCode;
  pack: EtohPackCode;
  qty: number;
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
  dueDate: string | null;
  shippedAt: string;
  deliveredAt: string | null;
  receivedBy: string | null;
  createdBy: string;
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
  due_date: string | null;
  shipped_at: string;
  delivered_at: string | null;
  received_by: string | null;
  created_by: string;
};

function mapShipment(row: ShipmentRow): EtohShipment {
  const lots = getDb()
    .prepare(
      `SELECT s.*, l.lot_no, l.coa_purity_pct FROM etoh_shipment_lots s JOIN etoh_lots l ON l.id = s.lot_id
       WHERE s.shipment_id = ? ORDER BY s.line_index, s.id`,
    )
    .all(row.id) as {
    line_index: number;
    sku: string;
    grade_code: EtohGradeCode;
    pack_code: EtohPackCode;
    qty: number;
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
    dueDate: row.due_date,
    shippedAt: row.shipped_at,
    deliveredAt: row.delivered_at,
    receivedBy: row.received_by,
    createdBy: row.created_by,
    lots: lots.map((l) => ({
      lineIndex: l.line_index,
      sku: l.sku,
      grade: l.grade_code,
      pack: l.pack_code,
      qty: l.qty,
      lotId: l.lot_id,
      lotNo: l.lot_no,
      litres: Number(l.litres),
      coaPurityPct: l.coa_purity_pct,
    })),
  };
}

export function getShipmentByOrder(orderId: string): EtohShipment | null {
  const row = getDb().prepare(`SELECT * FROM etoh_shipments WHERE order_id = ?`).get(orderId) as ShipmentRow | undefined;
  return row ? mapShipment(row) : null;
}

export function getShipment(id: number): EtohShipment | null {
  const row = getDb().prepare(`SELECT * FROM etoh_shipments WHERE id = ?`).get(id) as ShipmentRow | undefined;
  return row ? mapShipment(row) : null;
}

function allocateDnNo(now: Date): string {
  const db = getDb();
  const period = buddhistPeriod(now);
  const row = db.prepare(`SELECT last_value FROM document_sequences WHERE kind = 'DN' AND period = ?`).get(period) as
    | { last_value: number }
    | undefined;
  const next = (row?.last_value ?? 0) + 1;
  if (row) db.prepare(`UPDATE document_sequences SET last_value = ? WHERE kind = 'DN' AND period = ?`).run(next, period);
  else db.prepare(`INSERT INTO document_sequences (kind, period, last_value) VALUES ('DN', ?, ?)`).run(period, next);
  return `DN-${period.slice(2)}-${String(next).padStart(4, "0")}`;
}

function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export type ShipOrderInput = {
  orderId: string;
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
  if (getShipmentByOrder(order.orderId)) throw new EtohValidationError("ออเดอร์นี้ออกใบส่งของแล้ว");
  if (meta.creditTermDays <= 0 && order.paymentStatus !== "paid") {
    throw new EtohValidationError("ลูกค้าเงินสด — ต้องรับชำระครบก่อนส่งของ");
  }

  // Plan every line before writing anything so a shortage aborts cleanly.
  const plans = meta.lines.map((line, index) => ({
    index,
    line,
    allocation: planLotAllocation(line.grade, line.litres),
  }));

  // Same grade on two lines must not double-book a lot: re-plan cumulatively.
  const byGrade = new Map<EtohGradeCode, number>();
  for (const p of plans) byGrade.set(p.line.grade, (byGrade.get(p.line.grade) ?? 0) + p.line.litres);
  for (const [grade, litres] of byGrade) planLotAllocation(grade, litres);

  const now = new Date();
  const nowStr = now.toISOString();
  const today = bangkokToday(now);

  return tx(() => {
    const dnNo = allocateDnNo(now);
    const dueDate = meta.creditTermDays > 0 ? addDays(today, meta.creditTermDays) : null;
    const shipTo =
      input.shipTo?.trim() ||
      [order.shipToName, order.shipToAddress, order.shipToProvince].filter(Boolean).join(" ") ||
      null;
    const res = getDb()
      .prepare(
        `INSERT INTO etoh_shipments (dn_no, order_id, customer_id, status, ship_to, vehicle, driver, due_date, shipped_at, created_by)
         VALUES (?, ?, ?, 'shipped', ?, ?, ?, ?, ?, ?)`,
      )
      .run(dnNo, order.orderId, meta.customerId, shipTo, input.vehicle?.trim() || null, input.driver?.trim() || null, dueDate, nowStr, input.actor);
    const shipmentId = Number(res.lastInsertRowid);

    const insertLot = getDb().prepare(
      `INSERT INTO etoh_shipment_lots (shipment_id, line_index, sku, grade_code, pack_code, qty, lot_id, litres)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const p of plans) {
      // Re-plan inside the transaction so earlier lines' allocations are seen.
      const allocation = planLotAllocation(p.line.grade, p.line.litres);
      for (const a of allocation) {
        insertLot.run(shipmentId, p.index, p.line.sku, p.line.grade, p.line.pack, p.line.qty, a.lotId, a.litres);
        if (lotRemainingLitres(a.lotId) <= 0) {
          getDb().prepare(`UPDATE etoh_lots SET status = 'depleted', updated_at = ? WHERE id = ?`).run(nowStr, a.lotId);
        }
      }
    }

    // Tax point for goods = delivery: issue ใบกำกับภาษี now.
    const taxDoc = issueOrderDocument({
      type: "tax_invoice",
      order,
      paymentId: null,
      subtotalExVat: order.subtotalExVat,
      vatAmount: order.vatAmount,
      grandTotal: order.totalAmount,
      lineDescription: `${order.productSummary} · รวม ${meta.totalLitres.toLocaleString("th-TH")} ลิตร · ใบส่งของ ${dnNo}`,
      now: nowStr,
    });
    getDb().prepare(`UPDATE etoh_shipments SET tax_invoice_id = ? WHERE id = ?`).run(taxDoc.documentId, shipmentId);

    postRevenueRecognition({
      orderId: order.orderId,
      subtotalExVat: order.subtotalExVat,
      vatAmount: order.vatAmount,
      grandTotal: order.totalAmount,
      at: nowStr,
      actor: input.actor,
    });

    if (order.paymentStatus !== "paid") {
      openOrderPayment(order, "remaining", order.remainingAmount);
    }

    repo.updateFulfillment(order.orderId, "out_for_delivery");
    repo.insertEvent({
      orderId: order.orderId,
      eventType: "fulfillment",
      message: `ออกใบส่งของ ${dnNo} และใบกำกับภาษี ${taxDoc.documentId}${dueDate ? ` · ครบกำหนดชำระ ${dueDate}` : ""}`,
      actor: input.actor,
      createdAt: nowStr,
    });

    if (meta.customerId) {
      for (const line of meta.lines) {
        if (getPack(line.pack).kind === "returnable") {
          recordDrumMovement({
            customerId: meta.customerId,
            packCode: line.pack,
            qtyDelta: line.qty,
            depositPerUnitThb: line.depositPerUnitThb,
            refType: "DN",
            refId: dnNo,
            actor: input.actor,
          });
        }
      }
    }

    enqueue("shipment", dnNo, "shipment.shipped", {
      orderId: order.orderId,
      taxInvoiceId: taxDoc.documentId,
      dueDate,
      totalLitres: meta.totalLitres,
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
    repo.updateFulfillment(shipment.orderId, "delivered");
    repo.insertEvent({
      orderId: shipment.orderId,
      eventType: "fulfillment",
      message: `ส่งถึงลูกค้าแล้ว (${shipment.dnNo}) · ผู้รับ ${name}`,
      actor,
      createdAt: now,
    });
    enqueue("shipment", shipment.dnNo, "shipment.delivered", { orderId: shipment.orderId, receivedBy: name });
    return getShipment(shipmentId)!;
  });
}

/** Credit invoices past due date and still unpaid. */
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
    const days = Math.round((Date.parse(`${asOf}T00:00:00Z`) - Date.parse(`${row.due_date}T00:00:00Z`)) / 86400000);
    return [{ shipment: mapShipment(row), order, daysOverdue: days }];
  });
}
