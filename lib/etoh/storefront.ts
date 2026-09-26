/**
 * Storefront copy for Etoh Cols. Every claim here comes from the company's
 * own posters (products, packaging, delivery, documents). Do not add
 * certifications, customer names, volumes or delivery times that the company
 * has not confirmed.
 */

import type { EtohGradeCode, EtohPackCode } from "@/lib/etoh/catalog";

export const ETOH_PILLARS = [
  {
    key: "quality",
    title: "Quality Products",
    titleTh: "สินค้าคุณภาพ",
    body: "ความบริสุทธิ์ 95% – 99.9% ความชื้นต่ำ คุณภาพสม่ำเสมอทุกล็อต พร้อม CoA",
  },
  {
    key: "supply",
    title: "Reliable Supply",
    titleTh: "จัดหาได้ต่อเนื่อง",
    body: "นำเข้าโดยตรงและมีคลังสินค้าในประเทศ วางแผนสต็อกให้ลูกค้าที่ใช้ประจำ",
  },
  {
    key: "delivery",
    title: "Nationwide Delivery",
    titleTh: "จัดส่งทั่วประเทศ",
    body: "ขนส่งโดยทีมงานมืออาชีพและพาร์ทเนอร์โลจิสติกส์ รวดเร็ว ปลอดภัย ตรงเวลา",
  },
  {
    key: "users",
    title: "For All End Users",
    titleTh: "สำหรับผู้ใช้งานจริงทุกกลุ่ม",
    body: "ตั้งแต่โรงงานขนาดใหญ่ ผู้ผลิต SME ไปจนถึงร้านเคมีภัณฑ์และผู้ค้าส่ง",
  },
] as const;

export type EtohGradeStory = {
  code: EtohGradeCode;
  slug: string;
  title: string;
  titleTh: string;
  highlights: readonly string[];
  bestFor: string;
  accent: "blue" | "leaf" | "orange" | "rose";
};

/** Four product families shown on the poster (IND95 / IND999 grouped as Industrial). */
export const ETOH_PRODUCT_FAMILIES: readonly EtohGradeStory[] = [
  {
    code: "IND95",
    slug: "industrial-ethanol",
    title: "Industrial Ethanol",
    titleTh: "เอทานอลอุตสาหกรรม",
    highlights: ["Purity 95% – 99.9%", "Low water content", "Consistent quality"],
    bestFor: "งานอุตสาหกรรมทั่วไป",
    accent: "blue",
  },
  {
    code: "DEN",
    slug: "denatured-ethanol",
    title: "Denatured Ethanol",
    titleTh: "เอทานอลผสมสารแต่งกลิ่น",
    highlights: ["Ethanol + Denaturant (TBA & Bitrex)", "เพิ่มความปลอดภัย", "เหมาะกับงานอุตสาหกรรม"],
    bestFor: "งานที่ต้องการความปลอดภัย",
    accent: "leaf",
  },
  {
    code: "TBA",
    slug: "tba-bitrex",
    title: "TBA & Bitrex",
    titleTh: "เอทานอลผสม TBA & Bitrex",
    highlights: ["ตาม Specification ที่ลูกค้าต้องการ", "ใช้ในอุตสาหกรรม", "และการทำความสะอาด"],
    bestFor: "งานเฉพาะทาง",
    accent: "orange",
  },
  {
    code: "FOOD",
    slug: "food-grade",
    title: "Food / Registered Grade",
    titleTh: "เอทานอลเกรดอาหาร (อย.)",
    highlights: ["ผ่านมาตรฐาน อย.", "เหมาะสำหรับอาหาร", "เครื่องดื่ม และเครื่องสำอาง"],
    bestFor: "อุตสาหกรรมอาหารและสินค้าอุปโภคบริโภค",
    accent: "rose",
  },
];

export function findFamilyBySlug(slug: string): EtohGradeStory | undefined {
  return ETOH_PRODUCT_FAMILIES.find((f) => f.slug === slug);
}

export type EtohPackStory = {
  code: EtohPackCode;
  title: string;
  volume: string;
  weight: string;
  forWho: string;
};

/** Packaging options with the approximate weights printed on the poster (density ≈ 0.80 kg/L). */
export const ETOH_PACK_STORIES: readonly EtohPackStory[] = [
  { code: "ISO25000", title: "ISO Tank", volume: "25,000 ลิตร", weight: "≈ 20,000 กก.", forWho: "โรงงานที่ใช้ปริมาณมาก / Bulk" },
  { code: "IBC1000", title: "IBC", volume: "1,000 ลิตร", weight: "≈ 800 กก.", forWho: "โรงงานขนาดกลาง ใช้ต่อเนื่อง" },
  { code: "DRUM200", title: "ถัง 200 ลิตร", volume: "200 ลิตร", weight: "≈ 160 กก.", forWho: "มาตรฐานสำหรับโรงงานและผู้ใช้งานทั่วไป" },
  { code: "GAL20", title: "ถัง 20 ลิตร", volume: "20 ลิตร", weight: "≈ 16 กก.", forWho: "SME ร้านเคมีภัณฑ์ คลินิก" },
  { code: "GAL5", title: "ถัง 5 ลิตร", volume: "5 ลิตร", weight: "≈ 4 กก.", forWho: "ทดลองใช้ / ปริมาณน้อย" },
];

