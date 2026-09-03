import Link from "next/link";
import { site } from "@/lib/site";

const SERVICE_LINKS = [
  { href: "/premium-giftset", label: "Premium Gift Set" },
  { href: "/products", label: "สินค้าพรีเมียม" },
  { href: "/customize-gift-set", label: "ออกแบบเซ็ตเอง" },
  { href: "/portfolio", label: "ผลงาน" },
  { href: "/blog", label: "บทความ" },
  { href: "/contact", label: "ติดต่อขอใบเสนอราคา" },
] as const;

const INFO_LINKS = [
  { href: "/privacy", label: "นโยบายความเป็นส่วนตัว" },
  { href: "/terms", label: "ข้อกำหนดการใช้งาน" },
] as const;

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-forest/10 bg-forest text-paper">
      <div className="mx-auto grid max-w-content gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <p className="text-xl font-bold text-brass-soft">{site.name}</p>
          <p className="mt-3 text-sm leading-relaxed text-paper/80">
            {site.description}
          </p>
          {site.legalName ? (
            <p className="mt-4 text-xs text-paper/60">นิติบุคคล: {site.legalName}</p>
          ) : null}
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brass-soft">
            บริการ
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {SERVICE_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-paper/85 hover:text-brass-soft">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brass-soft">
            ติดต่อ
          </p>
          <ul className="mt-4 space-y-2 text-sm text-paper/85">
            <li>
              <a href={site.phoneHref} className="hover:text-brass-soft">
                โทร {site.phoneDisplay}
              </a>
            </li>
            <li>
              <a href={`mailto:${site.email}`} className="hover:text-brass-soft">
                {site.email}
              </a>
            </li>
            <li>
              <a
                href={site.lineUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-brass-soft"
              >
                LINE OA {site.lineId}
              </a>
            </li>
            {site.localBusiness.streetAddress ? (
              <li className="pt-2 text-paper/70">
                {[
                  site.localBusiness.streetAddress,
                  site.localBusiness.locality,
                  site.localBusiness.region,
                  site.localBusiness.postalCode,
                ]
                  .filter(Boolean)
                  .join(" ")}
              </li>
            ) : null}
            {site.localBusiness.openingHours ? (
              <li className="text-paper/70">
                เวลาทำการ: {site.localBusiness.openingHours}
              </li>
            ) : null}
          </ul>
          <ul className="mt-6 space-y-2 text-sm">
            {INFO_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-paper/85 hover:text-brass-soft">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-paper/10 py-4 text-center text-xs text-paper/55">
        © {year} {site.legalName || site.name}. สงวนลิขสิทธิ์.
      </div>
    </footer>
  );
}
