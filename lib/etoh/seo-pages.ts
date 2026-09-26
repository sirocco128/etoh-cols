/**
 * Default SEO for the Etoh Cols storefront. Titles/descriptions are fitted
 * to the 8–60 / 120–160 character bounds enforced by lib/seo-limits.
 */

import type { SeoFields } from "@/lib/data";
import { clampSeoTitle, fitSeoDescription } from "@/lib/seo-limits";
import { ETOH_END_USES } from "@/lib/etoh/brand";
import { getGrade } from "@/lib/etoh/catalog";
import { ETOH_PRODUCT_FAMILIES } from "@/lib/etoh/storefront";

export type EtohSeoPage = {
  path: string;
  label: string;
  kind: "static" | "product" | "category";
  seo: SeoFields;
  keywords: string[];
};

function page(
  path: string,
  label: string,
  kind: EtohSeoPage["kind"],
  title: string,
  description: string,
  keywords: string[],
  ogImage = "/images/etoh/truck.jpg",
): EtohSeoPage {
  return {
    path,
    label,
    kind,
    keywords,
    seo: {
      seoTitle: clampSeoTitle(title),
      metaDescription: fitSeoDescription(description),
      canonicalPath: path,
      ogImage,
      keywords: keywords.join(", "),
    },
  };
}

const BASE_KEYWORDS = ["เอทานอล", "แอลกอฮอล์อุตสาหกรรม", "Industrial Ethanol", "Etoh Cols"];

export function etohStaticSeoPages(): EtohSeoPage[] {
  return [
    page(
      "/",
      "หน้าแรก",
      "static",
      "Etoh Cols จัดหาเอทานอลอุตสาหกรรม จัดส่งทั่วประเทศ",
      "Etoh Cols ผู้นำเข้าและจัดหาเอทานอลสำหรับผู้ใช้งานจริง Industrial, Denatured, TBA & Bitrex และ Food Grade บรรจุ ISO Tank IBC ถัง 200 ลิตร พร้อม CoA และ SDS จัดส่งทั่วประเทศ",
      [...BASE_KEYWORDS, "เอทานอล 95%", "เอทานอล 200 ลิตร"],
    ),
    page(
      "/products",
      "ผลิตภัณฑ์",
      "static",
      "ผลิตภัณฑ์เอทานอล Industrial Denatured Food Grade",
      "เลือกเอทานอลตามการใช้งาน Industrial Ethanol 95–99.9% Denatured Ethanol TBA & Bitrex และ Food / Registered Grade ผ่าน อย. พร้อมเอกสาร CoA SDS Specification ขอใบเสนอราคาได้ทันที",
      [...BASE_KEYWORDS, "denatured ethanol", "food grade ethanol"],
    ),
    page(
      "/applications",
      "การใช้งาน",
      "static",
      "เอทานอลสำหรับ 9 กลุ่มอุตสาหกรรม | Etoh Cols",
      "เอทานอลสำหรับผลิตภัณฑ์สุขอนามัย เครื่องสำอาง ยา อาหารและสารสกัด หมึกพิมพ์และสี เคมีภัณฑ์ งานทำความสะอาดอุตสาหกรรม ผู้จัดจำหน่าย และเชื้อเพลิง เลือกเกรดที่เหมาะกับงานของคุณ",
      [...BASE_KEYWORDS, "ตัวทำละลาย", "solvent"],
    ),
    page(
      "/packaging",
      "บรรจุภัณฑ์และจัดส่ง",
      "static",
      "บรรจุภัณฑ์เอทานอล ISO Tank IBC ถัง 200 ลิตร",
      "เอทานอลบรรจุ ISO Tank 25,000 ลิตร IBC 1,000 ลิตร ถัง 200 ลิตร ถัง 20 และ 5 ลิตร จัดส่งทุกจังหวัดด้วยรถ Tanker รถบรรทุก และรถกระบะ ปลอดภัย ได้มาตรฐาน ติดตามสถานะได้",
      [...BASE_KEYWORDS, "IBC", "ISO Tank", "ถัง 200 ลิตร"],
    ),
    page(
      "/documents",
      "เอกสาร",
      "static",
      "เอกสาร CoA SDS Specification เอทานอล",
      "ทุกการจัดส่งเอทานอลมาพร้อม CoA ตามล็อต SDS ภาษาไทย และ Specification Sheet เกรดอาหารมีเอกสาร อย. พร้อมทีมให้คำปรึกษาด้านการใช้งาน เทคนิค และความปลอดภัย",
      [...BASE_KEYWORDS, "CoA", "SDS", "Certificate of Analysis"],
    ),
    page(
      "/about",
      "เกี่ยวกับเรา",
      "static",
      "เกี่ยวกับ Etoh Cols ผู้นำเข้าเอทานอล",
      "บริษัท อิโตะ คอลส์ จำกัด ผู้นำเข้าและจัดหาเอทานอลสำหรับอุตสาหกรรมไทย มีคลังสินค้าในประเทศ ขนส่งโดยทีมงานมืออาชีพ คุณภาพสม่ำเสมอพร้อมเอกสารครบทุกล็อต Clean Energy for a Better Tomorrow",
      [...BASE_KEYWORDS, "ผู้นำเข้าเอทานอล"],
    ),
    page(
      "/blog",
      "บทความ",
      "static",
      "บทความเอทานอลและการใช้งานในอุตสาหกรรม",
      "บทความเกี่ยวกับเอทานอล การเลือกเกรดให้เหมาะกับงาน การจัดเก็บและขนส่งอย่างปลอดภัย เอกสารที่ควรขอจากผู้ขาย และการใช้เอทานอลในอุตสาหกรรมไทยจาก Etoh Cols",
      [...BASE_KEYWORDS, "ความรู้เอทานอล"],
    ),
    page(
      "/contact",
      "ขอใบเสนอราคา",
      "static",
      "ขอใบเสนอราคาเอทานอล | Etoh Cols",
      "ขอใบเสนอราคาเอทานอลจาก Etoh Cols แจ้งเกรด ปริมาณ บรรจุภัณฑ์ และจังหวัดที่จัดส่ง ฝ่ายขายติดต่อกลับพร้อมราคาและ Specification โทร อีเมล หรือ LINE ได้ ยังไม่ใช่การยืนยันสั่งซื้อ",
      [...BASE_KEYWORDS, "ราคาเอทานอล", "ขอใบเสนอราคา"],
    ),
  ];
}

