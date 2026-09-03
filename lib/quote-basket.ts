/**
 * Client-safe Quote Basket helpers (P2 stub).
 * Persist draft baskets to localStorage only.
 * Approximate totals use product priceMin/Max — estimates, not quotes.
 */

import type {
  AddQuoteBasketItemInput,
  ApproximatePriceSum,
  QuoteBasket,
  QuoteBasketItem,
} from "@/lib/quote-basket-types";

export const QUOTE_BASKET_STORAGE_KEY = "giftpro:quote-basket:v1";

/** Clear disclaimer shown near any approximate price UI. */
export const PRICE_ESTIMATE_DISCLAIMER =
  "ราคาที่แสดงเป็นค่าประมาณจากช่วงราคาสินค้าเท่านั้น ไม่ใช่ใบเสนอราคาจริง และไม่รวมค่าตกแต่ง บรรจุภัณฑ์ หรือค่าขนส่ง เมื่อกดส่งคำขอ ระบบจะพาไปแบบฟอร์มขอใบเสนอราคาพร้อมสรุปรายการในตะกร้า";

const BASKET_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

function randomId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function generateBasketId(): string {
  return randomId("qb");
}

function generateItemId(): string {
  return randomId("qbi");
}

function generateSessionId(): string {
  return randomId("sess");
}

function nowIso(): string {
  return new Date().toISOString();
}

export function createEmptyBasket(): QuoteBasket {
  const createdAt = nowIso();
  const id = generateBasketId();
  return {
    id,
    publicTokenHash: randomId("tok"),
    status: "draft",
    currency: "THB",
    createdAt,
    updatedAt: createdAt,
    expiresAt: new Date(Date.now() + BASKET_TTL_MS).toISOString(),
    sourceSession: generateSessionId(),
    items: [],
  };
}

export function addItem(
  basket: QuoteBasket,
  input: AddQuoteBasketItemInput,
): QuoteBasket {
  const quantity = Math.max(1, Math.floor(input.quantity ?? 1));
  const existing = basket.items.find(
    (item) =>
      item.productSlug === input.productSlug &&
      (item.variantId ?? "") === (input.variantId ?? ""),
  );

  let items: QuoteBasketItem[];
  if (existing) {
    items = basket.items.map((item) =>
      item.id === existing.id
        ? {
            ...item,
            quantity: item.quantity + quantity,
            estimatedUnitMin: input.estimatedUnitMin ?? item.estimatedUnitMin,
            estimatedUnitMax: input.estimatedUnitMax ?? item.estimatedUnitMax,
            decorationMethod: input.decorationMethod ?? item.decorationMethod,
            packagingOption: input.packagingOption ?? item.packagingOption,
            note: input.note ?? item.note,
            productName: input.productName || item.productName,
          }
        : item,
    );
  } else {
    const item: QuoteBasketItem = {
      id: generateItemId(),
      basketId: basket.id,
      productSlug: input.productSlug,
      productName: input.productName,
      variantId: input.variantId,
      quantity,
      decorationMethod: input.decorationMethod,
      packagingOption: input.packagingOption,
      note: input.note,
      estimatedUnitMin: input.estimatedUnitMin,
      estimatedUnitMax: input.estimatedUnitMax,
      pricingSnapshotVersion: "stub-v1",
    };
    items = [...basket.items, item];
  }

  return {
    ...basket,
    items,
    updatedAt: nowIso(),
    status: "draft",
  };
}

export function removeItem(basket: QuoteBasket, itemId: string): QuoteBasket {
  return {
    ...basket,
    items: basket.items.filter((item) => item.id !== itemId),
    updatedAt: nowIso(),
  };
}

export function updateQuantity(
  basket: QuoteBasket,
  itemId: string,
  quantity: number,
): QuoteBasket {
  const nextQty = Math.max(1, Math.floor(quantity));
  return {
    ...basket,
    items: basket.items.map((item) =>
      item.id === itemId ? { ...item, quantity: nextQty } : item,
    ),
    updatedAt: nowIso(),
  };
}

