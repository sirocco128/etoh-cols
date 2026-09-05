/**
 * Client-safe Thai address labels and mailing-line formatting.
 * Keep filesystem dataset loading in lib/thai-address.ts.
 */

export function normalizeThaiPlaceName(raw: string): string {
  return String(raw || "")
    .trim()
    .replace(/^จังหวัด/, "")
    .replace(/^อำเภอ/, "")
    .replace(/^เขต/, "")
    .replace(/^ตำบล/, "")
    .replace(/^แขวง/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isBangkokProvince(raw: string): boolean {
  const n = normalizeThaiPlaceName(raw)
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, "");
  return (
    n === "กรุงเทพมหานคร" ||
    n === "กรุงเทพ" ||
    n === "กทม" ||
    n === "bangkok"
  );
}

export function thaiDistrictLabel(province: string): string {
  return isBangkokProvince(province) ? "เขต" : "อำเภอ";
}

export function thaiSubdistrictLabel(province: string): string {
  return isBangkokProvince(province) ? "แขวง" : "ตำบล";
}

export function formatShipToLabel(parts: {
  province?: string;
  district?: string;
  subdistrict?: string;
}): string {
  const province = normalizeThaiPlaceName(parts.province || "");
  const district = normalizeThaiPlaceName(parts.district || "");
  const subdistrict = normalizeThaiPlaceName(parts.subdistrict || "");
  if (isBangkokProvince(province) || (!province && isBangkokProvince(parts.province || ""))) {
    return [
      subdistrict ? `แขวง${subdistrict}` : "",
      district ? `เขต${district}` : "",
      province || parts.province ? "กรุงเทพมหานคร" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }
  return [
    subdistrict ? `ตำบล${subdistrict}` : "",
    district ? `อำเภอ${district}` : "",
    province ? `จังหวัด${province}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function formatThaiMailingAddress(parts: {
  streetAddress?: string;
  province?: string;
  district?: string;
  subdistrict?: string;
  zip?: string;
}): string {
  return [
    String(parts.streetAddress || "").trim(),
    formatShipToLabel(parts),
    String(parts.zip || "").trim(),
  ]
    .filter(Boolean)
    .join(" ");
}
