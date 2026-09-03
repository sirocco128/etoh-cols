import Link from "next/link";
import { site } from "@/lib/site";
import { MobileMenu } from "@/components/MobileMenu";
import { NavLink } from "@/components/NavLink";
import { isP2QuoteToolsEnabled } from "@/lib/feature-flags";
import { withOptionalBasketLink } from "@/lib/nav";

export function Navbar() {
  const links = withOptionalBasketLink(isP2QuoteToolsEnabled());

  return (
    <header className="sticky top-0 z-40 border-b border-forest/10 bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-content items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-forest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
        >
          {site.name}
        </Link>

        <nav className="hidden items-center gap-6 lg:flex" aria-label="เมนูหลัก">
          {links.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-ink/80 transition hover:text-forest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
              activeClassName="text-forest underline decoration-brass decoration-2 underline-offset-8"
            >
              {link.label}
            </NavLink>
          ))}
          <Link
            href="/contact"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-brass px-5 text-sm font-semibold text-forest transition hover:bg-brass-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
          >
            ขอใบเสนอราคา
          </Link>
        </nav>

        <MobileMenu enableP2QuoteTools={isP2QuoteToolsEnabled()} />
      </div>
    </header>
  );
}
