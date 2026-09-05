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
import { metadataForPath } from "@/lib/page-seo";
import { CATALOG_PILL, CATALOG_SUBTITLE, FLIP_CATALOG_OPEN } from "@/lib/ux-copy";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return metadataForPath("/products");
}

type ProductsPageProps = {
  searchParams: Promise<{ category?: string | string[] }>;
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const categorySlug = Array.isArray(params.category)
    ? params.category[0]
    : params.category;
  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);
  const activeCategory =
    categorySlug && categories.some((item) => item.slug === categorySlug)
      ? categorySlug
      : null;
  const visible = activeCategory
    ? products.filter((product) => product.categorySlug === activeCategory)
    : products;

  return (
    <div className="bg-premium-mesh">
      <div className="mx-auto max-w-content px-4 py-12 sm:px-6 sm:py-16">
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
          <p className="mt-4">
            <Link
              href="/catalog"
              className="inline-flex min-h-11 items-center rounded-full border border-forest/15 bg-paper/80 px-4 text-sm font-medium text-forest shadow-sm backdrop-blur-md transition hover:border-brass/40 dark:border-white/10 dark:bg-forest/50 dark:text-brass-soft"
            >
              {FLIP_CATALOG_OPEN}
            </Link>
          </p>
        </FadeIn>

        {categories.length > 0 ? (
          <CatalogFilterTabs categories={categories} activeSlug={activeCategory} />
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
            title="ยังไม่มีสินค้าในหมวดนี้"
            description="ลองดูหมวดอื่น หรือส่งโจทย์ให้ทีมขายแนะนำเซ็ตที่สกรีนโลโก้ได้"
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
