import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EmptyState } from "@/components/EmptyState";
import { JsonLd } from "@/components/JsonLd";
import { PriceDisclaimer } from "@/components/PriceDisclaimer";
import { buildBreadcrumbJsonLd } from "@/lib/seo";
import { metadataFromSeo } from "@/lib/metadata";
import {
  getCategories,
  getCategoryBySlug,
  getProducts,
} from "@/lib/strapi";

export const revalidate = 3600;
export const dynamicParams = true;

type PageProps = {
  params: Promise<{ category: string }>;
};

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((category) => ({ category: category.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category: slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "ไม่พบหมวดหมู่" };
  return metadataFromSeo(category.seo, {
    openGraphType: "website",
  });
}

export default async function GiftsetCategoryPage({ params }: PageProps) {
  const { category: slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const products = (await getProducts()).filter(
    (product) => product.categorySlug === category.slug,
  );

  const breadcrumbs = buildBreadcrumbJsonLd([
    { name: "หน้าแรก", path: "/" },
    { name: "Premium Gift Set", path: "/premium-giftset" },
    { name: category.name, path: `/giftset/${category.slug}` },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbs} />
      <div className="mx-auto max-w-content px-4 py-10 sm:px-6 sm:py-14">
        <Breadcrumbs
          items={[
            { href: "/premium-giftset", label: "Premium Gift Set" },
            { label: category.name },
          ]}
        />

        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div>
            <h1 className="text-3xl font-bold text-forest sm:text-4xl">{category.name}</h1>
            <p className="mt-4 leading-relaxed text-ink/80">{category.description}</p>
            <p className="mt-3 text-sm text-ink/65">
              เลือกเซ็ตด้านล่างเพื่อดูรายละเอียด หรือขอใบเสนอราคาทั้งหมวดได้ทันที
            </p>
            <Link
              href="/contact"
              className="mt-8 inline-flex min-h-11 items-center justify-center rounded-full bg-brass px-6 text-sm font-semibold text-forest"
            >
              ขอใบเสนอราคาหมวดนี้
            </Link>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-forest-mist">
            <Image
              src={category.heroImage}
              alt={category.name}
              fill
              className="object-cover"
              sizes="(max-width:1024px) 100vw, 50vw"
              priority
            />
          </div>
        </div>

        <section className="mt-14">
          <h2 className="text-2xl font-bold text-forest">สินค้าในหมวดนี้</h2>
          <p className="mt-2 text-sm text-ink/65">
            ราคาที่แสดงเป็นช่วงโดยประมาณ — ทีมขายจะยืนยันหลังได้รับรายละเอียด
          </p>
          {products.length === 0 ? (
            <EmptyState
              title="ยังไม่มีสินค้าในหมวดนี้"
              description="แจ้งโจทย์และงบประมาณ ทีมขายจะช่วยออกแบบเซ็ตให้เหมาะกับแคมเปญของคุณ"
              actionHref="/contact"
              actionLabel="ขอคำแนะนำจากทีมขาย"
            />
          ) : (
            <>
              <ul className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <li key={product.slug}>
                  <Link href={`/products/${product.slug}`} className="group block">
                    <div className="relative aspect-square overflow-hidden rounded-2xl bg-forest-mist">
                      <Image
                        src={product.images[0] || "/images/product-placeholder.jpg"}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="(max-width:768px) 100vw, 33vw"
                      />
                    </div>
                    <h3 className="mt-4 font-semibold text-forest group-hover:text-brass">
                      {product.name}
                    </h3>
                    <p className="mt-1 text-sm text-ink/70">
                      ประมาณ {product.priceRange || "สอบถามราคา"} · สั่งขั้นต่ำ{" "}
                      {product.minOrder} เซ็ต
                    </p>
                    <p className="mt-2 text-sm font-medium text-brass">
                      ดูรายละเอียดและขอราคา →
                    </p>
                  </Link>
                </li>
              ))}
              </ul>
              <PriceDisclaimer className="mt-8" />
            </>
          )}
        </section>
      </div>
    </>
  );
}
