/** Shared primary navigation (desktop + mobile). */
export type NavLinkItem = {
  href: string;
  label: string;
  hint?: string;
};

export const PRIMARY_NAV_LINKS: NavLinkItem[] = [
  { href: "/premium-giftset", label: "ชุดของขวัญองค์กร" },
  {
    href: "/products",
    label: "สินค้าพรีเมียม",
    hint: "เลือกเซ็ตแล้วขอราคา",
  },
  {
    href: "/catalog",
    label: "สมุดพลิกดู",
    hint: "พลิกดูแคตตาล็อก ไม่ใช่รายการขอราคา",
  },
  { href: "/ideas", label: "ไอเดียชุดของขวัญ" },
  { href: "/customize-gift-set", label: "ออกแบบเซ็ตเอง" },
  { href: "/about", label: "เกี่ยวกับเรา" },
  { href: "/portfolio", label: "ผลงาน" },
  { href: "/blog", label: "บทความ" },
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

/** Active when pathname matches href, or is a nested path (except home). */
export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
