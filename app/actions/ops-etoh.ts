"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { OpsActionResult } from "@/app/actions/ops";
import { writeOpsAudit } from "@/lib/ops-audit";
import { actorMay, isPlatformAdmin, requireOpsActor } from "@/lib/ops-auth";
import { pushOutboxToNexterp } from "@/lib/etoh/nexterp-sync";
import { opsAuditRequestMeta as requestMeta } from "@/lib/ops-request-context";
import {
  ETOH_PACKS,
  ETOH_TIERS,
  isGradeCode,
  isPackCode,
  isTierCode,
  perLitreFromPerKg,
  type EtohGradeCode,
  type EtohPackCode,
  type EtohTierCode,
} from "@/lib/etoh/catalog";
import {
  computeEtohQuote,
  EtohPricingError,
  stripEtohCost,
  type EtohQuoteInput,
  type EtohQuoteResult,
} from "@/lib/etoh/pricing";
import {
  addPriceEntry,
  createLot,
  EtohValidationError,
  getCustomerTerms,
  loadPriceBook,
  recordDrumMovement,
  saveCustomerTerms,
  savePackSettings,
  saveQuote,
  saveTierDiscount,
  setLotStatus,
  setQuoteStatus,
  setSetting,
  updateLotCoa,
} from "@/lib/etoh/repository";
import { getCustomerById } from "@/lib/customer-repository";
import {
  convertQuoteToOrder,
  markDelivered,
  returnContainers,
  settleDepositDoc,
  shipOrder,
  voidDepositDoc,
} from "@/lib/etoh/sales";
import { logFollowup } from "@/lib/etoh/followups";

