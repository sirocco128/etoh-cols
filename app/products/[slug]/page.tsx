import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { CtaBand, EndUseCard, PackCard, SectionHeading } from "@/components/site/EtohBlocks";
import { GradeIcon, PillarIcon } from "@/components/site/EtohIllustrations";
import { findEndUse } from "@/lib/etoh/brand";
import { ETOH_DOCUMENT_LABELS, getGrade } from "@/lib/etoh/catalog";
import {
  ETOH_FAMILY_END_USES,
  ETOH_FAMILY_GRADES,
  ETOH_PACK_STORIES,
  ETOH_PRODUCT_FAMILIES,
  findFamilyBySlug,
} from "@/lib/etoh/storefront";
import { metadataForPath } from "@/lib/page-seo";
import { buildBreadcrumbJsonLd } from "@/lib/seo";
import { site } from "@/lib/site";

type PageProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return ETOH_PRODUCT_FAMILIES.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return metadataForPath(`/products/${slug}`);
}

export default async function ProductFamilyPage({ params }: PageProps) {
  const { slug } = await params;
  const family = findFamilyBySlug(slug);
  if (!family) notFound();
  const grades = (ETOH_FAMILY_GRADES[slug] ?? [family.code]).map(getGrade);
  const uses = (ETOH_FAMILY_END_USES[slug] ?? []).map(findEndUse).filter((u) => u != null);
  const documents = Array.from(new Set(grades.flatMap((g) => g.documents)));

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${family.title} (${family.titleTh})`,
    brand: { "@type": "Brand", name: site.name },
    category: "Industrial Ethanol",
    description: grades.map((g) => `${g.nameEn} ${g.purity}: ${g.suitableFor}`).join(" · "),
    image: `${site.url.replace(/\/$/, "")}/images/etoh/truck.jpg`,
  };

  return (
    <>
      <JsonLd data={productJsonLd} />
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "หน้าแรก", path: "/" },
          { name: "ผลิตภัณฑ์", path: "/products" },
          { name: family.title, path: `/products/${slug}` },
        ])}
      />
      <section className="border-b border-forest/10 bg-gradient-to-b from-[#eaf2fc] to-[#f6f9fe] dark:from-[#0f1b34] dark:to-[#081022]">
        <div className="mx-auto max-w-content px-page pb-14 pt-8">
          <Breadcrumbs items={[{ href: "/products", label: "ผลิตภัณฑ์" }, { label: family.title }]} />
          <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold text-brass">{family.titleTh}</p>
              <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-forest sm:text-5xl">{family.title}</h1>
              <ul className="mt-6 space-y-2.5">
                {family.highlights.map((h) => (
                  <li key={h} className="flex items-center gap-2.5 text-ink/80">
                    <PillarIcon name="check" className="h-5 w-5 text-leaf" />
                    {h}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={`/contact?grade=${family.code}`}
                  className="inline-flex min-h-12 items-center gap-2 rounded-full bg-brass px-7 text-sm font-semibold text-white shadow-lg transition hover:bg-brass-soft"
                >
                  ขอราคา {family.title}
                  <PillarIcon name="arrow" className="h-4 w-4" />
                </Link>
                <Link href="/documents" className="inline-flex min-h-12 items-center rounded-full border border-forest/15 bg-white px-6 text-sm font-semibold text-forest dark:bg-white/5">
                  ขอ Specification / SDS
                </Link>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="flex h-56 w-56 items-center justify-center rounded-[2.5rem] bg-white shadow-[0_40px_80px_-40px_rgba(10,42,102,0.6)] dark:bg-white/5">
                <GradeIcon accent={family.accent} className="h-32 w-32" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-content px-page py-14">
        <SectionHeading eyebrow="Specification" title="ข้อมูลเกรด" />
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {grades.map((g) => (
            <div key={g.code} className="rounded-2xl border border-forest/10 bg-white p-6 dark:bg-[#0f1b34]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-display text-xl font-bold text-forest">{g.nameEn}</p>
                  <p className="text-sm text-ink/60">{g.nameTh}</p>
                </div>
                <span className="rounded-full bg-forest px-3 py-1 text-sm font-bold text-white">{g.purity}</span>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-ink/55">เหมาะสำหรับ</dt>
                  <dd className="mt-0.5 font-medium text-ink/85">{g.suitableFor}</dd>
                </div>
                <div>
                  <dt className="text-ink/55">ความหนาแน่นโดยประมาณ</dt>
                  <dd className="mt-0.5 font-medium text-ink/85">{g.densityKgPerL.toFixed(2)} กก./ลิตร</dd>
                </div>
              </dl>
              {g.requiresFdaDocs ? (
                <p className="mt-4 rounded-xl bg-leaf/10 px-3 py-2 text-sm text-leaf">จัดส่งจากล็อตที่มีเอกสาร อย. เท่านั้น</p>
              ) : null}
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {documents.map((d) => (
            <span key={d} className="inline-flex items-center gap-1.5 rounded-full border border-forest/10 bg-white px-3 py-1.5 text-sm text-forest dark:bg-white/5">
              <PillarIcon name="doc" className="h-4 w-4 text-forest-light" />
              {ETOH_DOCUMENT_LABELS[d]}
            </span>
          ))}
        </div>
      </section>

      <section className="bg-[#f6f9fe] py-14 dark:bg-[#0b1428]">
        <div className="mx-auto max-w-content px-page">
          <SectionHeading eyebrow="Packaging" title="ขนาดบรรจุที่สั่งได้" />
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {ETOH_PACK_STORIES.map((p) => (
              <PackCard key={p.code} pack={p} />
            ))}
          </div>
        </div>
      </section>

      {uses.length ? (
        <section className="mx-auto max-w-content px-page py-14">
          <SectionHeading eyebrow="End Use" title={`${family.title} ใช้ในอุตสาหกรรมไหนบ้าง`} />
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {uses.map((u) => (
              <EndUseCard key={u.slug} use={u} compact />
            ))}
          </div>
        </section>
      ) : null}

      <CtaBand title={`สนใจ ${family.title}?`} />
    </>
  );
}
