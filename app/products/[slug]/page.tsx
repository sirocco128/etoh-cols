import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToQuoteButton } from "@/components/AddToQuoteButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { PriceDisclaimer } from "@/components/PriceDisclaimer";
import { QuoteForm } from "@/components/QuoteForm";
import { isP2QuoteToolsEnabled } from "@/lib/feature-flags";
import {
  buildBreadcrumbJsonLd,
  buildProductJsonLd,
} from "@/lib/seo";
import { metadataFromSeo } from "@/lib/metadata";
import { getProductBySlug, getProducts } from "@/lib/strapi";

export const revalidate = 300;
export const dynamicParams = true;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) {
    return { title: "ไม่พบสินค้า" };
  }
  return metadataFromSeo(product.seo, {
    openGraphType: "website",
  });
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const thumbnails = product.images.slice(0, 4);
  const enableP2QuoteTools = isP2QuoteToolsEnabled();
  const breadcrumbs = buildBreadcrumbJsonLd([
    { name: "หน้าแรก", path: "/" },
    { name: "สินค้าพรีเมียม", path: "/products" },
    { name: product.name, path: `/products/${product.slug}` },
  ]);
  const productLd = buildProductJsonLd(product);

  return (
    <>
      <JsonLd data={breadcrumbs} />
      <JsonLd data={productLd} />

      <div className="mx-auto max-w-content px-4 py-10 sm:px-6 sm:py-14">
        <Breadcrumbs
          items={[
            { href: "/products", label: "สินค้าพรีเมียม" },
            { label: product.name },
          ]}
        />

        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          <div>
            <div className="relative aspect-square overflow-hidden rounded-3xl bg-forest-mist">
              <Image
                src={product.images[0] || "/images/product-placeholder.jpg"}
                alt={product.name}
                fill
                priority
                className="object-cover"
                sizes="(max-width:1024px) 100vw, 50vw"
              />
            </div>
            {thumbnails.length > 1 ? (
              <ul className="mt-4 grid grid-cols-4 gap-3">
                {thumbnails.map((src, index) => (
                  <li key={`${src}-${index}`} className="relative aspect-square overflow-hidden rounded-xl bg-forest-mist">
                    <Image
                      src={src}
                      alt={`${product.name} มุมที่ ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="120px"
                    />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div>
            <h1 className="text-3xl font-bold text-forest sm:text-4xl">{product.name}</h1>
            <p className="mt-4 whitespace-pre-line text-ink/80 leading-relaxed">
              {product.description}
            </p>
            <dl className="mt-8 space-y-3 text-sm">
              {product.material ? (
                <div className="flex gap-3 border-b border-forest/10 pb-3">
                  <dt className="w-28 shrink-0 font-semibold text-forest">วัสดุ</dt>
                  <dd className="text-ink/80">{product.material}</dd>
                </div>
              ) : null}
              <div className="flex gap-3 border-b border-forest/10 pb-3">
                <dt className="w-28 shrink-0 font-semibold text-forest">สั่งขั้นต่ำ</dt>
                <dd className="text-ink/80">{product.minOrder} เซ็ต</dd>
              </div>
              <div className="flex gap-3 border-b border-forest/10 pb-3">
                <dt className="w-28 shrink-0 font-semibold text-forest">ราคาโดยประมาณ</dt>
                <dd className="text-ink/80">{product.priceRange || "สอบถามราคา"}</dd>
              </div>
            </dl>
            <PriceDisclaimer className="mt-4" variant="full" />
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="#quote"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-brass px-6 text-sm font-semibold text-forest"
              >
                ขอราคาเซ็ตนี้
              </Link>
              <Link
                href="/products"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest/20 px-6 text-sm font-semibold text-forest"
              >
                ดูเซ็ตอื่น
              </Link>
            </div>
            {enableP2QuoteTools ? (
              <AddToQuoteButton
                productSlug={product.slug}
                productName={product.name}
                priceMin={product.priceMin}
                priceMax={product.priceMax}
              />
            ) : null}
          </div>
        </div>

        <div id="quote" className="mt-16 scroll-mt-28">
          <QuoteForm
            heading={`ขอใบเสนอราคา: ${product.name}`}
            productInterest={product.name}
            productSlug={product.slug}
          />
        </div>
      </div>
    </>
  );
}
