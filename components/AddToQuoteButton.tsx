"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { isP2QuoteToolsEnabled } from "@/lib/feature-flags";
import {
  PRICE_ESTIMATE_DISCLAIMER,
  addItem,
  loadBasketFromStorage,
  saveBasketToStorage,
} from "@/lib/quote-basket";

type AddToQuoteButtonProps = {
  productSlug: string;
  productName: string;
  priceMin?: number;
  priceMax?: number;
  /** Override flag for tests; defaults to NEXT_PUBLIC_ENABLE_P2_QUOTE_TOOLS. */
  enabled?: boolean;
};

export function AddToQuoteButton({
  productSlug,
  productName,
  priceMin,
  priceMax,
  enabled = isP2QuoteToolsEnabled(),
}: AddToQuoteButtonProps) {
  const [status, setStatus] = useState<"idle" | "added">("idle");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const onAdd = useCallback(() => {
    const basket = loadBasketFromStorage();
    const next = addItem(basket, {
      productSlug,
      productName,
      quantity: 1,
      estimatedUnitMin: priceMin,
      estimatedUnitMax: priceMax,
    });
    saveBasketToStorage(next);
    setStatus("added");
  }, [productSlug, productName, priceMin, priceMax]);

  if (!enabled) {
    return null;
  }

  if (!mounted) {
    return (
      <button
        type="button"
        disabled
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full border border-forest/20 px-6 text-sm font-semibold text-forest/50"
      >
        เพิ่มเข้าตะกร้าใบเสนอราคา
      </button>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest/25 bg-paper px-6 text-sm font-semibold text-forest transition hover:border-brass hover:bg-forest-mist focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
        >
          {status === "added" ? "เพิ่มแล้ว — เพิ่มอีก" : "เพิ่มเข้าตะกร้าใบเสนอราคา"}
        </button>
        {status === "added" ? (
          <Link
            href="/quote-basket"
            className="text-sm font-medium text-brass underline-offset-2 hover:underline"
          >
            ดูตะกร้าใบเสนอราคา
          </Link>
        ) : null}
      </div>
      <p className="text-xs text-ink/55">{PRICE_ESTIMATE_DISCLAIMER}</p>
    </div>
  );
}
