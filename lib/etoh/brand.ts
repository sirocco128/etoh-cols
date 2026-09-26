/**
 * Etoh Cols public brand copy, taken from the company's own marketing
 * posters (Industrial Ethanol Supply / Etoh Project). Buyer copy stays in
 * Thai. Do not publish unverified client names, volumes, or certifications.
 */

export const ETOH_TAGLINE_EN = "Clean Energy for a Better Tomorrow";

export const ETOH_TAGLINE_TH = "เอทานอล…พลังสะอาด เพื่อทุกโอกาสของธุรกิจไทย";

export const ETOH_PROMISE =
  "จัดหาเอทานอลสำหรับผู้ใช้งานจริง พร้อมจัดส่งทั่วประเทศ";

/** Short value points shown on About / landing pages. */
export const ETOH_PARTNER_POINTS: readonly { title: string; body: string }[] = [
  {
    title: "ผู้นำเข้าโดยตรง",
    body: "คุมคุณภาพและเอกสารได้ทุกล็อต ต้นทุนไม่ผ่านคนกลาง",
  },
  {
    title: "สินค้าครบทุกเกรด",
    body: "Industrial, Denatured, TBA & Bitrex และ Food / Registered Grade",
  },
  {
    title: "บรรจุภัณฑ์ตามปริมาณใช้จริง",
    body: "ตั้งแต่ ISO Tank 25,000 ลิตร IBC 1,000 ลิตร ถัง 200 ลิตร ถึงแกลลอน 5 ลิตร",
  },
  {
    title: "เอกสารครบ พร้อมใช้งาน",
    body: "CoA / SDS / Specification ส่งพร้อมสินค้า เกรดอาหารมีเอกสาร อย.",
  },
  {
    title: "จัดส่งทั่วประเทศ",
    body: "คลังสินค้าในประเทศ ขนส่งโดยทีมงานมืออาชีพและพาร์ทเนอร์โลจิสติกส์",
  },
];

export type EtohEndUse = {
  slug: string;
  no: number;
  title: string;
  titleEn: string;
  buyers: readonly string[];
  usage: string;
  examples: readonly string[];
};

