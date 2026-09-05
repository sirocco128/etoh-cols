import type { Metadata } from "next";
import {
  articles,
  categories,
  products,
  type SeoFields,
} from "@/lib/data";
import { metadataFromSeo } from "@/lib/seo";
import { normalizeSeoPath } from "@/lib/seo-path";
import { getSeoOverride } from "@/lib/seo-repository";
import {
  IDEA_THEMES,
  ideaThemePath,
} from "@/lib/seo-themes";

export { normalizeSeoPath } from "@/lib/seo-path";

export type SeoPageKind =
  | "static"
  | "theme"
  | "product"
  | "category"
  | "article";

export type CatalogSeoPage = {
  path: string;
  label: string;
  kind: SeoPageKind;
  seo: SeoFields;
  keywords: string[];
};

const INDEXABLE_STATICS: CatalogSeoPage[] = [
  {
    path: "/",
    label: "หน้าแรก",
    kind: "static",
    keywords: ["ของขวัญองค์กร", "gift set", "สกรีนโลโก้", "สั่งผลิตจากจีน"],
    seo: {
      seoTitle: "รับผลิตของขวัญองค์กร สกรีนโลโก้",
      metaDescription:
        "รับผลิต Gift Set และของขวัญองค์กร สกรีนโลโก้ได้ สั่งตามออเดอร์แล้วผลิตจากจีน ขอใบเสนอราคาฟรี ไม่ต้องชำระเงินบนเว็บ ดูช่วงราคาโดยประมาณได้",
      canonicalPath: "/",
      ogImage: "/images/hero-giftset.jpg",
    },
  },
  {
    path: "/premium-giftset",
    label: "ชุดของขวัญองค์กร",
    kind: "static",
    keywords: ["premium gift set", "ของขวัญองค์กรพรีเมียม", "สกรีนโลโก้"],
    seo: {
      seoTitle: "Premium Gift Set องค์กร สกรีนโลโก้",
      metaDescription:
        "รับผลิต Premium Gift Set สำหรับองค์กร กล่องพรีเมียม สกรีนโลโก้ได้ สั่งผลิตตามออเดอร์จากจีน ดูขั้นตอน วัสดุ และขอใบเสนอราคาได้โดยไม่ชำระเงินบนเว็บ",
      canonicalPath: "/premium-giftset",
      ogImage: "/images/hero-giftset.jpg",
    },
  },
  {
    path: "/products",
    label: "สินค้าพรีเมียม",
    kind: "static",
    keywords: ["สินค้าพรีเมียม", "แคตตาล็อก gift set", "สกรีนโลโก้"],
    seo: {
      seoTitle: "สินค้าพรีเมียม สกรีนโลโก้ได้",
      metaDescription:
        "แคตตาล็อก Gift Set พรีเมียม สกรีนโลโก้ได้ สั่งผลิตตามออเดอร์แล้วผลิตจากจีน ไม่ใช่ของพร้อมส่ง ดูช่วงราคาโดยประมาณ แล้วขอใบเสนอราคาเมื่อพร้อม",
      canonicalPath: "/products",
      ogImage: "/images/og-default.jpg",
    },
  },
  {
    path: "/catalog",
    label: "สมุดแคตตาล็อก",
    kind: "static",
    keywords: ["สมุดแคตตาล็อก", "พลิกดูสินค้า", "สกรีนโลโก้"],
    seo: {
      seoTitle: "สมุดแคตตาล็อกของขวัญองค์กร",
      metaDescription:
        "พลิกดูแคตตาล็อกของขวัญองค์กรจากสินค้าบนเว็บ จัดตามกลุ่มเดียวกัน ทุกชิ้นสกรีนโลโก้ใส่ได้ สั่งผลิตตามออเดอร์จากจีน ขอใบเสนอราคาได้โดยไม่ชำระเงินบนเว็บ",
      canonicalPath: "/catalog",
      ogImage: "/images/hero-giftset.jpg",
    },
  },
  {
    path: "/customize-gift-set",
    label: "ออกแบบเซ็ตเอง",
    kind: "static",
    keywords: ["ออกแบบ gift set", "ชุดของขวัญตามโจทย์", "สกรีนโลโก้"],
    seo: {
      seoTitle: "ออกแบบ Gift Set องค์กรตามโจทย์",
      metaDescription:
        "ออกแบบ Gift Set องค์กรตามงบ จำนวน และโลโก้ คัดสินค้า บรรจุภัณฑ์ และการแพ็ก สั่งผลิตจากจีนหลังยืนยันแบบ ขอใบเสนอราคาได้โดยไม่ชำระเงินบนเว็บ",
      canonicalPath: "/customize-gift-set",
      ogImage: "/images/og-default.jpg",
    },
  },
  {
    path: "/about",
    label: "เกี่ยวกับเรา",
    kind: "static",
    keywords: ["บริษัท เทราบิส", "รับผลิตของขวัญองค์กร"],
    seo: {
      seoTitle: "เกี่ยวกับเทราบิส รับผลิตของขวัญองค์กร",
      metaDescription:
        "บริษัท เทราบิส จำกัด รับผลิตของขวัญองค์กรและสินค้าพรีเมียม สกรีนโลโก้ได้ สั่งตามออเดอร์แล้วผลิตจากจีน จัดส่งในไทย ขอใบเสนอราคาได้จากแบบฟอร์ม",
      canonicalPath: "/about",
      ogImage: "/images/about-facility.jpg",
    },
  },
  {
    path: "/portfolio",
    label: "ผลงาน",
    kind: "static",
    keywords: ["ผลงานของขวัญองค์กร", "ตัวอย่าง gift set"],
    seo: {
      seoTitle: "ผลงาน Gift Set องค์กร สกรีนโลโก้",
      metaDescription:
        "ตัวอย่างแนวทางผลิต Gift Set องค์กร สกรีนโลโก้ แพ็กแยกคน และจัดส่งตามจุด สั่งผลิตตามออเดอร์จากจีน ดูผลงานแล้วขอใบเสนอราคาได้โดยไม่ชำระเงินบนเว็บ",
      canonicalPath: "/portfolio",
      ogImage: "/images/portfolio-welcome.jpg",
    },
  },
  {
    path: "/blog",
    label: "บทความ",
    kind: "static",
    keywords: ["บทความของขวัญองค์กร", "คู่มือ gift set"],
    seo: {
      seoTitle: "บทความของขวัญองค์กร สกรีนโลโก้",
      metaDescription:
        "บทความเลือก Gift Set ของขวัญองค์กร ธีมธรรมชาติ วัฒนธรรม ท่องเที่ยว และสุขภาพ สกรีนโลโก้ได้ สั่งผลิตจากจีน อ่านแนวทางแล้วขอใบเสนอราคาได้ทันที",
      canonicalPath: "/blog",
      ogImage: "/images/article-guide.jpg",
    },
  },
  {
    path: "/contact",
    label: "ติดต่อขอใบเสนอราคา",
    kind: "static",
    keywords: ["ขอใบเสนอราคา", "ติดต่อเทราบิส", "สกรีนโลโก้"],
    seo: {
      seoTitle: "ขอใบเสนอราคาของขวัญองค์กร",
      metaDescription:
        "ติดต่อบริษัท เทราบิส จำกัด เพื่อขอใบเสนอราคาของขวัญองค์กร สกรีนโลโก้ได้ สั่งผลิตตามออเดอร์จากจีน แบบฟอร์มไม่มีการชำระเงิน และยังไม่ใช่การยืนยันสั่งซื้อ",
      canonicalPath: "/contact",
      ogImage: "/images/og-default.jpg",
    },
  },
  {
    path: "/ideas",
    label: "ไอเดียชุดของขวัญ",
    kind: "static",
    keywords: ["ไอเดียของขวัญองค์กร", "ธีม gift set"],
    seo: {
      seoTitle: "ไอเดียชุดของขวัญองค์กร 4 ธีม",
      metaDescription:
        "ไอเดียชุดของขวัญองค์กรธีมธรรมชาติ วัฒนธรรม ท่องเที่ยว และสุขภาพ สกรีนโลโก้ได้ สั่งผลิตตามออเดอร์จากจีน เลือกธีมแล้วขอใบเสนอราคาได้โดยไม่ชำระเงินบนเว็บ",
      canonicalPath: "/ideas",
      ogImage: "/images/hero-giftset.jpg",
    },
  },
];

