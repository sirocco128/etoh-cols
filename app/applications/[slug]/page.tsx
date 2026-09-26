import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { CtaBand, EndUseCard, ProductFamilyCard, SectionHeading } from "@/components/site/EtohBlocks";
import { PillarIcon } from "@/components/site/EtohIllustrations";
import { ETOH_END_USES, findEndUse } from "@/lib/etoh/brand";
import { familiesForEndUse } from "@/lib/etoh/storefront";
import { metadataForPath } from "@/lib/page-seo";
import { buildBreadcrumbJsonLd } from "@/lib/seo";

type PageProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return ETOH_END_USES.map((u) => ({ slug: u.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return metadataForPath(`/applications/${slug}`);
}

export default async function ApplicationPage({ params }: PageProps) {
  const { slug } = await params;
  const use = findEndUse(slug);
  if (!use) notFound();
  const families = familiesForEndUse(slug);
  const others = ETOH_END_USES.filter((u) => u.slug !== slug).slice(0, 4);

  return (
    <>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "หน้าแรก", path: "/" },
          { name: "การใช้งาน", path: "/applications" },
          { name: use.title, path: `/applications/${slug}` },
        ])}
      />
      <section className="border-b border-forest/10 bg-gradient-to-b from-[#eaf2fc] to-[#f6f9fe] dark:from-[#0f1b34] dark:to-[#081022]">
        <div className="mx-auto max-w-content px-page pb-14 pt-8">
          <Breadcrumbs items={[{ href: "/applications", label: "การใช้งาน" }, { label: use.title }]} />
          <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-brass">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-forest text-xs text-white">{use.no}</span>
                {use.titleEn}
              </p>
              <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-forest sm:text-5xl">{use.title}</h1>
              <p className="mt-5 text-lg text-ink/75">
                <span className="font-semibold text-forest">การใช้งาน:</span> {use.usage}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={`/contact?use=${use.slug}`} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-brass px-7 text-sm font-semibold text-white shadow-lg transition hover:bg-brass-soft">
                  ขอราคาสำหรับงานนี้
                  <PillarIcon name="arrow" className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <div className="relative aspect-[3/2] overflow-hidden rounded-[2rem] shadow-[0_40px_80px_-40px_rgba(10,42,102,0.6)]">
              <Image src={`/images/etoh/use-${use.slug}.jpg`} alt={use.titleEn} fill priority sizes="(max-width: 1024px) 100vw, 40vw" className="object-cover" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-content gap-8 px-page py-14 md:grid-cols-2">
        <div className="rounded-2xl border border-forest/10 bg-white p-7 dark:bg-[#0f1b34]">
          <h2 className="font-display text-xl font-bold text-forest">กลุ่มลูกค้า</h2>
          <ul className="mt-4 space-y-2.5">
            {use.buyers.map((b) => (
              <li key={b} className="flex items-center gap-2.5 text-ink/80">
                <PillarIcon name="check" className="h-5 w-5 text-leaf" />
                {b}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-forest/10 bg-white p-7 dark:bg-[#0f1b34]">
          <h2 className="font-display text-xl font-bold text-forest">ตัวอย่างผลิตภัณฑ์</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {use.examples.map((e) => (
              <span key={e} className="rounded-full bg-forest-mist px-3 py-1.5 text-sm font-medium text-forest">
                {e}
              </span>
            ))}
          </div>
          <p className="mt-6 text-sm leading-relaxed text-ink/65">
            ทุกล็อตมี CoA และ SDS ประกอบ ช่วยให้ฝ่ายจัดซื้อและ QA ของคุณตรวจรับสินค้าได้ง่าย
          </p>
        </div>
      </section>

      {families.length ? (
        <section className="bg-[#f6f9fe] py-14 dark:bg-[#0b1428]">
          <div className="mx-auto max-w-content px-page">
            <SectionHeading eyebrow="Recommended" title="เกรดที่แนะนำ" />
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {families.map((f) => (
                <ProductFamilyCard key={f.slug} family={f} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-content px-page py-14">
        <SectionHeading eyebrow="More" title="การใช้งานอื่น" />
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {others.map((u) => (
            <EndUseCard key={u.slug} use={u} compact />
          ))}
        </div>
      </section>

      <CtaBand />
    </>
  );
}
