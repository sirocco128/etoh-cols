"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { site } from "@/lib/site";

const HIDDEN_PREFIXES = ["/contact", "/privacy", "/terms", "/quote-basket"];

/**
 * Sticky mobile CTA bar — quote + LINE.
 * Hidden on contact/legal pages and when the keyboard/form pages need space.
 * Adds safe-area padding; pair with `pb-mobile-cta` on main.
 */
export function MobileStickyCta() {
  const pathname = usePathname() || "/";
  const hidden = HIDDEN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (hidden) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-forest/10 bg-paper/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(20,53,42,0.08)] backdrop-blur lg:hidden"
      role="region"
      aria-label="ทางลัดมือถือ"
    >
      <div className="mx-auto flex max-w-content gap-2">
        <Link
          href="/contact"
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-brass px-4 text-sm font-semibold text-forest transition hover:bg-brass-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
        >
          ขอใบเสนอราคา
        </Link>
        <a
          href={site.lineUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-forest/20 px-4 text-sm font-semibold text-forest transition hover:bg-forest-mist focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
        >
          แชท LINE
        </a>
      </div>
    </div>
  );
}