export function updateItemFields(
  basket: QuoteBasket,
  itemId: string,
  patch: Partial<
    Pick<QuoteBasketItem, "note" | "decorationMethod" | "packagingOption">
  >,
): QuoteBasket {
  return {
    ...basket,
    items: basket.items.map((item) =>
      item.id === itemId ? { ...item, ...patch } : item,
    ),
    updatedAt: nowIso(),
  };
}

/**
 * Sum approximate line totals from estimatedUnitMin/Max × quantity.
 * Missing estimates are skipped; hasEstimates is false if none present.
 */
export function approximatePriceSum(basket: QuoteBasket): ApproximatePriceSum {
  let min = 0;
  let max = 0;
  let hasEstimates = false;

  for (const item of basket.items) {
    if (
      typeof item.estimatedUnitMin === "number" &&
      typeof item.estimatedUnitMax === "number" &&
      Number.isFinite(item.estimatedUnitMin) &&
      Number.isFinite(item.estimatedUnitMax)
    ) {
      hasEstimates = true;
      min += item.estimatedUnitMin * item.quantity;
      max += item.estimatedUnitMax * item.quantity;
    }
  }

  return { min, max, hasEstimates };
}

export function formatBahtRange(min: number, max: number): string {
  const fmt = new Intl.NumberFormat("th-TH");
  if (min === max) return `${fmt.format(min)} บาท`;
  return `${fmt.format(min)}–${fmt.format(max)} บาท`;
}

function isQuoteBasket(value: unknown): value is QuoteBasket {
  if (!value || typeof value !== "object") return false;
  const candidate = value as QuoteBasket;
  return (
    typeof candidate.id === "string" &&
    Array.isArray(candidate.items) &&
    candidate.currency === "THB"
  );
}

export function loadBasketFromStorage(): QuoteBasket {
  if (typeof window === "undefined") {
    return createEmptyBasket();
  }
  try {
    const raw = window.localStorage.getItem(QUOTE_BASKET_STORAGE_KEY);
    if (!raw) return createEmptyBasket();
    const parsed: unknown = JSON.parse(raw);
    if (!isQuoteBasket(parsed)) return createEmptyBasket();
    if (parsed.expiresAt && Date.parse(parsed.expiresAt) < Date.now()) {
      window.localStorage.removeItem(QUOTE_BASKET_STORAGE_KEY);
      return createEmptyBasket();
    }
    return parsed;
  } catch {
    return createEmptyBasket();
  }
}

export function saveBasketToStorage(basket: QuoteBasket): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(QUOTE_BASKET_STORAGE_KEY, JSON.stringify(basket));
  } catch {
    // Quota / private mode — ignore; UI still works in-memory for the session.
  }
}

export function clearBasketStorage(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(QUOTE_BASKET_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Build /contact href with a human-readable basket summary for RFQ notes. */
export function buildContactHrefFromBasket(basket: QuoteBasket): string {
  const lines = [
    `[ตะกร้าใบเสนอราคา] รหัส: ${basket.id}`,
    ...basket.items.map(
      (item, index) =>
        `${index + 1}. ${item.productName} (/${item.productSlug}) × ${item.quantity}` +
        (item.decorationMethod ? ` | ตกแต่ง: ${item.decorationMethod}` : "") +
        (item.note ? ` | โน้ต: ${item.note}` : ""),
    ),
  ];
  const note = lines.join("\n");
  const first = basket.items[0];
  const params = new URLSearchParams({
    source: "quote-basket",
    basketId: basket.id,
    note,
  });
  if (first) {
    params.set("productInterest", first.productName);
    params.set("productSlug", first.productSlug);
    params.set("quantity", String(first.quantity));
    if (first.decorationMethod) {
      params.set("decorationMethod", first.decorationMethod);
    }
  }
  return `/contact?${params.toString()}`;
}
