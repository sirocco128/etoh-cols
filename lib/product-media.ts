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
};

export function isUsableImageSrc(src: string | null | undefined): boolean {
  const value = String(src || "").trim();
  if (!value) return false;
  if (value === "#" || value === "/" || value === "null" || value === "undefined") {
    return false;
  }
  return true;
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
};

export function categoryTabLabel(slug: string, name: string): string {
  return SHORT_CATEGORY_TABS[slug] || name;
}
