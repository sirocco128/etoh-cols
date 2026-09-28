/**
 * Etoh Cols product model: every sellable SKU is one ethanol GRADE packed in
 * one PACKAGING type. Grades and packaging are stable reference data kept in
 * code; prices, container costs, deposits and tier discounts live in SQLite
 * (see lib/etoh/repository.ts) so Ops can change them without a deploy.
 */

export const ETOH_DEFAULT_DENSITY_KG_PER_L = 0.8;

/**
 * Commercial kg ↔ litre factor used in the ethanol trade and on the company's
 * own plan (1 kg = 1.25 L, i.e. 0.80 kg/L). Bulk (ISO) business is priced in
 * THB/kg; the price book stores THB/L, so conversions go through this one
 * constant to keep quotes identical to the sales team's own arithmetic.
 */
export const ETOH_COMMERCIAL_KG_PER_L = 0.8;

export function perKgFromPerLitre(thbPerLitre: number): number {
  return Math.round((thbPerLitre / ETOH_COMMERCIAL_KG_PER_L) * 100) / 100;
}

export function perLitreFromPerKg(thbPerKg: number): number {
  return Math.round(thbPerKg * ETOH_COMMERCIAL_KG_PER_L * 10000) / 10000;
}

/** Default size of one imported ISO tank (≈ 20,000 kg). Ops can override. */
export const ETOH_DEFAULT_LITRES_PER_CONTAINER = 25000;

/**
 * Codes are stable database keys (prices, lots, quotes). IND95 / IND999 are
 * historical code names: they now carry the grades actually imported
 * (96% and 99%). IND75 is the 75% cleaning grade.
 */
export const ETOH_GRADE_CODES = ["IND95", "IND999", "IND75", "DEN", "TBA", "FOOD"] as const;
export type EtohGradeCode = (typeof ETOH_GRADE_CODES)[number];

export type EtohGrade = {
  code: EtohGradeCode;
  nameTh: string;
  nameEn: string;
  purity: string;
  /** Used for kg on delivery notes / weighbridge checks. */
  densityKgPerL: number;
  suitableFor: string;
  /** Documents the buyer usually asks for with this grade. */
  documents: readonly EtohDocumentKind[];
  /** Food / registered grade must ship only from lots with FDA paperwork. */
  requiresFdaDocs: boolean;
};

export const ETOH_DOCUMENT_KINDS = ["COA", "SDS", "SPEC", "FDA"] as const;
export type EtohDocumentKind = (typeof ETOH_DOCUMENT_KINDS)[number];

export const ETOH_DOCUMENT_LABELS: Record<EtohDocumentKind, string> = {
  COA: "CoA (Certificate of Analysis)",
  SDS: "SDS (Safety Data Sheet)",
  SPEC: "Specification Sheet",
  FDA: "เอกสาร อย. (Food Grade)",
};

