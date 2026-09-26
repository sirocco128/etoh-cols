/**
 * Etoh Cols persistence (SQLite, node:sqlite). Server-only.
 * Every business write also appends a NEXTERP outbox event in the same
 * transaction so the group ERP can consolidate sales and stock later.
 */

import { getDb } from "@/lib/database";
import {
  ETOH_PACKS,
  ETOH_TIERS,
  isGradeCode,
  isPackCode,
  isTierCode,
  type EtohGradeCode,
  type EtohPackCode,
  type EtohTierCode,
} from "@/lib/etoh/catalog";
import {
  defaultPriceBook,
  type EtohPackSettings,
  type EtohPriceBook,
  type EtohQuoteInput,
  type EtohQuoteResult,
} from "@/lib/etoh/pricing";

export const ETOH_SOURCE_APP = "etoh-cols";

function nowIso(): string {
  return new Date().toISOString();
}

/** Asia/Bangkok calendar date (YYYY-MM-DD). */
export function bangkokToday(now = new Date()): string {
  return new Date(now.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function inTransaction<T>(fn: () => T): T {
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    const out = fn();
    db.exec("COMMIT");
    return out;
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // ignore rollback failure; original error wins
    }
    throw error;
  }
}

function enqueueSync(entity: string, entityId: string, event: string, payload: unknown): void {
  getDb()
    .prepare(
      `INSERT INTO etoh_sync_outbox (entity, entity_id, event, payload_json, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      entity,
      entityId,
      event,
      JSON.stringify({ sourceApp: ETOH_SOURCE_APP, entity, entityId, event, data: payload }),
      nowIso(),
    );
}

export class EtohValidationError extends Error {}

/* ------------------------------------------------------------------ prices */

export type EtohPriceEntry = {
  id: number;
  gradeCode: EtohGradeCode;
  basePricePerLitre: number;
  landedCostPerLitre: number | null;
  effectiveFrom: string;
  note: string | null;
  createdBy: string;
  createdAt: string;
};

type PriceRow = {
  id: number;
  grade_code: string;
  base_price_per_litre: number;
  landed_cost_per_litre: number | null;
  effective_from: string;
  note: string | null;
  created_by: string;
  created_at: string;
};

function mapPrice(row: PriceRow): EtohPriceEntry {
  return {
    id: row.id,
    gradeCode: row.grade_code as EtohGradeCode,
    basePricePerLitre: Number(row.base_price_per_litre),
    landedCostPerLitre: row.landed_cost_per_litre == null ? null : Number(row.landed_cost_per_litre),
    effectiveFrom: row.effective_from,
    note: row.note,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export function addPriceEntry(params: {
  gradeCode: string;
  basePricePerLitre: number;
  landedCostPerLitre?: number | null;
  effectiveFrom?: string;
  note?: string | null;
  actor: string;
}): EtohPriceEntry {
  if (!isGradeCode(params.gradeCode)) throw new EtohValidationError("เกรดสินค้าไม่ถูกต้อง");
  const base = Number(params.basePricePerLitre);
  if (!(base > 0) || base > 10000) throw new EtohValidationError("ราคาฐานต่อลิตรต้องมากกว่า 0");
  const landed =
    params.landedCostPerLitre == null || String(params.landedCostPerLitre) === ""
      ? null
      : Number(params.landedCostPerLitre);
  if (landed != null && !(landed > 0)) throw new EtohValidationError("ต้นทุนต่อลิตรต้องมากกว่า 0");
  const effectiveFrom = (params.effectiveFrom || bangkokToday()).trim();
  if (!isIsoDate(effectiveFrom)) throw new EtohValidationError("วันที่มีผลไม่ถูกต้อง (YYYY-MM-DD)");

  return inTransaction(() => {
    const createdAt = nowIso();
    const result = getDb()
      .prepare(
        `INSERT INTO etoh_price_list
          (grade_code, base_price_per_litre, landed_cost_per_litre, effective_from, note, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        params.gradeCode,
        base,
        landed,
        effectiveFrom,
        params.note?.trim() || null,
        params.actor,
        createdAt,
      );
    const id = Number(result.lastInsertRowid);
    // Landed cost is internal; NEXTERP gets the selling price only.
    enqueueSync("price", String(id), "price.published", {
      gradeCode: params.gradeCode,
      basePricePerLitre: base,
      effectiveFrom,
    });
    return mapPrice(
      getDb().prepare(`SELECT * FROM etoh_price_list WHERE id = ?`).get(id) as PriceRow,
    );
  });
}

