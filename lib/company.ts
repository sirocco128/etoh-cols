import { ETOH_PARTNER_POINTS } from "@/lib/etoh/brand";
import { isValidThaiTaxId } from "@/lib/th-billing";

/**
 * Public brand is Etoh Cols (บริษัท อิโตะ คอลส์ จำกัด), an ethanol importer.
 *
 * The DBD tax ID and registered address are NOT known yet. They default to
 * the placeholders below and must be set per deployment with SITE_TAX_ID,
 * SITE_LEGAL_NAME, SITE_STREET_ADDRESS, SITE_ADDRESS_LOCALITY,
 * SITE_ADDRESS_REGION and SITE_POSTAL_CODE. `validate:env` refuses a
 * production (indexing) build while COMPANY_TAX_ID_PLACEHOLDER is in use.
 * Do not invent phone, email, LINE, tax ID, or address values.
 */

export const COMPANY_TAX_ID_PLACEHOLDER = "0000000000000";

export const COMPANY = {
  brandName: "Etoh Cols",
  legalName: "บริษัท อิโตะ คอลส์ จำกัด",
  legalNameEn: "Etoh Cols Co., Ltd.",
  taxId: COMPANY_TAX_ID_PLACEHOLDER,
  registeredOn: "",
  registeredOnTh: "",
  streetAddress: "",
  locality: "",
  region: "กรุงเทพมหานคร",
  postalCode: "",
  countryCode: "TH",
  countryTh: "ประเทศไทย",
  description:
    "ผู้นำเข้าและจัดหาเอทานอลสำหรับอุตสาหกรรม (Industrial, Denatured, TBA & Bitrex, Food Grade) บรรจุ ISO Tank / IBC / ถัง 200 ลิตร / แกลลอน พร้อม CoA และ SDS จัดส่งทั่วประเทศ",
} as const;

export function isPlaceholderTaxId(taxId: string): boolean {
  const v = String(taxId || "").trim();
  return v === COMPANY_TAX_ID_PLACEHOLDER || !isValidThaiTaxId(v);
}

export const COMPANY_SERVICES = ETOH_PARTNER_POINTS;

export function formatRegisteredAddress(parts?: {
  streetAddress?: string;
  locality?: string;
  region?: string;
  postalCode?: string;
}): string {
  const street = parts?.streetAddress || COMPANY.streetAddress;
  const locality = parts?.locality || COMPANY.locality;
  const region = parts?.region || COMPANY.region;
  const postal = parts?.postalCode || COMPANY.postalCode;
  return [street, locality, region, postal].filter(Boolean).join(" ");
}

export function isPlaceholderPhone(display: string, href: string): boolean {
  return /000/.test(display) || /000/.test(href);
}

export function isPlaceholderEmail(email: string): boolean {
  return /@example\.com$/i.test(email);
}

export function isPlaceholderLine(id: string, url: string): boolean {
  return /giftproasia/i.test(id) || /giftproasia/i.test(url);
}

const SCHEMA_DAY_TH: Record<string, string> = {
  Mo: "จันทร์",
  Tu: "อังคาร",
  We: "พุธ",
  Th: "พฤหัสบดี",
  Fr: "ศุกร์",
  Sa: "เสาร์",
  Su: "อาทิตย์",
};

/** Show schema.org hours like Mo-Sa 08:30-17:30 in Thai. Keep the raw value for JSON-LD. */
export function formatOpeningHoursDisplay(raw: string): string {
  const match = raw
    .trim()
    .match(/^([A-Za-z]{2})-([A-Za-z]{2})\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
  if (!match?.[1] || !match[2] || !match[3] || !match[4]) return raw;
  const from = SCHEMA_DAY_TH[match[1]] || match[1];
  const to = SCHEMA_DAY_TH[match[2]] || match[2];
  const clock = (value: string) => value.replace(/^0/, "");
  return `${from}–${to} ${clock(match[3])}–${clock(match[4])} น.`;
}