export const ETOH_GRADES: readonly EtohGrade[] = [
  {
    code: "IND95",
    nameTh: "เอทานอลอุตสาหกรรม 96%",
    nameEn: "Industrial Ethanol 96%",
    purity: "96%",
    densityKgPerL: 0.81,
    suitableFor: "งานอุตสาหกรรมทั่วไป ตัวทำละลาย งานทำความสะอาด",
    documents: ["COA", "SDS", "SPEC"],
    requiresFdaDocs: false,
  },
  {
    code: "IND999",
    nameTh: "เอทานอลอุตสาหกรรม 99%",
    nameEn: "Industrial Ethanol 99%",
    purity: "99%",
    densityKgPerL: 0.79,
    suitableFor: "งานที่ต้องการความชื้นต่ำ อิเล็กทรอนิกส์ เคมีภัณฑ์ ตัวทำละลาย",
    documents: ["COA", "SDS", "SPEC"],
    requiresFdaDocs: false,
  },
  {
    code: "IND75",
    nameTh: "เอทานอลอุตสาหกรรม 75%",
    nameEn: "Industrial Ethanol 75%",
    purity: "75%",
    densityKgPerL: 0.87,
    suitableFor: "น้ำยาทำความสะอาด เช็ดกระจก เช็ดพื้นผิว งานแม่บ้านและอาคาร",
    documents: ["COA", "SDS", "SPEC"],
    requiresFdaDocs: false,
  },
  {
    code: "DEN",
    nameTh: "เอทานอลผสมสารแปลงสภาพ",
    nameEn: "Denatured Ethanol",
    purity: "Ethanol + Denaturant",
    densityKgPerL: ETOH_DEFAULT_DENSITY_KG_PER_L,
    suitableFor: "งานที่ต้องการความปลอดภัย ไม่ใช้บริโภค เหมาะกับงานอุตสาหกรรม",
    documents: ["COA", "SDS", "SPEC"],
    requiresFdaDocs: false,
  },
  {
    code: "TBA",
    nameTh: "เอทานอลผสม TBA & Bitrex",
    nameEn: "TBA & Bitrex Denatured Ethanol",
    purity: "ตาม Specification ลูกค้า",
    densityKgPerL: ETOH_DEFAULT_DENSITY_KG_PER_L,
    suitableFor: "งานเฉพาะทาง อุตสาหกรรมและการทำความสะอาด",
    documents: ["COA", "SDS", "SPEC"],
    requiresFdaDocs: false,
  },
  {
    code: "FOOD",
    nameTh: "เอทานอลเกรดอาหาร (อย.)",
    nameEn: "Food / Registered Grade",
    purity: "ผ่านมาตรฐาน อย.",
    densityKgPerL: 0.81,
    suitableFor: "อุตสาหกรรมอาหาร เครื่องดื่ม เครื่องสำอาง สินค้าอุปโภคบริโภค",
    documents: ["COA", "SDS", "SPEC", "FDA"],
    requiresFdaDocs: true,
  },
];

export const ETOH_PACK_CODES = ["ISO25000", "IBC1000", "DRUM200", "GAL20", "GAL5"] as const;
export type EtohPackCode = (typeof ETOH_PACK_CODES)[number];

/**
 * bulk       — ISO tank / tanker, no container billed to the buyer
 * returnable — IBC / drum, buyer pays a refundable deposit or buys the container
 * oneway     — repacked jerrycan sold with the product
 */
export type EtohPackKind = "bulk" | "returnable" | "oneway";

export type EtohPack = {
  code: EtohPackCode;
  nameTh: string;
  litres: number;
  kind: EtohPackKind;
  /**
   * THB defaults are 0 on purpose: real container, deposit and repack costs
   * are entered by Ops in etoh_pack_settings. Markup % mirrors the business plan.
   */
  defaultContainerCostThb: number;
  defaultDepositThb: number;
  defaultRepackCostThb: number;
  /** Extra retail margin on small packs, percent of product value. */
  defaultSmallPackMarkupPct: number;
};

export const ETOH_PACKS: readonly EtohPack[] = [
  {
    code: "ISO25000",
    nameTh: "ISO Tank ~25,000 ลิตร (≈ 20,000 กก.)",
    litres: 25000,
    kind: "bulk",
    defaultContainerCostThb: 0,
    defaultDepositThb: 0,
    defaultRepackCostThb: 0,
    defaultSmallPackMarkupPct: 0,
  },
  {
    code: "IBC1000",
    nameTh: "IBC 1,000 ลิตร",
    litres: 1000,
    kind: "returnable",
    defaultContainerCostThb: 0,
    defaultDepositThb: 0,
    defaultRepackCostThb: 0,
    defaultSmallPackMarkupPct: 0,
  },
  {
    code: "DRUM200",
    nameTh: "ถัง 200 ลิตร",
    litres: 200,
    kind: "returnable",
    defaultContainerCostThb: 0,
    defaultDepositThb: 0,
    defaultRepackCostThb: 0,
    defaultSmallPackMarkupPct: 0,
  },
  {
    code: "GAL20",
    nameTh: "แกลลอน 20 ลิตร",
    litres: 20,
    kind: "oneway",
    defaultContainerCostThb: 0,
    defaultDepositThb: 0,
    defaultRepackCostThb: 0,
    defaultSmallPackMarkupPct: 20,
  },
  {
    code: "GAL5",
    nameTh: "แกลลอน 5 ลิตร",
    litres: 5,
    kind: "oneway",
    defaultContainerCostThb: 0,
    defaultDepositThb: 0,
    defaultRepackCostThb: 0,
    defaultSmallPackMarkupPct: 30,
  },
];

export const ETOH_TIER_CODES = ["retail", "standard", "volume", "contract", "dealer", "bulk"] as const;
export type EtohTierCode = (typeof ETOH_TIER_CODES)[number];