const NOINDEX_STATICS: CatalogSeoPage[] = [
  {
    path: "/privacy",
    label: "นโยบายความเป็นส่วนตัว",
    kind: "static",
    keywords: [],
    seo: {
      seoTitle: "นโยบายความเป็นส่วนตัว",
      metaDescription:
        "นโยบายความเป็นส่วนตัวของเว็บขอใบเสนอราคาของขวัญองค์กร บริษัท เทราบิส จำกัด หน้านี้ไม่เปิดให้เครื่องมือค้นหาเก็บ และยังเป็นแม่แบบจนกฎหมายอนุมัติ",
      canonicalPath: "/privacy",
      noIndex: true,
    },
  },
  {
    path: "/terms",
    label: "ข้อกำหนดการใช้งาน",
    kind: "static",
    keywords: [],
    seo: {
      seoTitle: "ข้อกำหนดการใช้งาน",
      metaDescription:
        "ข้อกำหนดการใช้งานเว็บขอใบเสนอราคาของขวัญองค์กร บริษัท เทราบิส จำกัด หน้านี้ไม่เปิดให้เครื่องมือค้นหาเก็บ และยังเป็นแม่แบบจนกฎหมายอนุมัติเนื้อหา",
      canonicalPath: "/terms",
      noIndex: true,
    },
  },
  {
    path: "/quote-basket",
    label: "ตะกร้าใบเสนอราคา",
    kind: "static",
    keywords: [],
    seo: {
      seoTitle: "ตะกร้าใบเสนอราคา",
      metaDescription:
        "รวบรวมสินค้าหลายรายการก่อนส่งคำขอใบเสนอราคา Gift Set องค์กร หน้านี้เป็นเครื่องมือภายในเส้นทางขอราคา จึงไม่เปิดให้เครื่องมือค้นหาเก็บหน้า",
      canonicalPath: "/quote-basket",
      noIndex: true,
    },
  },
];

