import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { PillarIcon } from "@/components/site/EtohIllustrations";
import { formatOpeningHoursDisplay, formatRegisteredAddress, isPlaceholderTaxId } from "@/lib/company";
import { ETOH_TAGLINE_TH } from "@/lib/etoh/brand";
import { ETOH_PRODUCT_FAMILIES } from "@/lib/etoh/storefront";
import { getPublicContact } from "@/lib/public-contact";
import { site } from "@/lib/site";

const COMPANY_LINKS = [
  { href: "/applications", label: "การใช้งานตามอุตสาหกรรม" },
  { href: "/packaging", label: "บรรจุภัณฑ์และการจัดส่ง" },
  { href: "/documents", label: "เอกสาร CoA / SDS / Spec" },
  { href: "/about", label: "เกี่ยวกับเรา" },
  { href: "/blog", label: "บทความ" },
  { href: "/contact", label: "ขอใบเสนอราคา" },
] as const;

const INFO_LINKS = [
  { href: "/privacy", label: "นโยบายความเป็นส่วนตัว" },
  { href: "/terms", label: "ข้อกำหนดการใช้งาน" },
] as const;

export function Footer() {
  const year = new Date().getFullYear();
  const contact = getPublicContact(site);
  const address = formatRegisteredAddress({
    streetAddress: site.localBusiness.streetAddress,
    locality: site.localBusiness.locality,
    region: site.localBusiness.region,
    postalCode: site.localBusiness.postalCode,
  }).trim();
  const hours = formatOpeningHoursDisplay(site.localBusiness.openingHours);
  const hasStreet = Boolean(site.localBusiness.streetAddress.trim());

  return (
    <footer className="mt-auto bg-[#071d49] text-white">
      <div className="mx-auto grid max-w-content gap-10 px-page py-12 sm:py-14 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
        <div>
          <BrandLogo tone="inverse" />
          <p className="mt-4 text-sm leading-relaxed text-white/75">{site.description}</p>
          <p className="mt-4 font-display text-lg italic text-[#8fb8ff]">“{ETOH_TAGLINE_TH}”</p>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brass-soft">ผลิตภัณฑ์</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {ETOH_PRODUCT_FAMILIES.map((f) => (
              <li key={f.slug}>
                <Link href={`/products/${f.slug}`} className="text-white/80 transition hover:text-white">
                  {f.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brass-soft">บริษัท</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {COMPANY_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-white/80 transition hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brass-soft">ติดต่อเรา</p>
          <p className="mt-4 text-sm font-semibold">{site.legalName}</p>
          <p className="text-xs text-white/60">{site.name} Co., Ltd.</p>
          <ul className="mt-4 space-y-3 text-sm text-white/85">
            {contact.showPhone ? (
              <li>
                <a href={site.phoneHref} className="inline-flex items-center gap-2 hover:text-white">
                  <PillarIcon name="phone" className="h-4 w-4 text-brass-soft" />
                  {site.phoneDisplay}
                </a>
              </li>
            ) : null}
            {contact.showEmail ? (
              <li>
                <a href={`mailto:${site.email}`} className="inline-flex items-center gap-2 hover:text-white">
                  <PillarIcon name="mail" className="h-4 w-4 text-brass-soft" />
                  {site.email}
                </a>
              </li>
            ) : null}
            {contact.showLine ? (
              <li>
                <a href={site.lineUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#06c755] px-3 py-1 text-xs font-semibold text-white hover:opacity-90">
                  LINE OA {site.lineId}
                </a>
              </li>
            ) : null}
            {hasStreet ? (
              <li className="flex gap-2 text-white/70">
                <PillarIcon name="pin" className="mt-0.5 h-4 w-4 shrink-0 text-brass-soft" />
                {address}
              </li>
            ) : null}
            {hours ? <li className="text-white/60">เวลาทำการ {hours}</li> : null}
            {!isPlaceholderTaxId(site.taxId) ? (
              <li className="text-xs text-white/50">เลขประจำตัวผู้เสียภาษี {site.taxId}</li>
            ) : null}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-3 px-page py-5 text-xs text-white/55">
          <p>
            © {year} {site.name} Co., Ltd. · Industrial Ethanol Supply for All End Users in Thailand
          </p>
          <ul className="flex gap-4">
            {INFO_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
