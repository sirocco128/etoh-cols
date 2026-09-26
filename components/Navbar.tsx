import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { MobileMenu } from "@/components/MobileMenu";
import { NavLink } from "@/components/NavLink";
import { NavMore } from "@/components/NavMore";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PillarIcon } from "@/components/site/EtohIllustrations";
import { ETOH_TAGLINE_EN } from "@/lib/etoh/brand";
import { withOptionalBasketLink } from "@/lib/nav";
import { getPublicContact } from "@/lib/public-contact";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

export function Navbar({
  enableP2QuoteTools,
}: {
  enableP2QuoteTools: boolean;
}) {
  // Quote basket belonged to the gift catalog; ethanol RFQ lives on /contact.
  void enableP2QuoteTools;
  const links = withOptionalBasketLink(false);
  const contact = getPublicContact(site);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-forest/10 bg-paper/85 pt-[env(safe-area-inset-top)] backdrop-blur-md",
        "dark:border-white/10 dark:bg-[#0b1428]/85",
      )}
    >
      <div className="hidden bg-forest text-white lg:block">
        <div className="mx-auto flex max-w-content items-center justify-between gap-6 px-page py-1.5 text-xs">
          <p className="font-medium tracking-wide text-white/80">
            {ETOH_TAGLINE_EN} · จัดหาเอทานอลสำหรับผู้ใช้งานจริง พร้อมจัดส่งทั่วประเทศ
          </p>
          <div className="flex items-center gap-5">
            {contact.showPhone ? (
              <a href={site.phoneHref} className="inline-flex items-center gap-1.5 hover:text-brass-soft">
                <PillarIcon name="phone" className="h-3.5 w-3.5" />
                {site.phoneDisplay}
              </a>
            ) : null}
            {contact.showEmail ? (
              <a href={`mailto:${site.email}`} className="inline-flex items-center gap-1.5 hover:text-brass-soft">
                <PillarIcon name="mail" className="h-3.5 w-3.5" />
                {site.email}
              </a>
            ) : null}
            {contact.showLine ? (
              <a href={site.lineUrl} target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#06c755] px-2.5 py-0.5 font-semibold text-white hover:opacity-90">
                LINE {site.lineId}
              </a>
            ) : null}
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-content items-center justify-between gap-2 px-page py-3 sm:gap-4">
        <Link
          href="/"
          aria-label={site.name}
          className="shrink-0 rounded-md pr-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
        >
          <BrandLogo />
        </Link>

        <nav className="hidden min-w-0 items-center gap-4 lg:flex xl:gap-7" aria-label="เมนูหลัก">
          {links.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              title={link.hint}
              className="whitespace-nowrap text-[0.95rem] font-medium text-ink/80 transition hover:text-forest-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass dark:text-white/80 dark:hover:text-white"
              activeClassName="text-forest-light underline decoration-brass decoration-2 underline-offset-8 dark:text-white"
            >
              {link.label}
            </NavLink>
          ))}
          <NavMore />
          <ThemeToggle />
          <Link
            href="/contact"
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full bg-brass px-5 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(232,97,26,0.7)] transition hover:bg-brass-soft"
          >
            ขอใบเสนอราคา
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 lg:hidden">
          <ThemeToggle />
          <MobileMenu enableP2QuoteTools={enableP2QuoteTools} />
        </div>
      </div>
    </header>
  );
}
