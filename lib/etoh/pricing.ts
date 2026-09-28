/**
 * Etoh Cols quote pricing engine (pure, no I/O).
 *
 * Price of one pack =
 *   product value  = base price/litre (grade) × litres × (1 − tier discount)
 *                    × (1 + small-pack markup, one-way packs only)
 *   + container cost (one-way packs) + repack labour (one-way packs)
 *
 * Returnable containers (drum / IBC) carry a refundable deposit that is shown
 * on its own line and kept OUT of the VAT base. Delivery is VAT-able.
 * All money is computed in satang (integer) and rounded per unit so the
 * printed unit price × qty always equals the printed line total.
 */

import {
  ETOH_DEFAULT_LITRES_PER_CONTAINER,
  ETOH_PACKS,
  ETOH_TIERS,
  getGrade,
  getPack,
  getTier,
  skuCode,
  skuLabel,
  type EtohGradeCode,
  type EtohPack,
  type EtohPackCode,
  type EtohTierCode,
} from "@/lib/etoh/catalog";

export const ETOH_VAT_RATE = 0.07;

export type EtohPackSettings = {
  code: EtohPackCode;
  containerCostThb: number;
  depositThb: number;
  repackCostThb: number;
  smallPackMarkupPct: number;
  active: boolean;
};

export type EtohTierSettings = {
  code: EtohTierCode;
  discountPct: number;
};

export type EtohPriceBook = {
  /** Selling base price per litre, THB ex VAT, by grade. Missing = not quotable. */
  basePricePerLitre: Partial<Record<EtohGradeCode, number>>;
  /** Landed cost per litre (import + duty + freight), THB. Optional, Ops-only. */
  landedCostPerLitre: Partial<Record<EtohGradeCode, number>>;
  packs: Record<EtohPackCode, EtohPackSettings>;
  tiers: Record<EtohTierCode, EtohTierSettings>;
};

export type EtohQuoteLineInput = {
  grade: EtohGradeCode;
  pack: EtohPackCode;
  qty: number;
  /** Charge a refundable deposit for returnable containers (default true). */
  chargeDeposit?: boolean;
  /** Manual override of the unit price (THB ex VAT). Needs quotes.write + audit. */
  unitPriceOverrideThb?: number | null;
};

export type EtohQuoteInput = {
  lines: EtohQuoteLineInput[];
  /** Tier assigned to the customer in CRM. */
  customerTier: EtohTierCode;
  deliveryFeeThb?: number;
  /** Extra header discount in THB applied before VAT. */
  extraDiscountThb?: number;
  vatRate?: number;
};

export type EtohQuoteLine = {
  sku: string;
  label: string;
  grade: EtohGradeCode;
  pack: EtohPackCode;
  qty: number;
  litres: number;
  kg: number;
  unitPriceThb: number;
  pricePerLitreThb: number;
  lineTotalThb: number;
  depositPerUnitThb: number;
  depositTotalThb: number;
  overridden: boolean;
  /** Present only when the price book has a landed cost for the grade. */
  costTotalThb: number | null;
  marginThb: number | null;
  marginPct: number | null;
};

export type EtohQuoteResult = {
  appliedTier: EtohTierCode;
  appliedDiscountPct: number;
  tierReason: string;
  lines: EtohQuoteLine[];
  totalLitres: number;
  totalKg: number;
  goodsThb: number;
  deliveryFeeThb: number;
  extraDiscountThb: number;
  vatBaseThb: number;
  vatThb: number;
  depositThb: number;
  grandTotalThb: number;
  costTotalThb: number | null;
  marginThb: number | null;
  marginPct: number | null;
  warnings: string[];
};

export class EtohPricingError extends Error {}

function toSatang(thb: number): number {
  return Math.round(thb * 100);
}

