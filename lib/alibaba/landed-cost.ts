/**
 * SmartGift landed cost → public THB priceMin/priceMax (estimates, not quotes).
 */

import {
  cbmFromCm,
  internationalFreightThb,
  selectFreightMode,
  shipmentTotals,
} from "@/lib/alibaba/shipping";
import {
  INLAND_CNY_PER_CBM,
  INLAND_MIN_CNY,
  MARKUP_BANDS,
  SMALL_ORDER_FACTORS,
  SMARTGIFT_FX_CNY_THB,
} from "@/lib/alibaba/rates";
import type {
  AlibabaOffer,
  LandedCostConfig,
  PublicPriceRange,
  UnitLandedBreakdown,
} from "@/lib/alibaba/types";

export function defaultLandedCostConfig(
  overrides: Partial<LandedCostConfig> = {},
): LandedCostConfig {
  return {
    cnyToThb: envNumber("ALIBABA_FX_CNY_THB", SMARTGIFT_FX_CNY_THB),
    densityThresholdKgPerCbm: 400,
    minChargeableCbm: 0.01,
    seaThresholdCbm: 5,
    inlandRateCnyPerCbm: envNumber("ALIBABA_INLAND_CNY_PER_CBM", INLAND_CNY_PER_CBM),
    inlandMinCny: envNumber("ALIBABA_INLAND_MIN_CNY", INLAND_MIN_CNY),
    month: new Date().getMonth() + 1,
    ...overrides,
  };
}

export function smallOrderFactor(qty: number): number {
  const n = Math.max(1, qty);
  const row = SMALL_ORDER_FACTORS.find((item) => n <= item.maxQty);
  return row?.sof ?? 1;
}

export function markupForLandedCost(landedCostThb: number): number {
  const row = MARKUP_BANDS.find((item) => landedCostThb <= item.maxCostThb);
  return row?.markup ?? 2.14;
}

export function computeUnitLanded(
  offer: AlibabaOffer,
  qty: number,
  factoryCny: number,
  config: LandedCostConfig,
): UnitLandedBreakdown | null {
  const unitCbm = cbmFromCm(offer.lengthCm, offer.widthCm, offer.heightCm);
  const totals = shipmentTotals(qty, offer.weightKg, unitCbm);
  if (!totals) return null;

  const origin = offer.origin ?? "guangzhou_shenzhen";
  const category = offer.category ?? "general";
  const mode = selectFreightMode(totals.cbm, config);
  const freight = internationalFreightThb(
    totals.cbm,
    totals.kg,
    origin,
    mode,
    category,
    config,
  );

  const inlandCny =
    offer.inlandFreightCny ??
    Math.max(freight.billedCbm * config.inlandRateCnyPerCbm, config.inlandMinCny);
  const fx = config.cnyToThb;
  const factoryThb = factoryCny * fx;
  const inlandThb = (inlandCny * fx) / qty;
  const freightThb = freight.thb / qty;
  const landedCostThb = factoryThb + inlandThb + freightThb;
  const sof = smallOrderFactor(qty);
  const markup = markupForLandedCost(landedCostThb);
  const sellThb = Math.round(landedCostThb * sof * markup);

  return {
    qty,
    factoryThb,
    inlandThb,
    freightThb,
    landedCostThb,
    sof,
    markup,
    sellThb,
    mode,
    tier: freight.tier,
    shipmentCbm: freight.billedCbm,
    shipmentKg: totals.kg,
  };
}

/**
 * Public band: cheap end = factory min @ bulk + sea when volume allows;
 * high end = factory max @ MOQ (typically truck MEMBER).
 */
export function computePublicPriceRange(
  offer: AlibabaOffer,
  config: LandedCostConfig = defaultLandedCostConfig(),
): PublicPriceRange | null {
  const minOrder = Math.max(1, Math.floor(offer.minOrder || 1));
  const bulkQty = Math.max(minOrder, Math.floor(offer.bulkQty ?? 300));

  const high = computeUnitLanded(offer, minOrder, offer.factoryMaxCny, config);
  const low = computeUnitLanded(offer, bulkQty, offer.factoryMinCny, config);
  if (!high || !low) return null;

  let priceMin = low.sellThb;
  let priceMax = high.sellThb;
  if (priceMax < priceMin) {
    const swap = priceMin;
    priceMin = priceMax;
    priceMax = swap;
  }

  return {
    priceMin,
    priceMax,
    priceRange: `${priceMin}–${priceMax} บาท/ชุด`,
    minOrder,
    currency: "THB",
  };
}

function envNumber(key: string, fallback: number): number {
  const raw = Number(process.env[key]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}
