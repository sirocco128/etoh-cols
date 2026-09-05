import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ChinaOrderSteps } from "@/components/ChinaOrderSteps";
import { FaqAccordion } from "@/components/FaqAccordion";
import { JsonLd } from "@/components/JsonLd";
import { QuoteForm } from "@/components/QuoteForm";
import { clientSegments } from "@/lib/data";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
} from "@/lib/seo";
import { getCategories, getFaqs } from "@/lib/strapi";
import { getPublicContact } from "@/lib/public-contact";
import { site } from "@/lib/site";
import { metadataForPath } from "@/lib/page-seo";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForPath("/premium-giftset");
}

const MATERIALS = [
  {
    title: "กล่องแข็ง (Rigid Box)",
    body: "โชว์แบรนด์ชัด เหมาะของขวัญผู้บริหารและพาร์ทเนอร์สำคัญ",
  },
  {
    title: "กล่องลูกฟูก (Corrugated)",
    body: "แข็งแรง คุ้มค่าต่อการจัดส่งจำนวนมากและแคมเปญองค์กร",
  },
] as const;

export default async function PremiumGiftSetPage() {
  const [categories, faqs] = await Promise.all([getCategories(), getFaqs()]);
  const contact = getPublicContact(site);

  const breadcrumbs = buildBreadcrumbJsonLd([
    { name: "หน้าแรก", path: "/" },
    { name: "Premium Gift Set", path: "/premium-giftset" },
  ]);
  const faqLd = buildFaqPageJsonLd(faqs);

  return (
    <>
      <JsonLd data={breadcrumbs} />
      <JsonLd data={faqLd} />

      <div className="mx-auto max-w-content px-4 pt-8 sm:px-6">
        <Breadcrumbs items={[{ label: "Premium Gift Set" }]} />
      </div>

      <section className="mx-auto max-w-content px-4 pb-12 pt-2 sm:px-6 sm:pb-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brass">
              ของขวัญองค์กร · สกรีนโลโก้
            </p>
            <h1 className="mt-3 text-3xl font-bold text-forest sm:text-4xl">
              Premium Gift Set สำหรับองค์กร
            </h1>
            <p className="mt-4 text-base leading-relaxed text-ink/80">
              รับผลิตชุดของขวัญพร้อมโลโก้และบรรจุภัณฑ์ตามแบรนด์
              ช่วยคัดสินค้าให้ตรงงบ ภาพลักษณ์ และจำนวนที่ต้องการ —
              เริ่มจากขอใบเสนอราคา ไม่ชำระเงินบนเว็บ
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="#quote"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-brass px-6 text-sm font-semibold text-forest"
              >
                ขอใบเสนอราคา
              </Link>
              <Link
                href="/products"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest/20 px-6 text-sm font-semibold text-forest"
              >
                ดูตัวอย่างเซ็ต
              </Link>
              {contact.showLine ? (
                <a
                  href={site.lineUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest/20 px-6 text-sm font-semibold text-forest"
                >
                  LINE {site.lineId}
                </a>
              ) : (
                <Link
                  href="/about"
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest/20 px-6 text-sm font-semibold text-forest"
                >
                  เกี่ยวกับบริษัท
                </Link>
              )}
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-forest">
            <Image
              src="/images/hero-giftset.jpg"
              alt="ตัวอย่าง Premium Gift Set ในกล่ององค์กร"
              fill
              className="object-cover"
              sizes="(max-width:1024px) 100vw, 50vw"
              priority
            />
          </div>
        </div>
      </section>

      <section className="bg-forest-mist/40 py-14">
        <div className="mx-auto max-w-content px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-forest">หมวด Gift Set</h2>
          <p className="mt-2 text-sm text-ink/70">เลือกแนวเซ็ต แล้วกลับมาขอราคาด้านล่างได้</p>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <li key={category.slug}>
                <Link href={`/giftset/${category.slug}`} className="group block">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-paper">
                    <Image
                      src={category.heroImage}
                      alt={category.name}
                      fill
                      className="object-cover"
                      sizes="(max-width:768px) 100vw, 25vw"
                    />
                  </div>
                  <h3 className="mt-3 font-semibold text-forest group-hover:text-brass">
                    {category.name}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-ink/70">
                    {category.description}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-content px-4 py-14 sm:px-6">
        <h2 className="text-2xl font-bold text-forest">ตัวเลือกบรรจุภัณฑ์</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {MATERIALS.map((item) => (
            <div key={item.title} className="rounded-2xl border border-forest/10 p-6">
              <h3 className="text-xl font-semibold text-forest">{item.title}</h3>
              <p className="mt-3 text-ink/75">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-forest py-14 text-paper">
        <div className="mx-auto max-w-content px-4 sm:px-6">
          <ChinaOrderSteps variant="dark" />
        </div>
      </section>

      <section className="mx-auto max-w-content px-4 py-14 sm:px-6">
        <h2 className="text-2xl font-bold text-forest">กลุ่มองค์กรที่เราดูแล</h2>
        <ul className="mt-6 flex flex-wrap gap-3">
          {clientSegments.map((segment) => (
            <li
              key={segment}
              className="rounded-full border border-forest/15 bg-forest-mist/50 px-4 py-2 text-sm text-forest"
            >
              {segment}
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-forest-mist/40 py-14">
        <div className="mx-auto max-w-content px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-forest">คำถามที่พบบ่อย</h2>
          <div className="mt-8">
            <FaqAccordion faqs={faqs} />
          </div>
        </div>
      </section>

      <section id="quote" className="mx-auto max-w-content scroll-mt-28 px-4 py-14 sm:px-6">
        <QuoteForm heading="ขอใบเสนอราคา Premium Gift Set" />
      </section>
    </>
  );
}