function toThb(satang: number): number {
  return Math.round(satang) / 100;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function defaultPackSettings(pack: EtohPack): EtohPackSettings {
  return {
    code: pack.code,
    containerCostThb: pack.defaultContainerCostThb,
    depositThb: pack.defaultDepositThb,
    repackCostThb: pack.defaultRepackCostThb,
    smallPackMarkupPct: pack.defaultSmallPackMarkupPct,
    active: true,
  };
}

export function defaultPriceBook(
  basePricePerLitre: Partial<Record<EtohGradeCode, number>> = {},
): EtohPriceBook {
  const packs = {} as Record<EtohPackCode, EtohPackSettings>;
  for (const pack of ETOH_PACKS) packs[pack.code] = defaultPackSettings(pack);
  const tiers = {} as Record<EtohTierCode, EtohTierSettings>;
  for (const tier of ETOH_TIERS) {
    tiers[tier.code] = { code: tier.code, discountPct: tier.defaultDiscountPct };
  }
  return { basePricePerLitre, landedCostPerLitre: {}, packs, tiers };
}

/**
 * Volume discounts always apply: the effective tier is whichever gives the
 * larger discount between the customer's CRM tier and the tier the order
 * volume qualifies for. Dealer / contract tiers are assigned in CRM only
 * unless the volume threshold is reached.
 */
export function resolveTier(
  customerTier: EtohTierCode,
  totalLitres: number,
  book: EtohPriceBook,
): { tier: EtohTierCode; reason: string } {
  let volumeTier: EtohTierCode | null = null;
  for (const tier of ETOH_TIERS) {
    if (tier.autoFromLitres != null && totalLitres >= tier.autoFromLitres) {
      const current = volumeTier ? book.tiers[volumeTier].discountPct : -1;
      if (book.tiers[tier.code].discountPct > current) volumeTier = tier.code;
    }
  }
  const customerPct = book.tiers[customerTier].discountPct;
  if (volumeTier && book.tiers[volumeTier].discountPct > customerPct) {
    return {
      tier: volumeTier,
      reason: `ปริมาณรวม ${totalLitres.toLocaleString("th-TH")} ลิตร ได้ระดับ "${getTier(volumeTier).nameTh}"`,
    };
  }
  return { tier: customerTier, reason: `ระดับราคาลูกค้า "${getTier(customerTier).nameTh}"` };
}

export function computeEtohQuote(input: EtohQuoteInput, book: EtohPriceBook): EtohQuoteResult {
  const vatRate = input.vatRate ?? ETOH_VAT_RATE;
  if (!Array.isArray(input.lines) || input.lines.length === 0) {
    throw new EtohPricingError("ต้องมีอย่างน้อย 1 รายการ");
  }
  if (!(vatRate >= 0 && vatRate < 1)) throw new EtohPricingError("อัตรา VAT ไม่ถูกต้อง");

  const warnings: string[] = [];
  let totalLitres = 0;
  for (const line of input.lines) {
    if (!Number.isInteger(line.qty) || line.qty <= 0) {
      throw new EtohPricingError(`จำนวนต้องเป็นจำนวนเต็มบวก (${skuCode(line.grade, line.pack)})`);
    }
    totalLitres += getPack(line.pack).litres * line.qty;
  }

  const { tier, reason } = resolveTier(input.customerTier, totalLitres, book);
  const discountPct = book.tiers[tier].discountPct;

  let goodsSatang = 0;
  let depositSatang = 0;
  let costSatang = 0;
  let costKnownForAll = true;
  let totalKg = 0;
  const lines: EtohQuoteLine[] = [];

  for (const line of input.lines) {
    const grade = getGrade(line.grade);
    const pack = getPack(line.pack);
    const settings = book.packs[line.pack];
    if (!settings.active) warnings.push(`${pack.nameTh} ปิดการขายอยู่`);
    if (line.pack === "ISO25000" && tier !== "bulk") {
      warnings.push("ISO Tank ควรเจรจาราคาตามต้นทาง (ระดับ Bulk)");
    }

    const litres = pack.litres * line.qty;
    const kg = round2(litres * grade.densityKgPerL);
    totalKg += kg;

    let unitSatang: number;
    let overridden = false;
    if (line.unitPriceOverrideThb != null && Number.isFinite(line.unitPriceOverrideThb)) {
      if (line.unitPriceOverrideThb < 0) throw new EtohPricingError("ราคาต่อหน่วยติดลบไม่ได้");
      unitSatang = toSatang(line.unitPriceOverrideThb);
      overridden = true;
    } else {
      const base = book.basePricePerLitre[line.grade];
      if (base == null || !(base > 0)) {
        throw new EtohPricingError(`ยังไม่ได้ตั้งราคาฐานต่อลิตรของ ${grade.nameTh}`);
      }
      const markup = pack.kind === "oneway" ? settings.smallPackMarkupPct / 100 : 0;
      const productValue = base * pack.litres * (1 - discountPct / 100) * (1 + markup);
      const extras =
        pack.kind === "oneway" ? settings.containerCostThb + settings.repackCostThb : 0;
      unitSatang = toSatang(productValue + extras);
    }

    const lineSatang = unitSatang * line.qty;
    goodsSatang += lineSatang;

    const chargeDeposit = line.chargeDeposit ?? true;
    const depositUnitSatang =
      pack.kind === "returnable" && chargeDeposit ? toSatang(settings.depositThb) : 0;
    depositSatang += depositUnitSatang * line.qty;

    let lineCost: number | null = null;
    const landed = book.landedCostPerLitre[line.grade];
    if (landed != null && landed > 0) {
      const oneWayExtras =
        pack.kind === "oneway" ? settings.containerCostThb + settings.repackCostThb : 0;
      lineCost = toSatang(landed * pack.litres + oneWayExtras) * line.qty;
      costSatang += lineCost;
    } else {
      costKnownForAll = false;
    }

    if (grade.requiresFdaDocs) {
      warnings.push(`${grade.nameTh}: ต้องจ่ายจากล็อตที่มีเอกสาร อย. เท่านั้น`);
    }

    lines.push({
      sku: skuCode(line.grade, line.pack),
      label: skuLabel(line.grade, line.pack),
      grade: line.grade,
      pack: line.pack,
      qty: line.qty,
      litres,
      kg,
      unitPriceThb: toThb(unitSatang),
      pricePerLitreThb: round2(toThb(unitSatang) / pack.litres),
      lineTotalThb: toThb(lineSatang),
      depositPerUnitThb: toThb(depositUnitSatang),
      depositTotalThb: toThb(depositUnitSatang * line.qty),
      overridden,
      costTotalThb: lineCost == null ? null : toThb(lineCost),
      marginThb: lineCost == null ? null : toThb(lineSatang - lineCost),
      marginPct:
        lineCost == null || lineSatang === 0
          ? null
          : round2(((lineSatang - lineCost) / lineSatang) * 100),
    });
  }

  const deliverySatang = toSatang(Math.max(0, input.deliveryFeeThb ?? 0));
  const extraDiscountSatang = toSatang(Math.max(0, input.extraDiscountThb ?? 0));
  if (extraDiscountSatang > goodsSatang + deliverySatang) {
    throw new EtohPricingError("ส่วนลดท้ายบิลมากกว่ายอดสินค้า");
  }
  const vatBaseSatang = goodsSatang + deliverySatang - extraDiscountSatang;
  const vatSatang = Math.round(vatBaseSatang * vatRate);
  const grandSatang = vatBaseSatang + vatSatang + depositSatang;

  const netGoodsSatang = goodsSatang - extraDiscountSatang;
  const hasCost = costKnownForAll && lines.length > 0;
  if (hasCost && netGoodsSatang < costSatang) {
    warnings.push("ราคาขายต่ำกว่าต้นทุนถึงคลัง");
  }

  return {
    appliedTier: tier,
    appliedDiscountPct: discountPct,
    tierReason: reason,
    lines,
    totalLitres,
    totalKg: round2(totalKg),
    goodsThb: toThb(goodsSatang),
    deliveryFeeThb: toThb(deliverySatang),
    extraDiscountThb: toThb(extraDiscountSatang),
    vatBaseThb: toThb(vatBaseSatang),
    vatThb: toThb(vatSatang),
    depositThb: toThb(depositSatang),
    grandTotalThb: toThb(grandSatang),
    costTotalThb: hasCost ? toThb(costSatang) : null,
    marginThb: hasCost ? toThb(netGoodsSatang - costSatang) : null,
    marginPct:
      hasCost && netGoodsSatang > 0
        ? round2(((netGoodsSatang - costSatang) / netGoodsSatang) * 100)
        : null,
    warnings: Array.from(new Set(warnings)),
  };
}

/** Remove cost and margin before sending a quote to a role without factory.read. */
export function stripEtohCost(result: EtohQuoteResult): EtohQuoteResult {
  return {
    ...result,
    costTotalThb: null,
    marginThb: null,
    marginPct: null,
    warnings: result.warnings.filter((w) => !w.includes("ต้นทุน")),
    lines: result.lines.map((line) => ({
      ...line,
      costTotalThb: null,
      marginThb: null,
      marginPct: null,
    })),
  };
}

export type EtohContainerPlan = {
  containers: number;
  drums: number;
  litres: number;
  fillPct: number;
};

/**
 * Import planning helper: how many ISO tanks (and 200 L drum equivalents) cover a
 * litre demand. litresPerContainer is an Ops setting (one ISO tank ≈ 25,000 L).
 */
export function planContainers(litres: number, litresPerContainer = ETOH_DEFAULT_LITRES_PER_CONTAINER): EtohContainerPlan {
  if (!(litresPerContainer > 0)) throw new EtohPricingError("ขนาดตู้ (ลิตร/ตู้) ต้องมากกว่า 0");
  const need = Math.max(0, litres);
  const drums = Math.ceil(need / 200);
  const containers = Math.ceil(need / litresPerContainer);
  const capacity = containers * litresPerContainer;
  return {
    containers,
    drums,
    litres: need,
    fillPct: capacity === 0 ? 0 : round2((need / capacity) * 100),
  };
}
