import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CatalogFilterTabs } from "@/components/CatalogFilterTabs";
import { CatalogFlipbook } from "@/components/CatalogFlipbook";
import { EmptyState } from "@/components/EmptyState";
import { PriceDisclaimer } from "@/components/PriceDisclaimer";
import { buildCatalogBook } from "@/lib/catalog-book";
import { flipHtml5EmbedUrl } from "@/lib/fliphtml5";
import { metadataForPath } from "@/lib/page-seo";
import { getCategories, getProducts } from "@/lib/strapi";
import {
  FLIP_CATALOG_CLOSING_BODY,
  FLIP_CATALOG_CLOSING_TITLE,
  FLIP_CATALOG_LEAD,
  FLIP_CATALOG_NAV,
  FLIP_CATALOG_TITLE,
} from "@/lib/ux-copy";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return metadataForPath("/catalog");
}

export default async function CatalogPage() {
  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);
  const book = buildCatalogBook({
    products,
    categories,
    title: FLIP_CATALOG_TITLE,
    subtitle: FLIP_CATALOG_LEAD,
    closingTitle: FLIP_CATALOG_CLOSING_TITLE,
    closingBody: FLIP_CATALOG_CLOSING_BODY,
  });
  const flipHtml5Url = flipHtml5EmbedUrl(process.env.NEXT_PUBLIC_FLIPHTML5_URL);

  return (
    <div className="bg-premium-mesh">
      <div className="mx-auto max-w-content px-4 py-6 sm:px-6 sm:py-8">
        <Breadcrumbs items={[{ label: FLIP_CATALOG_NAV }]} />
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold tracking-tight text-forest sm:text-3xl dark:text-paper">
            {FLIP_CATALOG_TITLE}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink/65 dark:text-paper/70">
            {FLIP_CATALOG_LEAD} ดูเป็น{" "}
            <Link href="/products" className="font-medium text-forest underline-offset-4 hover:underline">
              สินค้าพรีเมียม
            </Link>{" "}
            เมื่อพร้อมเลือกเซ็ต
          </p>
        </div>

        {categories.length > 0 ? (
          <CatalogFilterTabs
            categories={categories}
            hrefFor={(slug) => (slug ? `/catalog/${slug}` : "/catalog")}
          />
        ) : null}

        {products.length === 0 ? (
          <EmptyState
            title="ยังไม่มีสินค้าในสมุดแคตตาล็อก"
            description="ขณะนี้ยังไม่มีรายการเผยแพร่ ติดต่อทีมขายเพื่อขอคำแนะนำเซ็ตที่สกรีนโลโก้ได้"
            actionHref="/contact"
            actionLabel="ขอคำแนะนำจากทีมขาย"
          />
        ) : (
          <CatalogFlipbook pages={book.pages} flipHtml5Url={flipHtml5Url} />
        )}
        {products.length > 0 ? <PriceDisclaimer className="mt-8" /> : null}
      </div>
    </div>
  );
}
