import {
  ACCOUNT_HUB_NAV_HINT,
  ACCOUNT_HUB_TITLE,
} from "./ux-copy";

/** Shared primary navigation (desktop + mobile). */
export type NavLinkItem = {
  href: string;
  label: string;
  hint?: string;
};

/**
 * Returning-buyer door on the storefront top bar.
 * Staff console stays off marketing chrome — bookmark `/ops/login` directly.
 */
export const UTILITY_NAV_LINKS: NavLinkItem[] = [
  {
    href: "/account",
    label: ACCOUNT_HUB_TITLE,
    hint: ACCOUNT_HUB_NAV_HINT,
  },
];

/** Staff entry (not shown in public nav/footer). */
export const STAFF_LOGIN_HREF = "/ops/login";

/** First-time buyer destinations — keep short so the quote CTA stays in view. */
export const PRIMARY_NAV_LINKS: NavLinkItem[] = [
  {
    href: "/products",
    label: "ผลิตภัณฑ์",
    hint: "เลือกเกรดเอทานอลแล้วขอราคา",
  },
  { href: "/applications", label: "การใช้งาน", hint: "9 กลุ่มอุตสาหกรรม" },
  { href: "/packaging", label: "บรรจุภัณฑ์และจัดส่ง" },
  { href: "/about", label: "เกี่ยวกับเรา" },
];

/** Secondary destinations under “ดูเพิ่ม”. */
export const MORE_NAV_LINKS: NavLinkItem[] = [
  { href: "/documents", label: "เอกสาร CoA / SDS", hint: "เอกสารที่ส่งพร้อมสินค้า" },
  { href: "/blog", label: "บทความ" },
  { href: "/contact", label: "ติดต่อเรา" },
];

export function withOptionalBasketLink(
  enableP2QuoteTools: boolean,
): NavLinkItem[] {
  if (!enableP2QuoteTools) return [...PRIMARY_NAV_LINKS];
  return [
    ...PRIMARY_NAV_LINKS,
    { href: "/quote-basket", label: "ตะกร้าใบเสนอราคา" },
  ];
}

/** Desktop quote FAB — same href on server HTML and client hydration. */
export function quoteShortcutHref(enableP2QuoteTools: boolean): string {
  return enableP2QuoteTools ? "/quote-basket" : "/contact";
}

export function moreNavLinks(): NavLinkItem[] {
  return [...MORE_NAV_LINKS];
}

/** Active when pathname matches href, or is a nested path (except home). */
export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isMoreNavActive(pathname: string): boolean {
  return MORE_NAV_LINKS.some((link) => isNavActive(pathname, link.href));
}
