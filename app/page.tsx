import Image from "next/image";
import Link from "next/link";
import { PriceDisclaimer } from "@/components/PriceDisclaimer";
import { ProcessSteps } from "@/components/ProcessSteps";
import { EmptyState } from "@/components/EmptyState";
import { getCategories, getProducts } from "@/lib/strapi";
import { site } from "@/lib/site";

export default async function HomePage() {
  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts(),
  ]);
  const featured = products.slice(0, 3);

  return (
    <>
      <section className="relative isolate min-h-[100svh] overflow-hidden bg-forest text-paper">
        <Image
          src="/images/hero-giftset.svg"
          alt="ชุดของขวัญองค์กรพรีเมียมในกล่องบรรจุภัณฑ์สีเข้ม"
          fill
          priority
          className="object-cover opacity-40"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-forest via-forest/85 to-forest/40" />
        <div className="relative mx-auto flex min-h-[100svh] max-w-content flex-col justify-end px-4 pb-16 pt-28 sm:px-6 sm:pb-20">
          <p className="text-2xl font-bold tracking-tight text-brass-soft sm:text-3xl md:text-4xl">
            {site.name}
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
            รับผลิต Gift Set ของขวัญองค์กร
          </h1>
          <p className="mt-4 max-w-xl text-base text-paper/85 sm:text-lg">
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

      <section className="bg-forest-mist/50 py-16">
        <div className="mx-auto max-w-content px-4 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold text-forest sm:text-3xl">เซ็ตแนะนำ</h2>
            <p className="mt-3 text-ink/75">
              ตัวอย่างเซ็ตที่ปรับโลโก้และบรรจุภัณฑ์ได้ — กดเข้าไปดูรายละเอียดแล้วขอราคาได้ทันที
            </p>
          </div>
          {featured.length === 0 ? (
            <EmptyState
              title="ยังไม่มีสินค้าแนะนำ"
              description="ส่งโจทย์มาที่แบบฟอร์ม ทีมขายจะช่วยคัดเซ็ตให้"
            />
          ) : (
            <>
              <ul className="mt-10 grid gap-8 md:grid-cols-3">
                {featured.map((product) => (
                  <li key={product.slug}>
                    <Link href={`/products/${product.slug}`} className="group block">
                      <div className="relative aspect-square overflow-hidden rounded-2xl bg-paper">
                        <Image
                          src={product.images[0] || "/images/product-placeholder.svg"}
                          alt={product.name}
                          fill
                          className="object-cover transition duration-500 group-hover:scale-105"
                          sizes="(max-width:768px) 100vw, 33vw"
                        />
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-forest">
                        {product.name}
                      </h3>
                      <p className="mt-2 text-sm text-ink/70">
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
            <a
              href={site.lineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-paper/35 px-6 text-sm font-semibold text-paper"
            >
              หรือแชท LINE {site.lineId}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
