/**
 * Public catalog image helpers — never invent product photos.
 * Empty or broken URLs fall back to licensed placeholders in /public/images.
 */

export const PRODUCT_IMAGE_FALLBACK = "/images/product-placeholder.jpg";

const CATEGORY_COVER_FALLBACK: Record<string, string> = {
  "tumbler-set": "/images/product-tumbler-set.jpg",
  "eco-giftset": "/images/product-eco-set.jpg",
  "it-set": "/images/product-it-set.jpg",
  "team-building-set": "/images/category-team.jpg",
  "eco-friendly": "/images/product-eco-set.jpg",
  "classic-oriental": "/images/category-team.jpg",
  "novelty-self-care": "/images/product-tumbler-set.jpg",
  "executive-smart-tech": "/images/product-it-set.jpg",
  "gift-set": "/images/product-tumbler-set.jpg",
  drinkware: "/images/product-tumbler-set.jpg",
  technology: "/images/product-it-set.jpg",
  wellness: "/images/product-tumbler-set.jpg",
  office: "/images/category-team.jpg",
  bag: "/images/product-eco-set.jpg",
  eco: "/images/product-eco-set.jpg",
  custom: "/images/product-placeholder.jpg",
};

export function isUsableImageSrc(src: string | null | undefined): boolean {
  const value = String(src || "").trim();
  if (!value) return false;
  if (value === "#" || value === "/" || value === "null" || value === "undefined") {
    return false;
  }
  return true;
}

/** Ops SKU thumbs: real URL or licensed placeholder — never invent a product photo. */
export function skuOpsImageSrc(
  ...candidates: Array<string | null | undefined>
): string {
  for (const src of candidates) {
    if (isUsableImageSrc(src)) return String(src).trim();
  }
  return PRODUCT_IMAGE_FALLBACK;
}

export function productCoverImage(
  images: string[] | null | undefined,
  categorySlug?: string | null,
): string {
  const found = (images || []).find((src) => isUsableImageSrc(src));
  if (found) return found.trim();
  const byCategory = categorySlug ? CATEGORY_COVER_FALLBACK[categorySlug] : undefined;
  return byCategory || PRODUCT_IMAGE_FALLBACK;
}

const SHORT_CATEGORY_TABS: Record<string, string> = {
  "eco-giftset": "เซ็ตรักษ์โลก",
  "it-set": "สายไอที",
  "tumbler-set": "เซ็ตสำนักงาน",
  "team-building-set": "ทริปบริษัท",
  "eco-friendly": "รักษ์โลก",
  "classic-oriental": "ตะวันออก",
  "novelty-self-care": "Wellness",
  "executive-smart-tech": "Smart Tech",
  "gift-set": "ชุดของขวัญ",
  drinkware: "แก้ว/กระบอก",
  technology: "ไอที",
  wellness: "เวลเนส",
  office: "ออฟฟิศ",
  bag: "กระเป๋า/ถุงผ้า",
  eco: "รักษ์โลก",
  custom: "สั่งผลิต",
  clearance: "เคลียร์",
};

export function categoryTabLabel(slug: string, name: string): string {
  return SHORT_CATEGORY_TABS[slug] || name;
}
