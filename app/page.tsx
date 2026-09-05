import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { EmptyState } from "@/components/EmptyState";
import { JsonLd } from "@/components/JsonLd";
import { ProductCard } from "@/components/ProductCard";
import { PriceDisclaimer } from "@/components/PriceDisclaimer";
import { ProcessSteps } from "@/components/ProcessSteps";
import { metadataForPath } from "@/lib/page-seo";
import { getPublicContact } from "@/lib/public-contact";
import { buildWebSiteJsonLd } from "@/lib/seo";
import { IDEA_THEMES, ideaThemePath } from "@/lib/seo-themes";
import { getCategories, getProducts } from "@/lib/strapi";
import { site } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForPath("/");
}

export default async function HomePage() {
  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts(),
  ]);
  const featured = products.slice(0, 3);
  const contact = getPublicContact(site);

  return (
    <>
      <JsonLd data={buildWebSiteJsonLd()} />
      <section className="relative isolate min-h-[100svh] overflow-hidden bg-forest text-paper">
        <Image
          src="/images/hero-giftset.jpg"
          alt="ชุดของขวัญองค์กรพรีเมียมในกล่องบรรจุภัณฑ์สีเข้ม"
          fill
          priority
          className="object-cover opacity-40"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-forest via-forest/85 to-forest/40" />
        <div className="relative mx-auto flex min-h-[100svh] max-w-content flex-col justify-end px-4 pb-16 pt-28 sm:px-6 sm:pb-20">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-brass/25 bg-paper/15 px-3 py-1 text-xs font-medium text-brass-soft backdrop-blur-md">
            สินค้าพรีเมียม นำเข้าสั่งผลิตตามออเดอร์
          </p>
          <p className="mt-4 text-sm font-semibold tracking-[0.18em] text-brass-soft sm:text-base">
            {site.name}
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
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

      <section className="mx-auto max-w-content px-4 py-16 sm:px-6">
        <ProcessSteps />
      </section>

      <section className="mx-auto max-w-content px-4 pb-16 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold text-forest sm:text-3xl">เลือกหมวด Gift Set</h2>
          <p className="mt-3 text-ink/75">
            เลือกแนวชุดให้เหมาะกับแคมเปญ แล้วส่งคำขอใบเสนอราคาเมื่อพร้อม
          </p>
        </div>
        {categories.length === 0 ? (
          <EmptyState
            title="ยังไม่มีหมวดสินค้า"
            description="ระหว่างรอแคตตาล็อก แจ้งโจทย์ผ่านแบบฟอร์มได้เลย"
          />
        ) : (
          <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <li key={category.slug}>
                <Link href={`/giftset/${category.slug}`} className="group block">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-forest-mist">
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

      <section className="mx-auto max-w-content px-4 pb-16 sm:px-6">
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
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-forest-mist">
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

      <section className="bg-forest-mist/50 py-16">
        <div className="mx-auto max-w-content px-4 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold text-forest sm:text-3xl">เซ็ตแนะนำ</h2>
            <p className="mt-3 text-ink/75">
              ทุกเซ็ตสกรีนโลโก้ได้ และสั่งผลิตตามออเดอร์ — กดเข้าไปดูวิธีใส่โลโก้แล้วขอราคาได้
            </p>
          </div>
          {featured.length === 0 ? (
            <EmptyState
              title="ยังไม่มีสินค้าแนะนำ"
              description="ส่งโจทย์มาที่แบบฟอร์ม ทีมขายจะช่วยคัดเซ็ตให้"
            />
          ) : (
            <>
              <ul className="mt-10 grid gap-6 md:grid-cols-3">
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

      <section className="mx-auto max-w-content px-4 py-16 sm:px-6">
        <div className="rounded-3xl bg-forest px-6 py-12 text-paper sm:px-10">
          <h2 className="text-2xl font-bold sm:text-3xl">พร้อมเริ่มโปรเจกต์?</h2>
          <p className="mt-3 max-w-xl text-paper/80">
            แจ้งจำนวน งบประมาณ และวันที่ต้องการใช้ของขวัญ
            ทีมขายจะส่งใบเสนอราคากลับโดยไม่มีการเรียกเก็บเงินผ่านเว็บ
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