export function etohProductSeoPages(): EtohSeoPage[] {
  return ETOH_PRODUCT_FAMILIES.map((f) => {
    const grade = getGrade(f.code);
    return page(
      `/products/${f.slug}`,
      f.title,
      "product",
      `${f.title} ${f.titleTh}`,
      `${f.title} (${f.titleTh}) ${grade.purity} ${grade.suitableFor} บรรจุ ISO Tank IBC ถัง 200 ลิตร และแกลลอน พร้อม CoA SDS Specification จัดส่งทั่วประเทศ ขอใบเสนอราคาจาก Etoh Cols`,
      [...BASE_KEYWORDS, f.title, f.titleTh],
    );
  });
}

export function etohApplicationSeoPages(): EtohSeoPage[] {
  return ETOH_END_USES.map((u) =>
    page(
      `/applications/${u.slug}`,
      u.title,
      "category",
      `เอทานอลสำหรับ${u.title} (${u.titleEn})`,
      `เอทานอลสำหรับ${u.title} ${u.usage} กลุ่มลูกค้า ${u.buyers.slice(0, 3).join(" ")} เลือกเกรดและบรรจุภัณฑ์ที่เหมาะสม พร้อมเอกสาร CoA SDS จาก Etoh Cols`,
      [...BASE_KEYWORDS, u.title, u.titleEn],
      `/images/etoh/use-${u.slug}.jpg`,
    ),
  );
}

export function etohSeoPages(): EtohSeoPage[] {
  return [...etohStaticSeoPages(), ...etohProductSeoPages(), ...etohApplicationSeoPages()];
}
