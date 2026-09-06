import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogSkeleton } from "@/components/CatalogSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { JsonLd } from "@/components/JsonLd";
import { ProductCard } from "@/components/ProductCard";
import { PriceDisclaimer } from "@/components/PriceDisclaimer";
import { ProcessSteps } from "@/components/ProcessSteps";
import { metadataForPath } from "@/lib/page-seo";
import { getPublicContact } from "@/lib/public-contact";
import { buildWebSiteJsonLd } from "@/lib/seo";
import { IDEA_THEMES, ideaThemePath } from "@/lib/seo-themes";
import { getPublicCatalog } from "@/lib/strapi";
import { site } from "@/lib/site";
import {
  CATALOG_EMPTY_BODY,
  CATALOG_EMPTY_TITLE,
  CATALOG_UNAVAILABLE_BODY,
  CATALOG_UNAVAILABLE_TITLE,
} from "@/lib/ux-copy";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForPath("/");
}

export default function HomePage() {
  const contact = getPublicContact(site);

  return (
    <>
      <JsonLd data={buildWebSiteJsonLd()} />
      <section className="relative isolate min-h-[min(100svh,34rem)] overflow-hidden bg-forest text-paper">
        <Image
          src="/images/hero-giftset.jpg"
          alt="ชุดของขวัญองค์กรพรีเมียมในกล่องบรรจุภัณฑ์สีเข้ม"
          fill
          priority
          className="object-cover opacity-40"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-forest via-forest/85 to-forest/40" />
        <div className="relative mx-auto flex min-h-[min(100svh,34rem)] max-w-content flex-col justify-end px-page pb-[calc(6.75rem+env(safe-area-inset-bottom,0px))] pt-28 lg:pb-20">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-brass/25 bg-paper/15 px-3 py-1 text-xs font-medium text-brass-soft backdrop-blur-md">
            สินค้าพรีเมียม นำเข้าสั่งผลิตตามออเดอร์
          </p>
          <p className="mt-4 text-sm font-semibold tracking-[0.18em] text-brass-soft sm:text-base">
            {site.name}
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-fluid-2xl font-bold leading-tight tracking-tight">
            รับผลิต Gift Set ของขวัญองค์กร
          </h1>
          <p className="mt-4 max-w-xl text-base text-paper/70 sm:text-lg">
            สกรีนโลโก้ บรรจุภัณฑ์พรีเมียม และจัดส่งตามโจทย์แคมเปญ —
            เริ่มจากขอใบเสนอราคา ไม่ต้องชำระเงินบนเว็บ
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-brass px-6 text-sm font-semibold text-forest transition hover:bg-brass-soft"
            >
              ขอใบเสนอราคา
            </Link>
            <Link
              href="/premium-giftset"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-paper/40 px-6 text-sm font-semibold text-paper transition hover:bg-paper/10"
            >
              ดูบริการและขั้นตอน
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-content px-page py-16">
        <ProcessSteps />
      </section>

      <Suspense fallback={<div className="mx-auto max-w-content px-page pb-12"><CatalogSkeleton cards={4} /></div>}>
        <HomeCategories />
      </Suspense>

      <section className="mx-auto max-w-content px-page pb-12 sm:pb-16">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold text-forest sm:text-3xl">
            ไอเดียชุดของขวัญตามธีม
          </h2>
          <p className="mt-3 text-ink/75">
            ธรรมชาติ วัฒนธรรม ท่องเที่ยว และสุขภาพ — เลือกธีมแล้วสกรีนโลโก้ได้
          </p>
        </div>
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {IDEA_THEMES.map((theme) => (
            <li key={theme.slug}>
              <Link href={ideaThemePath(theme.slug)} className="group block">
                <div className="media-frame media-frame--tile rounded-2xl">
                  <Image
                    src={theme.heroImage}
                    alt={theme.headline}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="(max-width:768px) 100vw, 25vw"
                  />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-forest group-hover:text-brass">
                  {theme.name}
                </h3>
                <p className="mt-2 line-clamp-3 text-sm text-ink/70">{theme.lede}</p>
                <p className="mt-3 text-sm font-medium text-brass">ดูไอเดียธีมนี้ →</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Suspense fallback={<div className="mx-auto max-w-content px-page py-16"><CatalogSkeleton cards={3} /></div>}>
        <HomeFeatured />
      </Suspense>

      <section className="mx-auto max-w-content px-page py-16">
        <div className="rounded-3xl border border-white/10 bg-forest px-5 py-10 text-paper shadow-lift sm:px-10 sm:py-12">
          <h2 className="text-2xl font-bold sm:text-3xl">พร้อมเริ่มโปรเจกต์?</h2>
          <p className="mt-3 max-w-xl text-paper/80">
            กรอกแบบฟอร์มขอใบเสนอราคา ไม่ใช่การสั่งซื้อ และไม่มีการชำระเงินบนเว็บ
            ทีมขายติดต่อกลับในเวลาทำการ
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-brass px-6 text-sm font-semibold text-forest"
            >
              กรอกแบบฟอร์มขอราคา
            </Link>
            {contact.showLine ? (
              <a
                href={site.lineUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-paper/35 px-6 text-sm font-semibold text-paper"
              >
                หรือแชท LINE {site.lineId}
              </a>
            ) : (
              <Link
                href="/about"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-paper/35 px-6 text-sm font-semibold text-paper"
              >
                เกี่ยวกับบริษัท
              </Link>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

async function HomeCategories() {
  const { categories, unavailable } = await getPublicCatalog();
  return (
    <section className="mx-auto max-w-content px-page pb-12 sm:pb-16">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-bold text-forest sm:text-3xl">เลือกหมวด Gift Set</h2>
        <p className="mt-3 text-ink/75">
          เลือกแนวชุดให้เหมาะกับแคมเปญ แล้วส่งคำขอใบเสนอราคาเมื่อพร้อม
        </p>
      </div>
      {categories.length === 0 ? (
        <EmptyState
          title={unavailable ? CATALOG_UNAVAILABLE_TITLE : "ยังไม่มีหมวดสินค้า"}
          description={unavailable ? CATALOG_UNAVAILABLE_BODY : "ระหว่างรอแคตตาล็อก แจ้งโจทย์ผ่านแบบฟอร์มได้เลย"}
        />
      ) : (
        <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <li key={category.slug}>
              <Link href={`/giftset/${category.slug}`} className="group block">
                <div className="media-frame media-frame--tile rounded-2xl">
                  <Image
                    src={category.heroImage}
                    alt={category.name}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="(max-width:768px) 100vw, 25vw"
                  />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-forest group-hover:text-brass">
                  {category.name}
                </h3>
                <p className="mt-2 line-clamp-3 text-sm text-ink/70">
                  {category.description}
                </p>
                <p className="mt-3 text-sm font-medium text-brass">ดูเซ็ตในหมวดนี้ →</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

async function HomeFeatured() {
  const { products, unavailable } = await getPublicCatalog();
  const featured = products.slice(0, 3);
  return (
    <section className="bg-forest-mist/50 py-16">
      <div className="mx-auto max-w-content px-page">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold text-forest sm:text-3xl">เซ็ตแนะนำ</h2>
          <p className="mt-3 text-ink/75">
            ทุกเซ็ตสกรีนโลโก้ได้ และสั่งผลิตตามออเดอร์ — กดเข้าไปดูวิธีใส่โลโก้แล้วขอราคาได้
          </p>
        </div>
        {featured.length === 0 ? (
          <EmptyState
            title={unavailable ? CATALOG_UNAVAILABLE_TITLE : CATALOG_EMPTY_TITLE}
            description={unavailable ? CATALOG_UNAVAILABLE_BODY : CATALOG_EMPTY_BODY}
          />
        ) : (
          <>
            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((product) => (
                <li key={product.slug}>
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
            <PriceDisclaimer className="mt-6" />
            <div className="mt-8">
              <Link
                href="/products"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest/20 bg-paper px-6 text-sm font-semibold text-forest"
              >
                ดูสินค้าทั้งหมด
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