/** The nine end-use segments from the Etoh Project segmentation poster. */
export const ETOH_END_USES: readonly EtohEndUse[] = [
  {
    slug: "personal-care",
    no: 1,
    title: "ผลิตภัณฑ์ดูแลสุขอนามัย",
    titleEn: "Personal Care & Hygiene",
    buyers: ["ผู้ผลิตสเปรย์ล้างมือ", "ผลิตภัณฑ์ทำความสะอาดมือ", "ผลิตภัณฑ์สุขอนามัยอื่น ๆ"],
    usage: "เป็นส่วนประกอบในผลิตภัณฑ์",
    examples: ["Hand Sanitizer", "Wet Wipes", "Hygiene Products"],
  },
  {
    slug: "cosmetics",
    no: 2,
    title: "เครื่องสำอางและน้ำหอม",
    titleEn: "Cosmetics & Fragrance",
    buyers: ["ผู้ผลิตเครื่องสำอาง", "ผู้ผลิตน้ำหอม / Fragrance", "ผู้ผลิตผลิตภัณฑ์ Personal Care"],
    usage: "เป็นตัวทำละลาย (Solvent) หรือส่วนประกอบในผลิตภัณฑ์",
    examples: ["Perfume", "Skincare / Cosmetic", "Personal Care"],
  },
  {
    slug: "pharmaceutical",
    no: 3,
    title: "ยาและสุขภาพ",
    titleEn: "Pharmaceutical & Healthcare",
    buyers: ["โรงงานยา", "โรงพยาบาล / คลินิก", "ห้องแล็บ / มหาวิทยาลัย", "หน่วยงานวิจัย"],
    usage: "กระบวนการผลิต / ทำความสะอาด หรือเป็นส่วนประกอบในผลิตภัณฑ์",
    examples: ["Medicine", "Medical Products", "Laboratory Use"],
  },
  {
    slug: "food-extract",
    no: 4,
    title: "อาหารและสารสกัดธรรมชาติ",
    titleEn: "Food & Natural Extract",
    buyers: ["โรงงานอาหารและเครื่องดื่ม", "ผู้ผลิต Flavor / Fragrance", "ผู้ผลิตสารสกัดสมุนไพร", "ผู้ผลิตผลิตภัณฑ์เสริมอาหาร"],
    usage: "เป็นตัวทำละลายในการสกัด หรือใช้ในกระบวนการผลิต",
    examples: ["Beverages", "Flavor / Extract", "Herbal Products"],
  },
  {
    slug: "printing-coating",
    no: 5,
    title: "หมึกพิมพ์ สี และการเคลือบ",
    titleEn: "Printing & Coating",
    buyers: ["โรงพิมพ์ / ผู้ผลิตหมึกพิมพ์", "ผู้ผลิตสี / Coating", "ผู้ผลิตกาว / Adhesive"],
    usage: "ใช้เป็นตัวทำละลาย (Solvent) ในกระบวนการผลิต",
    examples: ["Printing Ink", "Paint / Coating", "Adhesive"],
  },
  {
    slug: "chemical-manufacturing",
    no: 6,
    title: "เคมีภัณฑ์และอุตสาหกรรมการผลิต",
    titleEn: "Chemical & Manufacturing",
    buyers: ["โรงงานเคมีภัณฑ์", "ผู้ผลิตพลาสติก / Polymer", "ผู้ผลิตสารเคมีอื่น ๆ", "ผู้ผลิตกาว / เรซิน / สารเคลือบผิว"],
    usage: "เป็นวัตถุดิบ (Raw Material) ตัวทำละลาย (Solvent) หรือใช้ในกระบวนการผลิต",
    examples: ["Chemical Products", "Plastic / Polymer", "Resin"],
  },
  {
    slug: "industrial-cleaning",
    no: 7,
    title: "ทำความสะอาดในอุตสาหกรรม",
    titleEn: "Industrial Cleaning",
    buyers: ["โรงงานอุตสาหกรรมทั่วไป", "อิเล็กทรอนิกส์ (Electronics)", "ชิ้นส่วนยานยนต์ (Automotive)", "ผู้ผลิตน้ำยาทำความสะอาด"],
    usage: "ทำความสะอาดเครื่องจักร พื้นผิว และกระบวนการผลิต",
    examples: ["Industrial Cleaner", "Degreasing", "Cleaning Solution"],
  },
  {
    slug: "distribution",
    no: 8,
    title: "ผู้จัดจำหน่ายและร้านเคมีภัณฑ์",
    titleEn: "Distribution & Retail",
    buyers: ["Trader / Distributor", "ร้านเคมีภัณฑ์ (Retailer)", "ร้านค้า Online", "ผู้ค้ารายย่อยในต่างจังหวัด"],
    usage: "ซื้อเพื่อจำหน่ายต่อ",
    examples: ["Chemical Retail", "Online Store", "Reseller"],
  },
  {
    slug: "fuel-energy",
    no: 9,
    title: "เชื้อเพลิงและพลังงาน",
    titleEn: "Fuel / Energy",
    buyers: ["ผู้ผลิตเอทานอลเชื้อเพลิง", "ผู้ค้าน้ำมัน / ผู้ค้าพลังงาน", "กลุ่มพลังงานและสาธารณูปโภค"],
    usage: "ผลิตเชื้อเพลิงเอทานอล (เช่น แก๊สโซฮอล์)",
    examples: ["Gasohol", "Fuel Ethanol"],
  },
];

export function findEndUse(slug: string): EtohEndUse | undefined {
  return ETOH_END_USES.find((item) => item.slug === slug);
}