export function listPriceHistory(gradeCode?: EtohGradeCode, limit = 100): EtohPriceEntry[] {
  const rows = gradeCode
    ? getDb()
        .prepare(
          `SELECT * FROM etoh_price_list WHERE grade_code = ?
           ORDER BY effective_from DESC, id DESC LIMIT ?`,
        )
        .all(gradeCode, limit)
    : getDb()
        .prepare(`SELECT * FROM etoh_price_list ORDER BY effective_from DESC, id DESC LIMIT ?`)
        .all(limit);
  return (rows as PriceRow[]).map(mapPrice);
}

/** The price in force for each grade on `asOf` (latest effective_from ≤ asOf). */
export function currentPrices(asOf = bangkokToday()): Partial<Record<EtohGradeCode, EtohPriceEntry>> {
  const rows = getDb()
    .prepare(
      `SELECT p.* FROM etoh_price_list p
       WHERE p.effective_from <= ?
         AND p.id = (
           SELECT p2.id FROM etoh_price_list p2
           WHERE p2.grade_code = p.grade_code AND p2.effective_from <= ?
           ORDER BY p2.effective_from DESC, p2.id DESC LIMIT 1
         )`,
    )
    .all(asOf, asOf) as PriceRow[];
  const out: Partial<Record<EtohGradeCode, EtohPriceEntry>> = {};
  for (const row of rows) {
    if (isGradeCode(row.grade_code)) out[row.grade_code] = mapPrice(row);
  }
  return out;
}

/* --------------------------------------------------------- pack / tier cfg */

type PackRow = {
  pack_code: string;
  container_cost_thb: number;
  deposit_thb: number;
  repack_cost_thb: number;
  small_pack_markup_pct: number;
  active: number;
};

export function savePackSettings(settings: EtohPackSettings, actor: string): void {
  if (!isPackCode(settings.code)) throw new EtohValidationError("บรรจุภัณฑ์ไม่ถูกต้อง");
  const nums = [
    settings.containerCostThb,
    settings.depositThb,
    settings.repackCostThb,
    settings.smallPackMarkupPct,
  ];
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) {
    throw new EtohValidationError("ค่าบรรจุภัณฑ์ต้องไม่ติดลบ");
  }
  getDb()
    .prepare(
      `INSERT INTO etoh_pack_settings
        (pack_code, container_cost_thb, deposit_thb, repack_cost_thb, small_pack_markup_pct, active, updated_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(pack_code) DO UPDATE SET
         container_cost_thb = excluded.container_cost_thb,
         deposit_thb = excluded.deposit_thb,
         repack_cost_thb = excluded.repack_cost_thb,
         small_pack_markup_pct = excluded.small_pack_markup_pct,
         active = excluded.active,
         updated_by = excluded.updated_by,
         updated_at = excluded.updated_at`,
    )
    .run(
      settings.code,
      settings.containerCostThb,
      settings.depositThb,
      settings.repackCostThb,
      settings.smallPackMarkupPct,
      settings.active ? 1 : 0,
      actor,
      nowIso(),
    );
}

export function saveTierDiscount(code: string, discountPct: number, actor: string): void {
  if (!isTierCode(code)) throw new EtohValidationError("ระดับราคาไม่ถูกต้อง");
  if (!Number.isFinite(discountPct) || discountPct < 0 || discountPct >= 50) {
    throw new EtohValidationError("ส่วนลดต้องอยู่ระหว่าง 0–50%");
  }
  getDb()
    .prepare(
      `INSERT INTO etoh_tier_settings (tier_code, discount_pct, updated_by, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(tier_code) DO UPDATE SET
         discount_pct = excluded.discount_pct,
         updated_by = excluded.updated_by,
         updated_at = excluded.updated_at`,
    )
    .run(code, discountPct, actor, nowIso());
}

/** Code defaults overlaid with Ops settings and the prices in force. */
export function loadPriceBook(asOf = bangkokToday()): EtohPriceBook {
  const book = defaultPriceBook();
  for (const [grade, entry] of Object.entries(currentPrices(asOf))) {
    if (!entry || !isGradeCode(grade)) continue;
    book.basePricePerLitre[grade] = entry.basePricePerLitre;
    if (entry.landedCostPerLitre != null) book.landedCostPerLitre[grade] = entry.landedCostPerLitre;
  }
  const packRows = getDb().prepare(`SELECT * FROM etoh_pack_settings`).all() as PackRow[];
  for (const row of packRows) {
    if (!isPackCode(row.pack_code)) continue;
    book.packs[row.pack_code] = {
      code: row.pack_code,
      containerCostThb: Number(row.container_cost_thb),
      depositThb: Number(row.deposit_thb),
      repackCostThb: Number(row.repack_cost_thb),
      smallPackMarkupPct: Number(row.small_pack_markup_pct),
      active: row.active === 1,
    };
  }
  const tierRows = getDb().prepare(`SELECT tier_code, discount_pct FROM etoh_tier_settings`).all() as {
    tier_code: string;
    discount_pct: number;
  }[];
  for (const row of tierRows) {
    if (isTierCode(row.tier_code)) {
      book.tiers[row.tier_code] = { code: row.tier_code, discountPct: Number(row.discount_pct) };
    }
  }
  return book;
}