export type EtohTier = {
  code: EtohTierCode;
  nameTh: string;
  rule: string;
  defaultDiscountPct: number;
  /** Tier applies automatically from this order volume (litres). null = assigned only. */
  autoFromLitres: number | null;
};

export const ETOH_TIERS: readonly EtohTier[] = [
  {
    code: "retail",
    nameTh: "ขายปลีก",
    rule: "แกลลอน 5 / 20 ลิตร",
    defaultDiscountPct: 0,
    autoFromLitres: null,
  },
  {
    code: "standard",
    nameTh: "มาตรฐาน",
    rule: "1–4 ถัง 200 ลิตร",
    defaultDiscountPct: 0,
    autoFromLitres: 200,
  },
  {
    code: "volume",
    nameTh: "ปริมาณ",
    rule: "5–19 ถัง หรือ 1–4 IBC (≥ 1,000 ลิตร)",
    defaultDiscountPct: 2.5,
    autoFromLitres: 1000,
  },
  {
    code: "contract",
    nameTh: "สัญญารายปี",
    rule: "มีสัญญารายปี หรือ ≥ 20 ถัง/เดือน",
    defaultDiscountPct: 5,
    autoFromLitres: 4000,
  },
  {
    code: "dealer",
    nameTh: "ตัวแทนจำหน่าย",
    rule: "ตามเป้าซื้อรายไตรมาส",
    defaultDiscountPct: 6.5,
    autoFromLitres: null,
  },
  {
    code: "bulk",
    nameTh: "Bulk / ISO Tank",
    rule: "ISO Tank 25,000 ลิตร เจรจาตามต้นทาง",
    defaultDiscountPct: 7,
    autoFromLitres: 25000,
  },
];

export function isGradeCode(value: unknown): value is EtohGradeCode {
  return (ETOH_GRADE_CODES as readonly string[]).includes(String(value));
}

export function isPackCode(value: unknown): value is EtohPackCode {
  return (ETOH_PACK_CODES as readonly string[]).includes(String(value));
}

export function isTierCode(value: unknown): value is EtohTierCode {
  return (ETOH_TIER_CODES as readonly string[]).includes(String(value));
}

export function getGrade(code: EtohGradeCode): EtohGrade {
  const grade = ETOH_GRADES.find((g) => g.code === code);
  if (!grade) throw new Error(`Unknown ethanol grade: ${code}`);
  return grade;
}

export function getPack(code: EtohPackCode): EtohPack {
  const pack = ETOH_PACKS.find((p) => p.code === code);
  if (!pack) throw new Error(`Unknown ethanol pack: ${code}`);
  return pack;
}

export function getTier(code: EtohTierCode): EtohTier {
  const tier = ETOH_TIERS.find((t) => t.code === code);
  if (!tier) throw new Error(`Unknown price tier: ${code}`);
  return tier;
}

/** SKU code used in WMS product_key, quotes and NEXTERP sync, e.g. ETH-IND95-DRUM200. */
export function skuCode(grade: EtohGradeCode, pack: EtohPackCode): string {
  return `ETH-${grade}-${pack}`;
}

export function parseSkuCode(
  sku: string,
): { grade: EtohGradeCode; pack: EtohPackCode } | null {
  const match = /^ETH-([A-Z0-9]+)-([A-Z0-9]+)$/.exec(String(sku || "").trim());
  if (!match) return null;
  const [, grade, pack] = match;
  if (!isGradeCode(grade) || !isPackCode(pack)) return null;
  return { grade, pack };
}

export function skuLabel(grade: EtohGradeCode, pack: EtohPackCode): string {
  return `${getGrade(grade).nameTh} · ${getPack(pack).nameTh}`;
}

/** All grade × pack combinations, the full sellable SKU list. */
export function listSkus(): { sku: string; grade: EtohGradeCode; pack: EtohPackCode; label: string }[] {
  const out: { sku: string; grade: EtohGradeCode; pack: EtohPackCode; label: string }[] = [];
  for (const grade of ETOH_GRADES) {
    for (const pack of ETOH_PACKS) {
      out.push({
        sku: skuCode(grade.code, pack.code),
        grade: grade.code,
        pack: pack.code,
        label: skuLabel(grade.code, pack.code),
      });
    }
  }
  return out;
}
