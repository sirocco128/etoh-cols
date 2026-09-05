/** Shared primary navigation (desktop + mobile). */
export const PRIMARY_NAV_LINKS = [
  { href: "/premium-giftset", label: "ชุดของขวัญองค์กร" },
  { href: "/products", label: "สินค้าพรีเมียม" },
  { href: "/catalog", label: "สมุดแคตตาล็อก" },
  { href: "/ideas", label: "ไอเดียชุดของขวัญ" },
  { href: "/customize-gift-set", label: "ออกแบบเซ็ตเอง" },
  { href: "/about", label: "เกี่ยวกับเรา" },
  { href: "/portfolio", label: "ผลงาน" },
  { href: "/blog", label: "บทความ" },
] as const;

export type NavLinkItem = { href: string; label: string };

export function withOptionalBasketLink(
  enableP2QuoteTools: boolean,
): NavLinkItem[] {
  if (!enableP2QuoteTools) return [...PRIMARY_NAV_LINKS];
  return [
    ...PRIMARY_NAV_LINKS,
    { href: "/quote-basket", label: "ตะกร้าใบเสนอราคา" },
  ];
}

/** Active when pathname matches href, or is a nested path (except home). */
export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
