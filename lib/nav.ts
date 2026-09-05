/** Shared primary navigation (desktop + mobile). */
export type NavLinkItem = {
  href: string;
  label: string;
  hint?: string;
};

/** First-time buyer destinations — keep short so the quote CTA stays in view. */
export const PRIMARY_NAV_LINKS: NavLinkItem[] = [
  { href: "/premium-giftset", label: "ชุดของขวัญองค์กร" },
  {
    href: "/products",
    label: "สินค้าพรีเมียม",
    hint: "เลือกเซ็ตแล้วขอราคา",
  },
  { href: "/about", label: "เกี่ยวกับเรา" },
  { href: "/blog", label: "บทความ" },
];

/** Browse/inspiration — parked under “ดูเพิ่ม” so primary chrome stays scannable. */
export const MORE_NAV_LINKS: NavLinkItem[] = [
  {
    href: "/catalog",
    label: "สมุดพลิกดู",
    hint: "พลิกดูแคตตาล็อก ไม่ใช่รายการขอราคา",
  },
  { href: "/ideas", label: "ไอเดียชุดของขวัญ" },
  { href: "/customize-gift-set", label: "ออกแบบเซ็ตเอง" },
  { href: "/portfolio", label: "ผลงาน" },
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
