import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MobileMenu } from "@/components/MobileMenu";
import { NavLink } from "@/components/NavLink";
import { NavMore } from "@/components/NavMore";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { isP2QuoteToolsEnabled } from "@/lib/feature-flags";
import { withOptionalBasketLink } from "@/lib/nav";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

export function Navbar() {
  const links = withOptionalBasketLink(isP2QuoteToolsEnabled());

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-forest/10 bg-paper/75 pt-[env(safe-area-inset-top)] backdrop-blur-md",
        "dark:border-white/10 dark:bg-forest/70",
      )}
    >
      <div className="mx-auto flex max-w-content items-center justify-between gap-2 px-page py-2.5 sm:gap-4 sm:py-3">
        <Link
          href="/"
          className="min-w-0 truncate text-base font-bold tracking-tight text-forest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass xs:text-lg dark:text-brass-soft"
        >
          {site.name}
        </Link>

        <nav className="hidden items-center gap-5 xl:gap-6 lg:flex" aria-label="เมนูหลัก">
          {links.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              title={link.hint}
              className="whitespace-nowrap text-sm font-medium text-ink/80 transition hover:text-forest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass dark:text-paper/80 dark:hover:text-brass-soft"
              activeClassName="text-forest underline decoration-brass decoration-2 underline-offset-8 dark:text-brass-soft"
            >
              {link.label}
            </NavLink>
          ))}
          <NavMore />
          <ThemeSwitcher />
          <ThemeToggle />
          <Button asChild>
            <Link href="/contact">ขอใบเสนอราคา</Link>
          </Button>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 lg:hidden">
          <ThemeToggle />
          <ThemeSwitcher compact />
          <MobileMenu enableP2QuoteTools={isP2QuoteToolsEnabled()} />
        </div>
      </div>
    </header>
  );
}
