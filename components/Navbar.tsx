import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { MobileMenu } from "@/components/MobileMenu";
import { NavLink } from "@/components/NavLink";
import { isP2QuoteToolsEnabled } from "@/lib/feature-flags";
import { withOptionalBasketLink } from "@/lib/nav";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

export function Navbar() {
  const links = withOptionalBasketLink(isP2QuoteToolsEnabled());

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-forest/10 bg-paper/75 backdrop-blur-md",
        "dark:border-white/10 dark:bg-forest/70",
      )}
    >
      <div className="mx-auto flex max-w-content items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-forest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass dark:text-brass-soft"
        >
          {site.name}
        </Link>

        <nav className="hidden items-center gap-6 lg:flex" aria-label="เมนูหลัก">
          {links.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-ink/80 transition hover:text-forest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass dark:text-paper/80 dark:hover:text-brass-soft"
              activeClassName="text-forest underline decoration-brass decoration-2 underline-offset-8 dark:text-brass-soft"
            >
              {link.label}
            </NavLink>
          ))}
          <ThemeToggle />
          <Button asChild>
            <Link href="/contact">ขอใบเสนอราคา</Link>
          </Button>
        </nav>

        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <MobileMenu enableP2QuoteTools={isP2QuoteToolsEnabled()} />
        </div>
      </div>
    </header>
  );
}
