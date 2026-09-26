import type { Metadata } from "next";
import type { SeoFields } from "@/lib/data";
import { etohSeoPages } from "@/lib/etoh/seo-pages";
import { metadataFromSeo } from "@/lib/seo";
import { normalizeSeoPath } from "@/lib/seo-path";
import { getSeoOverride } from "@/lib/seo-repository";

export { normalizeSeoPath } from "@/lib/seo-path";

export type SeoPageKind =
  | "static"
  | "theme"
  | "product"
  | "category"
  | "article"
  | "portfolio";

export type CatalogSeoPage = {
  path: string;
  label: string;
  kind: SeoPageKind;
  seo: SeoFields;
  keywords: string[];
};

const NOINDEX_STATICS: CatalogSeoPage[] = [
  {
    path: "/privacy",
    label: "นโยบายความเป็นส่วนตัว",
    kind: "static",
    keywords: [],
    seo: {
      seoTitle: "นโยบายความเป็นส่วนตัว",
      metaDescription:
        "นโยบายความเป็นส่วนตัวของ Etoh Cols ในนามบริษัท อิโตะ คอลส์ จำกัด ครอบคลุมข้อมูลที่เก็บ วัตถุประสงค์ สิทธิของเจ้าของข้อมูล และการติดต่อกลับ ไม่เปิดให้ค้นหา",
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
        "ข้อกำหนดการใช้งานเว็บขอใบเสนอราคาของ Etoh Cols ในนามบริษัท อิโตะ คอลส์ จำกัด ครอบคลุมราคาโดยประมาณ มัดจำภาชนะ การจัดส่ง และกฎหมายไทย หน้านี้ไม่เปิดให้ค้นหา",
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
        "รวบรวมสินค้าหลายรายการก่อนส่งคำขอใบเสนอราคาของพรีเมียม หน้านี้เป็นเครื่องมือในเส้นทางขอราคา จึงไม่เปิดให้เครื่องมือค้นหาเก็บหน้านี้",
      canonicalPath: "/quote-basket",
      noIndex: true,
    },
  },
];

export function listDefaultSeoPages(): CatalogSeoPage[] {
  return [...etohSeoPages(), ...NOINDEX_STATICS];
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
