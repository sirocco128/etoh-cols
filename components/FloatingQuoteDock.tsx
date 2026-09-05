"use client";

import Link from "next/link";
import { MessageCircle, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { isP2QuoteToolsEnabled } from "@/lib/feature-flags";
import { loadBasketFromStorage } from "@/lib/quote-basket";
import { getPublicContact } from "@/lib/public-contact";
import { site } from "@/lib/site";
import { QUOTE_BASKET_FAB, QUOTE_FAB_LABEL } from "@/lib/ux-copy";
import { cn } from "@/lib/utils";

const HIDDEN_PREFIXES = ["/contact", "/privacy", "/terms", "/issues"];

export function FloatingQuoteDock() {
  const pathname = usePathname() || "/";
  const hidden = HIDDEN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const contact = getPublicContact(site);
  const showBasket = isP2QuoteToolsEnabled();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!showBasket) return;
    const sync = () => {
      const basket = loadBasketFromStorage();
      setCount(basket.items.reduce((sum, item) => sum + item.quantity, 0));
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, [showBasket]);

  if (hidden) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed z-30 flex flex-col items-end gap-2",
        "bottom-[10.5rem] right-3 sm:bottom-28 sm:right-4 lg:bottom-24",
      )}
      role="region"
      aria-label="ทางลัดติดต่อ"
    >
      {showBasket ? (
        <Link
          href="/quote-basket"
          className="pointer-events-auto inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-forest/90 px-4 py-2 text-sm font-semibold text-paper shadow-lg backdrop-blur-md transition hover:bg-forest-light"
        >
          <ShoppingBag className="h-4 w-4" aria-hidden />
          {QUOTE_BASKET_FAB} ({count})
        </Link>
      ) : (
        <Link
          href="/contact"
          className="pointer-events-auto inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-forest/90 px-4 py-2 text-sm font-semibold text-paper shadow-lg backdrop-blur-md transition hover:bg-forest-light"
        >
          <ShoppingBag className="h-4 w-4" aria-hidden />
          {QUOTE_FAB_LABEL}
        </Link>
      )}
      {contact.showLine ? (
        <a
          href={site.lineUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto inline-flex min-h-11 items-center gap-2 rounded-full border border-forest/15 bg-paper/90 px-4 py-2 text-sm font-semibold text-forest shadow-lg backdrop-blur-md transition hover:bg-forest-mist dark:border-white/10 dark:bg-forest-light/80 dark:text-paper"
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
          แชท LINE
        </a>
      ) : null}
    </div>
  );
}
