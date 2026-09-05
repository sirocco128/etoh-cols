/**
 * Known company facts for บริษัท เทราบิส จำกัด (not catalog/product data).
 * Legal name, tax ID, and registered address come from the FlowAccount export
 * filename and the Department of Business Development record (0105556003873).
 * Do not invent phone, email, or LINE here.
 */

export const COMPANY = {
  brandName: "เทราบิส",
  legalName: "บริษัท เทราบิส จำกัด",
  legalNameEn: "Terabiz Company Limited",
  taxId: "0105556003873",
  registeredOn: "2013-01-09",
  registeredOnTh: "9 มกราคม 2556",
  streetAddress: "50/238 ซอยประชาอุทิศ 72",
  locality: "แขวงทุ่งครุ",
  region: "เขตทุ่งครุ กรุงเทพมหานคร",
  postalCode: "10140",
  countryCode: "TH",
  countryTh: "ประเทศไทย",
  description:
    "รับผลิตของขวัญองค์กรและสินค้าพรีเมียม สกรีนโลโก้ได้ — สั่งตามออเดอร์แล้วผลิตจากจีน ไม่ใช่ร้านค้าพร้อมส่ง",
} as const;

export const COMPANY_SERVICES = [
  {
    title: "รับผลิตตามออเดอร์",
    body: "ลูกค้ายืนยันสเปคและโลโก้ก่อน แล้วจึงสั่งผลิต ไม่ตัดของจากคลังสำเร็จรูป",
  },
  {
    title: "สกรีนโลโก้ใส่ได้",
    body: "สกรีน พิมพ์ UV เลเซอร์ หรือปัก ตามวัสดุของชิ้นงาน",
  },
  {
    title: "ผลิตจากจีน จัดส่งไทย",
    body: "หลังอนุมัติแบบ สั่งโรงงาน แล้วขนส่งเข้าไทย ตรวจคุณภาพและแพ็กตามจุดส่ง",
  },
  {
    title: "ขอใบเสนอราคา",
    body: "ติดต่อผ่านแบบฟอร์มโดยยังไม่ชำระเงิน หลังอนุมัติราคาแล้วจึงวางบิลมัดจำหรือเต็มจำนวนผ่านพร้อมเพย์ และออกใบกำกับภาษีในนามบริษัท",
  },
] as const;

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
