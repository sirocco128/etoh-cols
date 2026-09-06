import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CatalogFilterTabs } from "@/components/CatalogFilterTabs";
import { FadeIn } from "@/components/FadeIn";
import { EmptyState } from "@/components/EmptyState";
import { PriceDisclaimer } from "@/components/PriceDisclaimer";
import { ProductCard } from "@/components/ProductCard";
import { getCategories, getProducts } from "@/lib/strapi";
import { canonicalCategorySlug } from "@/lib/smartgift-products";
import { metadataForPath } from "@/lib/page-seo";
import { CATALOG_PILL, CATALOG_SUBTITLE, FLIP_CATALOG_OPEN } from "@/lib/ux-copy";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return metadataForPath("/products");
}

type ProductsPageProps = {
  searchParams: Promise<{ category?: string | string[]; q?: string | string[] }>;
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const categorySlug = Array.isArray(params.category)
    ? params.category[0]
    : params.category;
  const queryRaw = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = (queryRaw || "").trim().toLowerCase();
  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);
  const hasClearance = products.some((item) => item.isClearance);
  const requestedCategory = categorySlug
    ? canonicalCategorySlug(categorySlug)
    : "";
  const clearanceActive = requestedCategory === "clearance" && hasClearance;
  const activeCategory = clearanceActive
    ? "clearance"
    : requestedCategory &&
        categories.some((item) => item.slug === requestedCategory)
      ? requestedCategory
      : null;
  const visible = products.filter((product) => {
    if (clearanceActive) {
      if (!product.isClearance) return false;
    } else if (activeCategory && product.categorySlug !== activeCategory) {
      return false;
    }
    if (!query) return true;
    const haystack = `${product.name} ${product.description || ""}`.toLowerCase();
    return haystack.includes(query);
  });
  const tabs = hasClearance
    ? [...categories, { slug: "clearance", name: "เคลียร์" }]
    : categories;

  return (
    <div className="bg-premium-mesh">
      <div className="mx-auto max-w-content px-page py-12 sm:py-16">
        <Breadcrumbs items={[{ label: "สินค้าพรีเมียม" }]} />
        <FadeIn className="max-w-2xl">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-brass/30 bg-paper/80 px-3 py-1 text-xs font-medium text-forest shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-forest/60 dark:text-brass-soft">
            <Sparkles className="h-3.5 w-3.5 text-brass" aria-hidden />
            {CATALOG_PILL}
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-forest sm:text-4xl dark:text-paper">
            สินค้าพรีเมียม
          </h1>
          <p className="mt-3 text-base leading-relaxed text-ink/65 dark:text-paper/70">
            {CATALOG_SUBTITLE}
          </p>
          <p className="mt-2 text-sm text-ink/55 dark:text-paper/60">
            หน้านี้เป็นรายการเลือกเซ็ตแล้วขอราคา ไม่ใช่สมุดพลิกดู
          </p>
          <p className="mt-4">
            <Link
              href="/catalog"
              className="inline-flex min-h-11 items-center rounded-full border border-forest/15 bg-paper/80 px-4 text-sm font-medium text-forest shadow-sm backdrop-blur-md transition hover:border-brass/40 dark:border-white/10 dark:bg-forest/50 dark:text-brass-soft"
            >
              {FLIP_CATALOG_OPEN}
            </Link>
          </p>
        </FadeIn>

        <form className="mt-8 flex flex-wrap gap-2" method="get" action="/products">
          {activeCategory ? (
            <input type="hidden" name="category" value={activeCategory} />
          ) : null}
          <label className="sr-only" htmlFor="product-search">
            ค้นหาสินค้า
          </label>
          <input
            id="product-search"
            name="q"
            defaultValue={queryRaw || ""}
            placeholder="ค้นหาชื่อสินค้า"
            className="min-h-11 w-full min-w-0 flex-1 rounded-full border border-forest/15 bg-paper px-4 text-sm sm:min-w-[16rem]"
          />
          <button
            type="submit"
            className="inline-flex min-h-11 items-center rounded-full bg-forest px-5 text-sm font-medium text-paper"
          >
            ค้นหา
          </button>
        </form>

        {tabs.length > 0 ? (
          <CatalogFilterTabs
            categories={tabs}
            activeSlug={activeCategory}
            hrefFor={(slug) => {
              const next = new URLSearchParams();
              if (slug) next.set("category", slug);
              if (query) next.set("q", queryRaw || query);
              const qs = next.toString();
              return qs ? `/products?${qs}` : "/products";
            }}
          />
        ) : null}

        {products.length === 0 ? (
          <EmptyState
            title="ยังไม่มีสินค้าในแคตตาล็อก"
            description="ขณะนี้ยังไม่มีรายการเผยแพร่ ติดต่อทีมขายเพื่อขอคำแนะนำเซ็ตที่เหมาะกับงบและโอกาสของคุณ"
            actionHref="/contact"
            actionLabel="ขอคำแนะนำจากทีมขาย"
          />
        ) : visible.length === 0 ? (
          <EmptyState
            title={query ? "ไม่พบสินค้าที่ตรงคำค้น" : "ยังไม่มีสินค้าในหมวดนี้"}
            description="ลองเปลี่ยนคำค้นหรือหมวด หรือส่งโจทย์ให้ทีมขายแนะนำเซ็ตที่สกรีนโลโก้ได้"
            actionHref="/contact"
            actionLabel="ขอคำแนะนำจากทีมขาย"
          />
        ) : (
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((product) => (
              <li key={product.slug}>
                <ProductCard product={product} heading="h2" />
              </li>
            ))}
          </ul>
        )}
        {visible.length > 0 ? <PriceDisclaimer className="mt-8" /> : null}
      </div>
    </div>
  );
}