function themePages(): CatalogSeoPage[] {
  return IDEA_THEMES.map((theme) => ({
    path: ideaThemePath(theme.slug),
    label: `ไอเดียธีม${theme.name}`,
    kind: "theme" as const,
    keywords: theme.keywords,
    seo: {
      seoTitle: theme.seoTitle,
      metaDescription: theme.metaDescription,
      canonicalPath: ideaThemePath(theme.slug),
      ogImage: theme.heroImage,
      keywords: theme.keywords.join(", "),
    },
  }));
}

function catalogEntityPages(): CatalogSeoPage[] {
  return [
    ...categories.map((category) => ({
      path: category.seo.canonicalPath,
      label: category.name,
      kind: "category" as const,
      keywords: [category.name, "gift set", "สกรีนโลโก้"],
      seo: category.seo,
    })),
    ...products.map((product) => ({
      path: product.seo.canonicalPath,
      label: product.name,
      kind: "product" as const,
      keywords: [product.name, "สกรีนโลโก้", "ของขวัญองค์กร"],
      seo: product.seo,
    })),
    ...articles.map((article) => ({
      path: article.seo.canonicalPath,
      label: article.title,
      kind: "article" as const,
      keywords: [article.title],
      seo: article.seo,
    })),
  ];
}

export function listDefaultSeoPages(): CatalogSeoPage[] {
  return [
    ...INDEXABLE_STATICS,
    ...themePages(),
    ...catalogEntityPages(),
    ...NOINDEX_STATICS,
  ];
}

export function getDefaultSeoPage(path: string): CatalogSeoPage | null {
  const normalized = normalizeSeoPath(path);
  return (
    listDefaultSeoPages().find((page) => page.path === normalized) ?? null
  );
}

export function isAllowedSeoPath(path: string): boolean {
  return getDefaultSeoPage(path) !== null;
}

export function mergeSeoFields(
  base: SeoFields,
  overlay: Partial<SeoFields> | null | undefined,
): SeoFields {
  if (!overlay) return { ...base };
  return {
    seoTitle: overlay.seoTitle?.trim() || base.seoTitle,
    metaDescription: overlay.metaDescription?.trim() || base.metaDescription,
    canonicalPath: base.canonicalPath,
    ogImage: overlay.ogImage?.trim() || base.ogImage,
    noIndex: overlay.noIndex ?? base.noIndex,
    keywords: overlay.keywords?.trim() || base.keywords,
  };
}

/** Merge code/CMS defaults with ops/AI overrides from SQLite. */
export function resolveSeoFields(
  path: string,
  fallback?: SeoFields,
): SeoFields {
  const page = getDefaultSeoPage(path);
  const base = fallback ?? page?.seo;
  if (!base) {
    return {
      seoTitle: "",
      metaDescription: "",
      canonicalPath: normalizeSeoPath(path),
    };
  }
  return mergeSeoFields(base, getSeoOverride(path));
}

export function metadataForPath(
  path: string,
  fallback?: SeoFields,
  options?: { ogType?: "website" | "article" },
): Metadata {
  const page = getDefaultSeoPage(path);
  const seo = resolveSeoFields(path, fallback ?? page?.seo);
  if (!seo.seoTitle) {
    return { title: "ไม่พบหน้า" };
  }
  return metadataFromSeo(seo, {
    ogType: options?.ogType ?? "website",
    fallbackImage: seo.ogImage,
  });
}

export function listResolvedSeoPages(): Array<
  CatalogSeoPage & { source: "default" | "override" }
> {
  return listDefaultSeoPages().map((page) => {
    const overlay = getSeoOverride(page.path);
    return {
      ...page,
      seo: mergeSeoFields(page.seo, overlay),
      keywords: overlay?.keywords
        ? overlay.keywords.split(",").map((part) => part.trim()).filter(Boolean)
        : page.keywords,
      source: overlay ? "override" : "default",
    };
  });
}