function text(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

function num(form: FormData, key: string, fallback = 0): number {
  const raw = text(form, key).replace(/,/g, "");
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : Number.NaN;
}

function optNum(form: FormData, key: string): number | null {
  const raw = text(form, key).replace(/,/g, "");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : Number.NaN;
}

function failure(error: unknown, fallback: string): OpsActionResult {
  if (error instanceof EtohValidationError || error instanceof EtohPricingError) {
    return { ok: false, error: error.message };
  }
  console.error("[ops-etoh]", error);
  return { ok: false, error: fallback };
}

/* ------------------------------------------------------------ price book */

export async function savePriceEntryAction(
  _prev: OpsActionResult | null,
  formData: FormData,
): Promise<OpsActionResult> {
  const actor = await requireOpsActor("catalog.write");
  if (!actor) return { ok: false, error: "ไม่มีสิทธิ์ตั้งราคา" };
  const meta = await requestMeta();
  let entryId = 0;
  try {
    // Bulk ethanol is traded in THB/kg; the price book stores THB/L.
    const perKg = text(formData, "priceUnit") === "kg";
    const toLitre = (v: number) => (perKg ? perLitreFromPerKg(v) : v);
    const rawBase = formData.has("basePrice") ? num(formData, "basePrice", Number.NaN) : num(formData, "basePricePerLitre", Number.NaN);
    const rawCost = formData.has("landedCost") ? optNum(formData, "landedCost") : optNum(formData, "landedCostPerLitre");
    const entry = addPriceEntry({
      gradeCode: text(formData, "gradeCode"),
      basePricePerLitre: Number.isFinite(rawBase) ? toLitre(rawBase) : rawBase,
      // Only roles that may see cost may set it.
      landedCostPerLitre: actorMay(actor, "factory.read") && rawCost != null ? toLitre(rawCost) : null,
      effectiveFrom: text(formData, "effectiveFrom") || undefined,
      note: text(formData, "note"),
      actor: actor.email,
    });
    entryId = entry.id;
  } catch (error) {
    return failure(error, "บันทึกราคาไม่สำเร็จ");
  }
  writeOpsAudit({
    actor,
    action: "etoh.price.add",
    status: "ok",
    resourceType: "etoh_price",
    resourceId: String(entryId),
    detail: {
      gradeCode: text(formData, "gradeCode"),
      base: text(formData, "basePrice") || text(formData, "basePricePerLitre"),
      unit: text(formData, "priceUnit") || "litre",
    },
    ...meta,
  });
  revalidatePath("/ops/etoh");
  revalidatePath("/ops/etoh/prices");
  return { ok: true };
}

export async function savePackAndTierSettingsAction(
  _prev: OpsActionResult | null,
  formData: FormData,
): Promise<OpsActionResult> {
  const actor = await requireOpsActor("catalog.write");
  if (!actor) return { ok: false, error: "ไม่มีสิทธิ์แก้ค่าบรรจุภัณฑ์" };
  const meta = await requestMeta();
  try {
    for (const pack of ETOH_PACKS) {
      savePackSettings(
        {
          code: pack.code,
          containerCostThb: num(formData, `${pack.code}.containerCostThb`),
          depositThb: num(formData, `${pack.code}.depositThb`),
          repackCostThb: num(formData, `${pack.code}.repackCostThb`),
          smallPackMarkupPct: num(formData, `${pack.code}.smallPackMarkupPct`),
          active: formData.get(`${pack.code}.active`) === "on",
        },
        actor.email,
      );
    }
    for (const tier of ETOH_TIERS) {
      saveTierDiscount(tier.code, num(formData, `tier.${tier.code}`), actor.email);
    }
    if (formData.has("litresPerContainer")) {
      const litres = num(formData, "litresPerContainer", 25000);
      if (!Number.isInteger(litres) || litres < 1000 || litres > 40000) {
        return { ok: false, error: "ขนาดตู้ต้องเป็น 1,000–40,000 ลิตร" };
      }
      setSetting("litres_per_container", String(litres), actor.email);
    }
  } catch (error) {
    return failure(error, "บันทึกค่าบรรจุภัณฑ์ไม่สำเร็จ");
  }
  writeOpsAudit({
    actor,
    action: "etoh.settings.save",
    status: "ok",
    resourceType: "etoh_settings",
    resourceId: "packs+tiers",
    ...meta,
  });
  revalidatePath("/ops/etoh");
  revalidatePath("/ops/etoh/prices");
  return { ok: true };
}

/* ---------------------------------------------------------------- quotes */

export type EtohQuoteDraft = {
  customerId: number | null;
  customerName: string;
  customerTaxId: string;
  contact: string;
  customerTier: EtohTierCode;
  deliveryFeeThb: number;
  extraDiscountThb: number;
  validDays: number;
  note: string;
  lines: {
    grade: EtohGradeCode;
    pack: EtohPackCode;
    qty: number;
    chargeDeposit: boolean;
    unitPriceOverrideThb: number | null;
  }[];
};

function toQuoteInput(draft: EtohQuoteDraft, allowOverride: boolean): EtohQuoteInput {
  if (!isTierCode(draft.customerTier)) throw new EtohValidationError("ระดับราคาไม่ถูกต้อง");
  if (!Array.isArray(draft.lines) || draft.lines.length === 0 || draft.lines.length > 30) {
    throw new EtohValidationError("ต้องมี 1–30 รายการ");
  }
  return {
    customerTier: draft.customerTier,
    deliveryFeeThb: Number(draft.deliveryFeeThb) || 0,
    extraDiscountThb: Number(draft.extraDiscountThb) || 0,
    lines: draft.lines.map((line) => {
      if (!isGradeCode(line.grade) || !isPackCode(line.pack)) {
        throw new EtohValidationError("สินค้าไม่ถูกต้อง");
      }
      return {
        grade: line.grade,
        pack: line.pack,
        qty: Number(line.qty),
        chargeDeposit: line.chargeDeposit !== false,
        unitPriceOverrideThb:
          allowOverride && line.unitPriceOverrideThb != null && String(line.unitPriceOverrideThb) !== ""
            ? Number(line.unitPriceOverrideThb)
            : null,
      };
    }),
  };
}

export type EtohComputeResponse =
  | { ok: true; result: EtohQuoteResult; canSeeCost: boolean }
  | { ok: false; error: string };

export async function computeEtohQuoteAction(draft: EtohQuoteDraft): Promise<EtohComputeResponse> {
  const actor = await requireOpsActor("quotes.read");
  if (!actor) return { ok: false, error: "ไม่มีสิทธิ์" };
  const canSeeCost = actorMay(actor, "factory.read");
  try {
    const input = toQuoteInput(draft, actorMay(actor, "quotes.write"));
    const result = computeEtohQuote(input, loadPriceBook());
    return { ok: true, result: canSeeCost ? result : stripEtohCost(result), canSeeCost };
  } catch (error) {
    const out = failure(error, "คำนวณราคาไม่สำเร็จ");
    return { ok: false, error: out.error || "คำนวณราคาไม่สำเร็จ" };
  }
}

export async function saveEtohQuoteAction(
  draft: EtohQuoteDraft,
): Promise<{ ok: true; id: number; docNo: string } | { ok: false; error: string }> {
  const actor = await requireOpsActor("quotes.write");
  if (!actor) return { ok: false, error: "ไม่มีสิทธิ์บันทึกใบเสนอราคา" };
  const meta = await requestMeta();
  try {
    let customerName = String(draft.customerName || "").trim();
    let customerTaxId = String(draft.customerTaxId || "").trim();
    const customerId = draft.customerId && draft.customerId > 0 ? draft.customerId : null;
    if (customerId) {
      const customer = getCustomerById(customerId);
      if (!customer) return { ok: false, error: "ไม่พบลูกค้าในระบบ" };
      customerName ||= customer.billingName || customer.company;
      customerTaxId ||= customer.taxId || "";
      // The tier on a saved quote always comes from CRM, not from the browser.
      draft = { ...draft, customerTier: getCustomerTerms(customerId).priceTier };
    }
    const input = toQuoteInput(draft, true);
    // Result is computed server-side from the live price book; client totals are ignored.
    const result = computeEtohQuote(input, loadPriceBook());
    const saved = saveQuote({
      customerId,
      customerName,
      customerTaxId,
      contact: draft.contact,
      input,
      result,
      validDays: Number(draft.validDays) || 7,
      note: draft.note,
      actor: actor.email,
    });
    const overridden = result.lines.filter((l) => l.overridden).map((l) => l.sku);
    writeOpsAudit({
      actor,
      action: "etoh.quote.create",
      status: "ok",
      resourceType: "etoh_quote",
      resourceId: saved.docNo,
      detail: {
        grandTotalThb: saved.grandTotalThb,
        appliedTier: saved.appliedTier,
        ...(overridden.length ? { priceOverride: overridden } : {}),
      },
      ...meta,
    });
    revalidatePath("/ops/etoh/quotes");
    return { ok: true, id: saved.id, docNo: saved.docNo };
  } catch (error) {
    const out = failure(error, "บันทึกใบเสนอราคาไม่สำเร็จ");
    return { ok: false, error: out.error || "บันทึกใบเสนอราคาไม่สำเร็จ" };
  }
}

export async function setEtohQuoteStatusAction(
  _prev: OpsActionResult | null,
  formData: FormData,
): Promise<OpsActionResult> {
  const actor = await requireOpsActor("quotes.write");
  if (!actor) return { ok: false, error: "ไม่มีสิทธิ์" };
  const meta = await requestMeta();
  const id = Number(text(formData, "id"));
  const status = text(formData, "status");
  try {
    const q = setQuoteStatus(id, status, actor.email);
    writeOpsAudit({
      actor,
      action: "etoh.quote.status",
      status: "ok",
      resourceType: "etoh_quote",
      resourceId: q.docNo,
      detail: { status },
      ...meta,
    });
  } catch (error) {
    return failure(error, "เปลี่ยนสถานะไม่สำเร็จ");
  }
  revalidatePath("/ops/etoh/quotes");
  revalidatePath(`/ops/etoh/quotes/${id}`);
  return { ok: true };
}

/* -------------------------------------------------------- customer terms */

export async function saveCustomerTermsAction(
  _prev: OpsActionResult | null,
  formData: FormData,
): Promise<OpsActionResult> {
  const actor = await requireOpsActor("customers.write");
  if (!actor) return { ok: false, error: "ไม่มีสิทธิ์แก้เงื่อนไขลูกค้า" };
  const meta = await requestMeta();
  const customerId = Number(text(formData, "customerId"));
  if (!getCustomerById(customerId)) return { ok: false, error: "ไม่พบลูกค้า" };
  const tier = text(formData, "priceTier");
  // Contract / dealer / bulk tiers change margin materially: sales admins and up only.
  if (["contract", "dealer", "bulk"].includes(tier) && !actorMay(actor, "catalog.write")) {
    return { ok: false, error: "ระดับสัญญา / ตัวแทน / Bulk ต้องให้หัวหน้าฝ่ายขายหรือผู้ดูแลตั้ง" };
  }
  try {
    saveCustomerTerms(
      {
        customerId,
        priceTier: (isTierCode(tier) ? tier : "standard") as EtohTierCode,
        creditLimitThb: num(formData, "creditLimitThb"),
        creditTermDays: num(formData, "creditTermDays"),
        reorderCycleDays: optNum(formData, "reorderCycleDays"),
        endUseSegment: text(formData, "endUseSegment") || null,
      },
      actor.email,
    );
  } catch (error) {
    return failure(error, "บันทึกเงื่อนไขลูกค้าไม่สำเร็จ");
  }
  writeOpsAudit({
    actor,
    action: "etoh.customer_terms.save",
    status: "ok",
    resourceType: "customer",
    resourceId: String(customerId),
    detail: { priceTier: tier, creditTermDays: text(formData, "creditTermDays") },
    ...meta,
  });
  revalidatePath("/ops/etoh/customers");
  return { ok: true };
}

/* ------------------------------------------------------------------ lots */

export async function createLotAction(
  _prev: OpsActionResult | null,
  formData: FormData,
): Promise<OpsActionResult> {
  const actor = await requireOpsActor("stock.write");
  if (!actor) return { ok: false, error: "ไม่มีสิทธิ์รับล็อตเข้า" };
  const meta = await requestMeta();
  let lotNo = "";
  try {
    const lot = createLot({
      lotNo: text(formData, "lotNo"),
      gradeCode: text(formData, "gradeCode"),
      supplierName: text(formData, "supplierName"),
      originCountry: text(formData, "originCountry"),
      containerNo: text(formData, "containerNo"),
      blNo: text(formData, "blNo"),
      arrivalDate: text(formData, "arrivalDate"),
      receivedLitres: num(formData, "receivedLitres", Number.NaN),
      coaPurityPct: optNum(formData, "coaPurityPct"),
      fdaRef: text(formData, "fdaRef"),
      expiryDate: text(formData, "expiryDate"),
      note: text(formData, "note"),
      actor: actor.email,
    });
    lotNo = lot.lotNo;
  } catch (error) {
    return failure(error, "บันทึกล็อตไม่สำเร็จ");
  }
  writeOpsAudit({
    actor,
    action: "etoh.lot.create",
    status: "ok",
    resourceType: "etoh_lot",
    resourceId: lotNo,
    ...meta,
  });
  revalidatePath("/ops/etoh/lots");
  redirect("/ops/etoh/lots");
}

export async function updateLotAction(
  _prev: OpsActionResult | null,
  formData: FormData,
): Promise<OpsActionResult> {
  const actor = await requireOpsActor("stock.write");
  if (!actor) return { ok: false, error: "ไม่มีสิทธิ์" };
  const meta = await requestMeta();
  const lotId = Number(text(formData, "lotId"));
  const status = text(formData, "status");
  try {
    updateLotCoa(lotId, {
      coaPurityPct: optNum(formData, "coaPurityPct"),
      fdaRef: text(formData, "fdaRef") || null,
    });
    if (status) setLotStatus(lotId, status, actor.email);
  } catch (error) {
    return failure(error, "อัปเดตล็อตไม่สำเร็จ");
  }
  writeOpsAudit({
    actor,
    action: "etoh.lot.update",
    status: "ok",
    resourceType: "etoh_lot",
    resourceId: String(lotId),
    detail: { status: status || null },
    ...meta,
  });
  revalidatePath("/ops/etoh/lots");
  return { ok: true };
}

/* ---------------------------------------------------------------- drums */

export async function recordDrumMovementAction(
  _prev: OpsActionResult | null,
  formData: FormData,
): Promise<OpsActionResult> {
  const actor = await requireOpsActor("stock.write");
  if (!actor) return { ok: false, error: "ไม่มีสิทธิ์" };
  const meta = await requestMeta();
  const customerId = Number(text(formData, "customerId"));
  if (!getCustomerById(customerId)) return { ok: false, error: "ไม่พบลูกค้า" };
  // Returns must go through returnContainersAction so deposits are cancelled/refunded.
  if (text(formData, "direction") === "in") {
    return { ok: false, error: "รับคืนภาชนะที่ช่อง \"รับคืนภาชนะจากลูกค้า\" เพื่อให้ระบบออกใบคืนมัดจำ" };
  }
  const direction = 1;
  const qty = num(formData, "qty", Number.NaN);
  try {
    recordDrumMovement({
      customerId,
      packCode: text(formData, "packCode"),
      qtyDelta: direction * qty,
      depositPerUnitThb: num(formData, "depositPerUnitThb"),
      refType: text(formData, "refType") || null,
      refId: text(formData, "refId") || null,
      memo: text(formData, "memo") || null,
      actor: actor.email,
    });
  } catch (error) {
    return failure(error, "บันทึกถังไม่สำเร็จ");
  }
  writeOpsAudit({
    actor,
    action: "etoh.drum.move",
    status: "ok",
    resourceType: "customer",
    resourceId: String(customerId),
    detail: { packCode: text(formData, "packCode"), qtyDelta: direction * qty },
    ...meta,
  });
  revalidatePath("/ops/etoh/drums");
  return { ok: true };
}

/* --------------------------------------------------------------- NEXTERP */

export async function pushNexterpNowAction(): Promise<OpsActionResult> {
  const actor = await requireOpsActor("reports.read");
  if (!actor || !isPlatformAdmin(actor.role)) return { ok: false, error: "เฉพาะผู้ดูแลระบบ" };
  const result = await pushOutboxToNexterp(200);
  writeOpsAudit({
    actor,
    action: "etoh.nexterp.push",
    status: "ok",
    resourceType: "etoh_sync_outbox",
    resourceId: "manual",
    detail: result,
  });
  revalidatePath("/ops/etoh/sync");
  if (result.skipped) return { ok: false, error: result.skipped };
  if (result.failed) return { ok: false, error: `ส่งสำเร็จ ${result.sent} / ล้มเหลว ${result.failed}` };
  return { ok: true };
}

/* ------------------------------------------------ orders / shipments */

export async function convertQuoteToOrderAction(
  _prev: OpsActionResult | null,
  formData: FormData,
): Promise<OpsActionResult> {
  const actor = await requireOpsActor("orders.write");
  if (!actor) return { ok: false, error: "ไม่มีสิทธิ์เปิดออเดอร์" };
  const meta = await requestMeta();
  const quoteId = Number(text(formData, "quoteId"));
  const override = formData.get("overrideCreditLimit") === "on";
  if (override && !actorMay(actor, "catalog.write")) {
    return { ok: false, error: "อนุมัติเกินวงเงินได้เฉพาะหัวหน้าฝ่ายขาย / ผู้ดูแล" };
  }
  let orderId = "";
  try {
    const order = convertQuoteToOrder({
      quoteId,
      shipToAddress: text(formData, "shipToAddress") || undefined,
      shipToProvince: text(formData, "shipToProvince") || undefined,
      overrideCreditLimit: override,
      actor: actor.email,
    });
    orderId = order.orderId;
  } catch (error) {
    return failure(error, "เปิดออเดอร์ไม่สำเร็จ");
  }
  writeOpsAudit({
    actor,
    action: "etoh.order.create",
    status: "ok",
    resourceType: "order",
    resourceId: orderId,
    detail: { quoteId, overrideCreditLimit: override || undefined },
    ...meta,
  });
  revalidatePath("/ops/etoh/orders");
  revalidatePath(`/ops/etoh/quotes/${quoteId}`);
  redirect(`/ops/etoh/orders/${orderId}`);
}

export async function shipOrderAction(
  _prev: OpsActionResult | null,
  formData: FormData,
): Promise<OpsActionResult> {
  const actor = await requireOpsActor("stock.write");
  if (!actor) return { ok: false, error: "ไม่มีสิทธิ์ออกใบส่งของ" };
  const meta = await requestMeta();
  const orderId = text(formData, "orderId");
  let dnNo = "";
  try {
    const items: { lineIndex: number; qty: number }[] = [];
    for (const [key, value] of formData.entries()) {
      const m = /^qty_(\d+)$/.exec(key);
      if (m && typeof value === "string" && value.trim() !== "") {
        items.push({ lineIndex: Number(m[1]), qty: Number(value) });
      }
    }
    const shipment = shipOrder({
      orderId,
      items,
      shipTo: text(formData, "shipTo") || undefined,
      vehicle: text(formData, "vehicle") || undefined,
      driver: text(formData, "driver") || undefined,
      actor: actor.email,
    });
    dnNo = shipment.dnNo;
  } catch (error) {
    return failure(error, "ออกใบส่งของไม่สำเร็จ");
  }
  writeOpsAudit({ actor, action: "etoh.shipment.create", status: "ok", resourceType: "order", resourceId: orderId, detail: { dnNo }, ...meta });
  revalidatePath("/ops/etoh/orders");
  revalidatePath(`/ops/etoh/orders/${orderId}`);
  revalidatePath("/ops/etoh/lots");
  return { ok: true };
}

export async function markDeliveredAction(
  _prev: OpsActionResult | null,
  formData: FormData,
): Promise<OpsActionResult> {
  const actor = await requireOpsActor("stock.write");
  if (!actor) return { ok: false, error: "ไม่มีสิทธิ์" };
  const meta = await requestMeta();
  const shipmentId = Number(text(formData, "shipmentId"));
  let orderId = "";
  try {
    orderId = markDelivered(shipmentId, text(formData, "receivedBy"), actor.email).orderId;
  } catch (error) {
    return failure(error, "บันทึกส่งถึงไม่สำเร็จ");
  }
  writeOpsAudit({ actor, action: "etoh.shipment.delivered", status: "ok", resourceType: "order", resourceId: orderId, ...meta });
  revalidatePath("/ops/etoh/orders");
  revalidatePath(`/ops/etoh/orders/${orderId}`);
  return { ok: true };
}

/* ------------------------------------------------------- follow-ups */

export async function logFollowupAction(
  _prev: OpsActionResult | null,
  formData: FormData,
): Promise<OpsActionResult> {
  const actor = await requireOpsActor("customers.write");
  if (!actor) return { ok: false, error: "ไม่มีสิทธิ์" };
  const customerId = Number(text(formData, "customerId"));
  if (!getCustomerById(customerId)) return { ok: false, error: "ไม่พบลูกค้า" };
  try {
    logFollowup({
      customerId,
      outcome: text(formData, "outcome"),
      note: text(formData, "note"),
      nextDate: text(formData, "nextDate") || null,
      actor: actor.email,
    });
  } catch (error) {
    return failure(error, "บันทึกการติดตามไม่สำเร็จ");
  }
  revalidatePath("/ops/etoh/followups");
  return { ok: true };
}

/* ------------------------------------------------ container deposits */

export async function returnContainersAction(
  _prev: OpsActionResult | null,
  formData: FormData,
): Promise<OpsActionResult> {
  const actor = await requireOpsActor("stock.write");
  if (!actor) return { ok: false, error: "ไม่มีสิทธิ์" };
  const meta = await requestMeta();
  const customerId = Number(text(formData, "customerId"));
  if (!getCustomerById(customerId)) return { ok: false, error: "ไม่พบลูกค้า" };
  const packCode = text(formData, "packCode");
  if (!isPackCode(packCode)) return { ok: false, error: "เลือกภาชนะ" };
  let refundNo: string | null = null;
  try {
    refundNo = returnContainers({
      customerId,
      packCode,
      qty: num(formData, "qty", Number.NaN),
      memo: text(formData, "memo") || null,
      actor: actor.email,
    }).refund?.docNo ?? null;
  } catch (error) {
    return failure(error, "บันทึกรับคืนไม่สำเร็จ");
  }
  writeOpsAudit({ actor, action: "etoh.container.return", status: "ok", resourceType: "customer", resourceId: String(customerId), detail: { packCode, refundNo }, ...meta });
  revalidatePath("/ops/etoh/drums");
  return { ok: true };
}

export async function settleDepositAction(
  _prev: OpsActionResult | null,
  formData: FormData,
): Promise<OpsActionResult> {
  const actor = await requireOpsActor("finance.write");
  if (!actor) return { ok: false, error: "เฉพาะฝ่ายบัญชี" };
  const meta = await requestMeta();
  const id = Number(text(formData, "id"));
  let docNo = "";
  try {
    docNo = settleDepositDoc({ id, method: text(formData, "method"), reference: text(formData, "reference"), actor: actor.email }).docNo;
  } catch (error) {
    return failure(error, "บันทึกรับ/จ่ายมัดจำไม่สำเร็จ");
  }
  writeOpsAudit({ actor, action: "etoh.deposit.settle", status: "ok", resourceType: "etoh_deposit", resourceId: docNo, ...meta });
  revalidatePath("/ops/etoh/drums");
  return { ok: true };
}

export async function voidDepositAction(
  _prev: OpsActionResult | null,
  formData: FormData,
): Promise<OpsActionResult> {
  const actor = await requireOpsActor("finance.write");
  if (!actor) return { ok: false, error: "เฉพาะฝ่ายบัญชี" };
  const meta = await requestMeta();
  const id = Number(text(formData, "id"));
  let docNo = "";
  try {
    docNo = voidDepositDoc(id, actor.email).docNo;
  } catch (error) {
    return failure(error, "ยกเลิกเอกสารไม่สำเร็จ");
  }
  writeOpsAudit({ actor, action: "etoh.deposit.void", status: "ok", resourceType: "etoh_deposit", resourceId: docNo, ...meta });
  revalidatePath("/ops/etoh/drums");
  return { ok: true };
}

/* -------------------------------------------------------- dashboard */

export async function saveTargetAction(
  _prev: OpsActionResult | null,
  formData: FormData,
): Promise<OpsActionResult> {
  const actor = await requireOpsActor("catalog.write");
  if (!actor) return { ok: false, error: "ไม่มีสิทธิ์ตั้งเป้า" };
  const containers = num(formData, "containers", Number.NaN);
  if (!Number.isInteger(containers) || containers < 1 || containers > 200) {
    return { ok: false, error: "เป้าต้องเป็น 1–200 ตู้/เดือน" };
  }
  setSetting("monthly_target_containers", String(containers), actor.email);
  writeOpsAudit({ actor, action: "etoh.settings.save", status: "ok", resourceType: "etoh_settings", resourceId: "monthly_target_containers", detail: { containers } });
  revalidatePath("/ops/etoh/dashboard");
  return { ok: true };
}