export const ETOH_FLEET = [
  { key: "tanker", image: "/images/etoh/fleet-tanker.jpg", title: "รถบรรทุก Tanker", note: "ปริมาณมาก" },
  { key: "truck-10w", image: "/images/etoh/fleet-truck-10w.jpg", title: "รถบรรทุก 200L / IBC", note: "สำหรับโรงงานและผู้ใช้งานทั่วไป" },
  { key: "truck-6w", image: "/images/etoh/fleet-truck-6w.jpg", title: "รถบรรทุกขนาดกลาง", note: "สำหรับธุรกิจทั่วไป" },
  { key: "pickup", image: "/images/etoh/fleet-pickup.jpg", title: "รถกระบะ / รถ 4 ล้อ", note: "สำหรับปริมาณน้อย" },
] as const;

export const ETOH_DELIVERY_POINTS = [
  "จัดส่งได้ทุกจังหวัด",
  "รองรับทุกปริมาณการสั่งซื้อ",
  "เลือกวิธีการขนส่งที่เหมาะสมกับคุณ",
  "ปลอดภัย ได้มาตรฐาน",
  "ติดตามสถานะการจัดส่งได้",
  "ทีมงานดูแลตั้งแต่ต้นจนถึงปลายทาง",
] as const;

export const ETOH_SUPPORT_POINTS = [
  "ให้คำปรึกษาด้านการใช้งาน",
  "เอกสารครบถ้วน พร้อมใช้งาน",
  "สนับสนุนด้านเทคนิคและความปลอดภัย",
] as const;

export const ETOH_ORDER_STEPS = [
  { title: "แจ้งความต้องการ", body: "บอกเกรด ปริมาณ บรรจุภัณฑ์ และจังหวัดที่จัดส่ง ผ่านฟอร์ม โทร หรือ LINE" },
  { title: "รับใบเสนอราคา", body: "ฝ่ายขายเลือกเกรดที่เหมาะกับงาน แนบ Specification และส่งใบเสนอราคา" },
  { title: "ยืนยันคำสั่งซื้อ", body: "ยืนยันใบเสนอราคา เลือกวันจัดส่ง และเงื่อนไขชำระเงินที่ตกลงกัน" },
  { title: "จัดส่งพร้อมเอกสาร", body: "จัดส่งถึงหน้างานพร้อม CoA / SDS ตามล็อตสินค้า" },
] as const;

export const ETOH_FAQ = [
  {
    q: "ขั้นต่ำในการสั่งซื้อเท่าไร",
    a: "รองรับตั้งแต่ถัง 5 ลิตรไปจนถึง ISO Tank 25,000 ลิตร ราคาต่อลิตรลดลงตามปริมาณและขนาดบรรจุ แจ้งปริมาณที่ใช้ต่อเดือนเพื่อรับราคาที่เหมาะสม",
  },
  {
    q: "มีเอกสารอะไรส่งพร้อมสินค้า",
    a: "ทุกการจัดส่งมี CoA (Certificate of Analysis) ตามล็อต SDS (Safety Data Sheet) และ Specification Sheet เกรดอาหารมีเอกสาร อย. ประกอบ",
  },
  {
    q: "จัดส่งต่างจังหวัดได้ไหม",
    a: "จัดส่งได้ทุกจังหวัดทั่วประเทศ เลือกรถให้เหมาะกับปริมาณ ตั้งแต่รถกระบะจนถึงรถ Tanker",
  },
  {
    q: "ถัง 200 ลิตร / IBC ต้องคืนหรือไม่",
    a: "ถังหมุนเวียนเก็บค่ามัดจำแยกจากค่าสินค้าและคืนเงินเมื่อส่งถังคืน หรือเลือกซื้อขาดพร้อมภาชนะได้ ฝ่ายขายจะแจ้งเงื่อนไขในใบเสนอราคา",
  },
  {
    q: "ไม่แน่ใจว่าควรใช้เกรดไหน",
    a: "แจ้งลักษณะงานหรือผลิตภัณฑ์ที่ผลิต ทีมงานจะแนะนำเกรดและความบริสุทธิ์ที่เหมาะสม พร้อมส่ง Specification ให้ตรวจสอบก่อนสั่งซื้อ",
  },
] as const;

/** Frequency options on the RFQ form. */
export const ETOH_RFQ_FREQUENCIES = [
  { value: "once", label: "ครั้งเดียว / ทดลอง" },
  { value: "monthly", label: "ทุกเดือน" },
  { value: "biweekly", label: "ทุก 2 สัปดาห์" },
  { value: "weekly", label: "ทุกสัปดาห์" },
] as const;

/** Grades shown on each product-family page (Industrial covers 95% and 99.9%). */
export const ETOH_FAMILY_GRADES: Record<string, readonly EtohGradeCode[]> = {
  "industrial-ethanol": ["IND95", "IND999"],
  "denatured-ethanol": ["DEN"],
  "tba-bitrex": ["TBA"],
  "food-grade": ["FOOD"],
};

/** End-use segments each family typically serves (links on product pages). */
export const ETOH_FAMILY_END_USES: Record<string, readonly string[]> = {
  "industrial-ethanol": ["chemical-manufacturing", "printing-coating", "industrial-cleaning", "distribution", "fuel-energy"],
  "denatured-ethanol": ["personal-care", "industrial-cleaning", "printing-coating", "distribution"],
  "tba-bitrex": ["industrial-cleaning", "chemical-manufacturing", "personal-care"],
  "food-grade": ["food-extract", "cosmetics", "pharmaceutical", "personal-care"],
};

/** Recommended family per end use (reverse lookup for application pages). */
export function familiesForEndUse(slug: string): EtohGradeStory[] {
  return ETOH_PRODUCT_FAMILIES.filter((f) => ETOH_FAMILY_END_USES[f.slug]?.includes(slug));
}