export function listPackCodes(): EtohPackCode[] {
  return ETOH_PACKS.map((p) => p.code);
}

export function listTierCodes(): EtohTierCode[] {
  return ETOH_TIERS.map((t) => t.code);
}

/* ------------------------------------------------------- customer terms */

export type EtohCustomerTerms = {
  customerId: number;
  priceTier: EtohTierCode;
  creditLimitThb: number;
  creditTermDays: number;
  reorderCycleDays: number | null;
  endUseSegment: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
};

export function getCustomerTerms(customerId: number): EtohCustomerTerms {
  const row = getDb()
    .prepare(`SELECT * FROM etoh_customer_terms WHERE customer_id = ?`)
    .get(customerId) as
    | {
        customer_id: number;
        price_tier: string;
        credit_limit_thb: number;
        credit_term_days: number;
        reorder_cycle_days: number | null;
        end_use_segment: string | null;
        updated_by: string;
        updated_at: string;
      }
    | undefined;
  if (!row) {
    return {
      customerId,
      priceTier: "standard",
      creditLimitThb: 0,
      creditTermDays: 0,
      reorderCycleDays: null,
      endUseSegment: null,
      updatedBy: null,
      updatedAt: null,
    };
  }
  return {
    customerId: row.customer_id,
    priceTier: isTierCode(row.price_tier) ? row.price_tier : "standard",
    creditLimitThb: Number(row.credit_limit_thb),
    creditTermDays: Number(row.credit_term_days),
    reorderCycleDays: row.reorder_cycle_days == null ? null : Number(row.reorder_cycle_days),
    endUseSegment: row.end_use_segment,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

export function saveCustomerTerms(
  terms: Omit<EtohCustomerTerms, "updatedBy" | "updatedAt">,
  actor: string,
): EtohCustomerTerms {
  if (!Number.isInteger(terms.customerId) || terms.customerId <= 0) {
    throw new EtohValidationError("รหัสลูกค้าไม่ถูกต้อง");
  }
  if (!isTierCode(terms.priceTier)) throw new EtohValidationError("ระดับราคาไม่ถูกต้อง");
  if (!(terms.creditLimitThb >= 0)) throw new EtohValidationError("วงเงินเครดิตต้องไม่ติดลบ");
  if (!Number.isInteger(terms.creditTermDays) || terms.creditTermDays < 0 || terms.creditTermDays > 180) {
    throw new EtohValidationError("เครดิตเทอมต้องเป็น 0–180 วัน");
  }
  if (
    terms.reorderCycleDays != null &&
    (!Number.isInteger(terms.reorderCycleDays) || terms.reorderCycleDays <= 0)
  ) {
    throw new EtohValidationError("รอบสั่งซื้อต้องเป็นจำนวนวันที่มากกว่า 0");
  }
  inTransaction(() => {
    getDb()
      .prepare(
        `INSERT INTO etoh_customer_terms
          (customer_id, price_tier, credit_limit_thb, credit_term_days, reorder_cycle_days, end_use_segment, updated_by, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(customer_id) DO UPDATE SET
           price_tier = excluded.price_tier,
           credit_limit_thb = excluded.credit_limit_thb,
           credit_term_days = excluded.credit_term_days,
           reorder_cycle_days = excluded.reorder_cycle_days,
           end_use_segment = excluded.end_use_segment,
           updated_by = excluded.updated_by,
           updated_at = excluded.updated_at`,
      )
      .run(
        terms.customerId,
        terms.priceTier,
        terms.creditLimitThb,
        terms.creditTermDays,
        terms.reorderCycleDays,
        terms.endUseSegment?.trim() || null,
        actor,
        nowIso(),
      );
    enqueueSync("customer_terms", String(terms.customerId), "customer_terms.updated", {
      priceTier: terms.priceTier,
      creditLimitThb: terms.creditLimitThb,
      creditTermDays: terms.creditTermDays,
      endUseSegment: terms.endUseSegment,
    });
  });
  return getCustomerTerms(terms.customerId);
}

/* ------------------------------------------------------------------- lots */

export const ETOH_LOT_STATUSES = ["quarantine", "released", "blocked", "depleted"] as const;
export type EtohLotStatus = (typeof ETOH_LOT_STATUSES)[number];

export const ETOH_LOT_STATUS_LABELS: Record<EtohLotStatus, string> = {
  quarantine: "รอตรวจ (กักกัน)",
  released: "ปล่อยขายได้",
  blocked: "ระงับ",
  depleted: "หมดล็อต",
};

export type EtohLot = {
  id: number;
  lotNo: string;
  gradeCode: EtohGradeCode;
  supplierName: string | null;
  originCountry: string | null;
  containerNo: string | null;
  blNo: string | null;
  arrivalDate: string | null;
  receivedLitres: number;
  coaPurityPct: number | null;
  coaObjectKey: string | null;
  fdaRef: string | null;
  expiryDate: string | null;
  status: EtohLotStatus;
  note: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

type LotRow = {
  id: number;
  lot_no: string;
  grade_code: string;
  supplier_name: string | null;
  origin_country: string | null;
  container_no: string | null;
  bl_no: string | null;
  arrival_date: string | null;
  received_litres: number;
  coa_purity_pct: number | null;
  coa_object_key: string | null;
  fda_ref: string | null;
  expiry_date: string | null;
  status: string;
  note: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

function mapLot(row: LotRow): EtohLot {
  return {
    id: row.id,
    lotNo: row.lot_no,
    gradeCode: row.grade_code as EtohGradeCode,
    supplierName: row.supplier_name,
    originCountry: row.origin_country,
    containerNo: row.container_no,
    blNo: row.bl_no,
    arrivalDate: row.arrival_date,
    receivedLitres: Number(row.received_litres),
    coaPurityPct: row.coa_purity_pct == null ? null : Number(row.coa_purity_pct),
    coaObjectKey: row.coa_object_key,
    fdaRef: row.fda_ref,
    expiryDate: row.expiry_date,
    status: row.status as EtohLotStatus,
    note: row.note,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type CreateLotParams = {
  lotNo: string;
  gradeCode: string;
  supplierName?: string | null;
  originCountry?: string | null;
  containerNo?: string | null;
  blNo?: string | null;
  arrivalDate?: string | null;
  receivedLitres: number;
  coaPurityPct?: number | null;
  coaObjectKey?: string | null;
  fdaRef?: string | null;
  expiryDate?: string | null;
  note?: string | null;
  actor: string;
};

function optText(value: string | null | undefined): string | null {
  const v = String(value ?? "").trim();
  return v ? v : null;
}

function optDate(value: string | null | undefined, label: string): string | null {
  const v = optText(value);
  if (v && !isIsoDate(v)) throw new EtohValidationError(`${label} ไม่ถูกต้อง (YYYY-MM-DD)`);
  return v;
}

export function createLot(params: CreateLotParams): EtohLot {
  const lotNo = String(params.lotNo || "").trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9\-_/]{2,40}$/.test(lotNo)) {
    throw new EtohValidationError("เลขล็อตต้องเป็น A-Z 0-9 - _ / ยาว 3–41 ตัว");
  }
  if (!isGradeCode(params.gradeCode)) throw new EtohValidationError("เกรดสินค้าไม่ถูกต้อง");
  const litres = Number(params.receivedLitres);
  if (!(litres > 0)) throw new EtohValidationError("ปริมาณรับเข้าต้องมากกว่า 0 ลิตร");
  const purity = params.coaPurityPct == null || String(params.coaPurityPct) === "" ? null : Number(params.coaPurityPct);
  if (purity != null && !(purity > 0 && purity <= 100)) {
    throw new EtohValidationError("ความบริสุทธิ์ตาม CoA ต้องอยู่ระหว่าง 0–100%");
  }
  const arrivalDate = optDate(params.arrivalDate, "วันที่เข้า");
  const expiryDate = optDate(params.expiryDate, "วันหมดอายุ");

  const exists = getDb().prepare(`SELECT id FROM etoh_lots WHERE lot_no = ?`).get(lotNo);
  if (exists) throw new EtohValidationError(`มีเลขล็อต ${lotNo} แล้ว`);

  return inTransaction(() => {
    const now = nowIso();
    const result = getDb()
      .prepare(
        `INSERT INTO etoh_lots
          (lot_no, grade_code, supplier_name, origin_country, container_no, bl_no, arrival_date,
           received_litres, coa_purity_pct, coa_object_key, fda_ref, expiry_date, status, note,
           created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'quarantine', ?, ?, ?, ?)`,
      )
      .run(
        lotNo,
        params.gradeCode,
        optText(params.supplierName),
        optText(params.originCountry),
        optText(params.containerNo)?.toUpperCase() ?? null,
        optText(params.blNo),
        arrivalDate,
        litres,
        purity,
        optText(params.coaObjectKey),
        optText(params.fdaRef),
        expiryDate,
        optText(params.note),
        params.actor,
        now,
        now,
      );
    const id = Number(result.lastInsertRowid);
    const lot = mapLot(getDb().prepare(`SELECT * FROM etoh_lots WHERE id = ?`).get(id) as LotRow);
    enqueueSync("lot", lot.lotNo, "lot.received", {
      gradeCode: lot.gradeCode,
      receivedLitres: lot.receivedLitres,
      containerNo: lot.containerNo,
      arrivalDate: lot.arrivalDate,
    });
    return lot;
  });
}

/**
 * Release rules: a lot can be released only with a CoA purity on file, and a
 * FOOD lot also needs an FDA reference. This stops unverified stock shipping.
 */
export function setLotStatus(lotId: number, status: string, actor: string): EtohLot {
  if (!(ETOH_LOT_STATUSES as readonly string[]).includes(status)) {
    throw new EtohValidationError("สถานะล็อตไม่ถูกต้อง");
  }
  const row = getDb().prepare(`SELECT * FROM etoh_lots WHERE id = ?`).get(lotId) as LotRow | undefined;
  if (!row) throw new EtohValidationError("ไม่พบล็อต");
  const lot = mapLot(row);
  if (status === "released") {
    if (lot.coaPurityPct == null) throw new EtohValidationError("ต้องบันทึกผล CoA ก่อนปล่อยขาย");
    if (lot.gradeCode === "FOOD" && !lot.fdaRef) {
      throw new EtohValidationError("เกรดอาหารต้องมีเลขอ้างอิง อย. ก่อนปล่อยขาย");
    }
    if (lot.expiryDate && lot.expiryDate < bangkokToday()) {
      throw new EtohValidationError("ล็อตหมดอายุแล้ว ปล่อยขายไม่ได้");
    }
  }
  return inTransaction(() => {
    getDb()
      .prepare(`UPDATE etoh_lots SET status = ?, updated_at = ? WHERE id = ?`)
      .run(status, nowIso(), lotId);
    enqueueSync("lot", lot.lotNo, "lot.status_changed", { from: lot.status, to: status, actor });
    return mapLot(getDb().prepare(`SELECT * FROM etoh_lots WHERE id = ?`).get(lotId) as LotRow);
  });
}

export function updateLotCoa(
  lotId: number,
  params: { coaPurityPct?: number | null; coaObjectKey?: string | null; fdaRef?: string | null },
): EtohLot {
  const purity = params.coaPurityPct == null || String(params.coaPurityPct) === "" ? null : Number(params.coaPurityPct);
  if (purity != null && !(purity > 0 && purity <= 100)) {
    throw new EtohValidationError("ความบริสุทธิ์ตาม CoA ต้องอยู่ระหว่าง 0–100%");
  }
  const row = getDb().prepare(`SELECT id FROM etoh_lots WHERE id = ?`).get(lotId);
  if (!row) throw new EtohValidationError("ไม่พบล็อต");
  getDb()
    .prepare(
      `UPDATE etoh_lots SET
         coa_purity_pct = COALESCE(?, coa_purity_pct),
         coa_object_key = COALESCE(?, coa_object_key),
         fda_ref = COALESCE(?, fda_ref),
         updated_at = ?
       WHERE id = ?`,
    )
    .run(purity, optText(params.coaObjectKey), optText(params.fdaRef), nowIso(), lotId);
  return mapLot(getDb().prepare(`SELECT * FROM etoh_lots WHERE id = ?`).get(lotId) as LotRow);
}

export function listLots(filter: { gradeCode?: EtohGradeCode; status?: EtohLotStatus } = {}, limit = 200): EtohLot[] {
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (filter.gradeCode) {
    where.push("grade_code = ?");
    args.push(filter.gradeCode);
  }
  if (filter.status) {
    where.push("status = ?");
    args.push(filter.status);
  }
  args.push(limit);
  const sql = `SELECT * FROM etoh_lots ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
               ORDER BY COALESCE(arrival_date, created_at) DESC, id DESC LIMIT ?`;
  return (getDb().prepare(sql).all(...args) as LotRow[]).map(mapLot);
}

/* ------------------------------------------------ returnable containers */

export type EtohDrumBalance = {
  customerId: number;
  packCode: EtohPackCode;
  outstanding: number;
  depositHeldThb: number;
};

export function recordDrumMovement(params: {
  customerId: number;
  packCode: string;
  qtyDelta: number;
  depositPerUnitThb?: number;
  refType?: string | null;
  refId?: string | null;
  memo?: string | null;
  actor: string;
}): void {
  if (!isPackCode(params.packCode) || ETOH_PACKS.find((p) => p.code === params.packCode)?.kind !== "returnable") {
    throw new EtohValidationError("ใช้ได้กับถัง 200 ลิตร / IBC เท่านั้น");
  }
  if (!Number.isInteger(params.qtyDelta) || params.qtyDelta === 0) {
    throw new EtohValidationError("จำนวนต้องเป็นจำนวนเต็มและไม่เป็น 0");
  }
  const deposit = Number(params.depositPerUnitThb ?? 0);
  if (!(deposit >= 0)) throw new EtohValidationError("ค่ามัดจำต้องไม่ติดลบ");

  inTransaction(() => {
    if (params.qtyDelta < 0) {
      const bal = drumBalances(params.customerId).find((b) => b.packCode === params.packCode);
      if (!bal || bal.outstanding + params.qtyDelta < 0) {
        throw new EtohValidationError("คืนถังเกินจำนวนที่ลูกค้าถืออยู่");
      }
    }
    getDb()
      .prepare(
        `INSERT INTO etoh_drum_ledger
          (customer_id, pack_code, qty_delta, deposit_per_unit_thb, ref_type, ref_id, memo, actor, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        params.customerId,
        params.packCode,
        params.qtyDelta,
        deposit,
        optText(params.refType),
        optText(params.refId),
        optText(params.memo),
        params.actor,
        nowIso(),
      );
    enqueueSync("drum_ledger", String(params.customerId), "container.moved", {
      packCode: params.packCode,
      qtyDelta: params.qtyDelta,
      depositPerUnitThb: deposit,
      refType: params.refType ?? null,
      refId: params.refId ?? null,
    });
  });
}

export function drumBalances(customerId?: number): EtohDrumBalance[] {
  const rows = (
    customerId == null
      ? getDb()
          .prepare(
            `SELECT customer_id, pack_code, SUM(qty_delta) AS outstanding,
                    SUM(qty_delta * deposit_per_unit_thb) AS deposit_held
             FROM etoh_drum_ledger GROUP BY customer_id, pack_code
             HAVING SUM(qty_delta) <> 0 ORDER BY customer_id`,
          )
          .all()
      : getDb()
          .prepare(
            `SELECT customer_id, pack_code, SUM(qty_delta) AS outstanding,
                    SUM(qty_delta * deposit_per_unit_thb) AS deposit_held
             FROM etoh_drum_ledger WHERE customer_id = ? GROUP BY customer_id, pack_code`,
          )
          .all(customerId)
  ) as { customer_id: number; pack_code: string; outstanding: number; deposit_held: number }[];
  return rows
    .filter((r) => isPackCode(r.pack_code))
    .map((r) => ({
      customerId: r.customer_id,
      packCode: r.pack_code as EtohPackCode,
      outstanding: Number(r.outstanding),
      depositHeldThb: Math.round(Number(r.deposit_held) * 100) / 100,
    }));
}

/* ------------------------------------------------------------- quotes */

export const ETOH_QUOTE_STATUSES = ["draft", "sent", "accepted", "rejected", "expired"] as const;
export type EtohQuoteStatus = (typeof ETOH_QUOTE_STATUSES)[number];

export const ETOH_QUOTE_STATUS_LABELS: Record<EtohQuoteStatus, string> = {
  draft: "ร่าง",
  sent: "ส่งลูกค้าแล้ว",
  accepted: "ลูกค้ายืนยัน",
  rejected: "ไม่ผ่าน",
  expired: "หมดอายุ",
};

export type EtohSavedQuote = {
  id: number;
  docNo: string;
  customerId: number | null;
  customerName: string;
  customerTaxId: string | null;
  contact: string | null;
  appliedTier: EtohTierCode;
  input: EtohQuoteInput;
  result: EtohQuoteResult;
  grandTotalThb: number;
  status: EtohQuoteStatus;
  validUntil: string | null;
  note: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

type QuoteRow = {
  id: number;
  doc_no: string;
  customer_id: number | null;
  customer_name: string;
  customer_tax_id: string | null;
  contact: string | null;
  applied_tier: string;
  input_json: string;
  result_json: string;
  grand_total_thb: number;
  status: string;
  valid_until: string | null;
  note: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

function mapQuote(row: QuoteRow): EtohSavedQuote {
  return {
    id: row.id,
    docNo: row.doc_no,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerTaxId: row.customer_tax_id,
    contact: row.contact,
    appliedTier: row.applied_tier as EtohTierCode,
    input: JSON.parse(row.input_json) as EtohQuoteInput,
    result: JSON.parse(row.result_json) as EtohQuoteResult,
    grandTotalThb: Number(row.grand_total_thb),
    status: row.status as EtohQuoteStatus,
    validUntil: row.valid_until,
    note: row.note,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Buddhist-era period, e.g. 2026-09 → "256909". */
export function buddhistPeriod(now = new Date()): string {
  const d = new Date(now.getTime() + 7 * 3600 * 1000);
  return `${d.getUTCFullYear() + 543}${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Must be called inside a transaction. Format: EQ-6909-0001. */
function allocateQuoteNo(now = new Date()): string {
  const db = getDb();
  const kind = "EQ";
  const period = buddhistPeriod(now);
  const existing = db
    .prepare(`SELECT last_value FROM document_sequences WHERE kind = ? AND period = ?`)
    .get(kind, period) as { last_value: number } | undefined;
  const next = (existing?.last_value ?? 0) + 1;
  if (existing) {
    db.prepare(`UPDATE document_sequences SET last_value = ? WHERE kind = ? AND period = ?`).run(
      next,
      kind,
      period,
    );
  } else {
    db.prepare(`INSERT INTO document_sequences (kind, period, last_value) VALUES (?, ?, ?)`).run(
      kind,
      period,
      next,
    );
  }
  return `${kind}-${period.slice(2)}-${String(next).padStart(4, "0")}`;
}

export function saveQuote(params: {
  customerId?: number | null;
  customerName: string;
  customerTaxId?: string | null;
  contact?: string | null;
  input: EtohQuoteInput;
  result: EtohQuoteResult;
  validDays?: number;
  note?: string | null;
  actor: string;
}): EtohSavedQuote {
  const customerName = String(params.customerName || "").trim();
  if (!customerName) throw new EtohValidationError("ระบุชื่อลูกค้า");
  const validDays = params.validDays ?? 7;
  if (!Number.isInteger(validDays) || validDays < 1 || validDays > 90) {
    throw new EtohValidationError("อายุใบเสนอราคาต้องเป็น 1–90 วัน");
  }
  const now = new Date();
  const validUntil = bangkokToday(new Date(now.getTime() + validDays * 86400000));

  return inTransaction(() => {
    const docNo = allocateQuoteNo(now);
    const created = now.toISOString();
    const result = getDb()
      .prepare(
        `INSERT INTO etoh_quotes
          (doc_no, customer_id, customer_name, customer_tax_id, contact, applied_tier,
           input_json, result_json, grand_total_thb, status, valid_until, note,
           created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?)`,
      )
      .run(
        docNo,
        params.customerId ?? null,
        customerName,
        optText(params.customerTaxId),
        optText(params.contact),
        params.result.appliedTier,
        JSON.stringify(params.input),
        JSON.stringify(params.result),
        params.result.grandTotalThb,
        validUntil,
        optText(params.note),
        params.actor,
        created,
        created,
      );
    const id = Number(result.lastInsertRowid);
    const saved = mapQuote(getDb().prepare(`SELECT * FROM etoh_quotes WHERE id = ?`).get(id) as QuoteRow);
    enqueueSync("quote", saved.docNo, "quote.created", {
      customerId: saved.customerId,
      customerName: saved.customerName,
      totalLitres: saved.result.totalLitres,
      goodsThb: saved.result.goodsThb,
      grandTotalThb: saved.grandTotalThb,
      lines: saved.result.lines.map((l) => ({
        sku: l.sku,
        qty: l.qty,
        litres: l.litres,
        unitPriceThb: l.unitPriceThb,
      })),
    });
    return saved;
  });
}

export function getQuote(id: number): EtohSavedQuote | null {
  const row = getDb().prepare(`SELECT * FROM etoh_quotes WHERE id = ?`).get(id) as QuoteRow | undefined;
  return row ? mapQuote(row) : null;
}

export function listQuotes(filter: { status?: EtohQuoteStatus; customerId?: number } = {}, limit = 100): EtohSavedQuote[] {
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (filter.status) {
    where.push("status = ?");
    args.push(filter.status);
  }
  if (filter.customerId) {
    where.push("customer_id = ?");
    args.push(filter.customerId);
  }
  args.push(limit);
  const sql = `SELECT * FROM etoh_quotes ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
               ORDER BY id DESC LIMIT ?`;
  return (getDb().prepare(sql).all(...args) as QuoteRow[]).map(mapQuote);
}

const QUOTE_TRANSITIONS: Record<EtohQuoteStatus, EtohQuoteStatus[]> = {
  draft: ["sent", "rejected", "expired"],
  sent: ["accepted", "rejected", "expired"],
  accepted: [],
  rejected: [],
  expired: [],
};

export function setQuoteStatus(id: number, status: string, actor: string): EtohSavedQuote {
  if (!(ETOH_QUOTE_STATUSES as readonly string[]).includes(status)) {
    throw new EtohValidationError("สถานะไม่ถูกต้อง");
  }
  const quote = getQuote(id);
  if (!quote) throw new EtohValidationError("ไม่พบใบเสนอราคา");
  if (!QUOTE_TRANSITIONS[quote.status].includes(status as EtohQuoteStatus)) {
    throw new EtohValidationError(
      `เปลี่ยนจาก "${ETOH_QUOTE_STATUS_LABELS[quote.status]}" เป็น "${ETOH_QUOTE_STATUS_LABELS[status as EtohQuoteStatus]}" ไม่ได้`,
    );
  }
  return inTransaction(() => {
    getDb()
      .prepare(`UPDATE etoh_quotes SET status = ?, updated_at = ? WHERE id = ?`)
      .run(status, nowIso(), id);
    enqueueSync("quote", quote.docNo, `quote.${status}`, {
      grandTotalThb: quote.grandTotalThb,
      actor,
    });
    return getQuote(id)!;
  });
}

/* ------------------------------------------------------------ settings */

export function getSetting(key: string, fallback: string): string {
  const row = getDb().prepare(`SELECT value FROM etoh_settings WHERE key = ?`).get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? fallback;
}

export function setSetting(key: string, value: string, actor: string): void {
  getDb()
    .prepare(
      `INSERT INTO etoh_settings (key, value, updated_by, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
    )
    .run(key, value, actor, nowIso());
}

/* ------------------------------------------------------------- outbox */

export type EtohOutboxEvent = {
  id: number;
  entity: string;
  entityId: string;
  event: string;
  payload: unknown;
  status: "pending" | "sent" | "failed";
  attempts: number;
  lastError: string | null;
  createdAt: string;
  sentAt: string | null;
};

export function listOutbox(status?: "pending" | "sent" | "failed", limit = 100): EtohOutboxEvent[] {
  const rows = (
    status
      ? getDb().prepare(`SELECT * FROM etoh_sync_outbox WHERE status = ? ORDER BY id LIMIT ?`).all(status, limit)
      : getDb().prepare(`SELECT * FROM etoh_sync_outbox ORDER BY id DESC LIMIT ?`).all(limit)
  ) as {
    id: number;
    entity: string;
    entity_id: string;
    event: string;
    payload_json: string;
    status: "pending" | "sent" | "failed";
    attempts: number;
    last_error: string | null;
    created_at: string;
    sent_at: string | null;
  }[];
  return rows.map((r) => ({
    id: r.id,
    entity: r.entity,
    entityId: r.entity_id,
    event: r.event,
    payload: JSON.parse(r.payload_json) as unknown,
    status: r.status,
    attempts: r.attempts,
    lastError: r.last_error,
    createdAt: r.created_at,
    sentAt: r.sent_at,
  }));
}

export function markOutboxSent(id: number): void {
  getDb()
    .prepare(`UPDATE etoh_sync_outbox SET status = 'sent', sent_at = ?, attempts = attempts + 1, last_error = NULL WHERE id = ?`)
    .run(nowIso(), id);
}

/** After 10 failed attempts the event parks as 'failed' for manual review. */
export function markOutboxFailed(id: number, error: string): void {
  getDb()
    .prepare(
      `UPDATE etoh_sync_outbox
       SET attempts = attempts + 1,
           last_error = ?,
           status = CASE WHEN attempts + 1 >= 10 THEN 'failed' ELSE 'pending' END
       WHERE id = ?`,
    )
    .run(String(error).slice(0, 500), id);
}
