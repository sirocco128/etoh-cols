/**
 * P2 Quote Basket target shapes (runbook §34).
 * Stub persists draft baskets in localStorage only — no server/ERP yet.
 */

export type QuoteBasketStatus = "draft" | "submitted" | "expired";

export type QuoteBasket = {
  id: string;
  /** Stub: opaque client token; production will store hash server-side. */
  publicTokenHash: string;
  status: QuoteBasketStatus;
  currency: "THB";
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  sourceSession: string;
  items: QuoteBasketItem[];
};

export type QuoteBasketItem = {
  id: string;
  basketId: string;
  productSlug: string;
  productName: string;
  variantId?: string;
  quantity: number;
  decorationMethod?: string;
  packagingOption?: string;
  note?: string;
  estimatedUnitMin?: number;
  estimatedUnitMax?: number;
  pricingSnapshotVersion?: string;
};

export type AddQuoteBasketItemInput = {
  productSlug: string;
  productName: string;
  quantity?: number;
  estimatedUnitMin?: number;
  estimatedUnitMax?: number;
  decorationMethod?: string;
  packagingOption?: string;
  note?: string;
  variantId?: string;
};

export type ApproximatePriceSum = {
  min: number;
  max: number;
  hasEstimates: boolean;
};
