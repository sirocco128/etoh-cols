import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { CtaBand, EndUseCard, PackCard, ProductFamilyCard, SectionHeading } from "@/components/site/EtohBlocks";
import { LeafMark, PillarIcon } from "@/components/site/EtohIllustrations";
import { ETOH_END_USES, ETOH_TAGLINE_EN } from "@/lib/etoh/brand";
import { ETOH_DOCUMENT_KINDS, ETOH_DOCUMENT_LABELS } from "@/lib/etoh/catalog";
import {
  ETOH_DELIVERY_POINTS,
  ETOH_FAQ,
  ETOH_FLEET,
  ETOH_ORDER_STEPS,
  ETOH_PACK_STORIES,
  ETOH_PILLARS,
  ETOH_PRODUCT_FAMILIES,
  ETOH_SUPPORT_POINTS,
} from "@/lib/etoh/storefront";
import { metadataForPath } from "@/lib/page-seo";
import { getPublicContact } from "@/lib/public-contact";
import { buildWebSiteJsonLd } from "@/lib/seo";
import { site } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForPath("/");
}

export default function HomePage() {
  const contact = getPublicContact(site);
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: ETOH_FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <JsonLd data={buildWebSiteJsonLd()} />
      <JsonLd data={faqJsonLd} />

      {/* HERO */}
      <section className="relative overflow-hidden bg-[radial-gradient(120%_80%_at_85%_0%,#dbe9ff_0%,#f6f9fe_45%,#ffffff_100%)] dark:bg-[radial-gradient(120%_80%_at_85%_0%,#13305f_0%,#0b1428_55%,#081022_100%)]">
        <div className="pointer-events-none absolute -left-32 top-24 h-80 w-80 rounded-full bg-[#1f9d55]/10 blur-3xl" aria-hidden />
        <div className="relative mx-auto grid max-w-content items-center gap-10 px-page pb-14 pt-10 sm:pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:pb-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-forest/10 bg-white/70 px-3 py-1 text-xs font-semibold text-forest-light shadow-sm backdrop-blur dark:bg-white/5">
              <LeafMark className="h-3.5 w-3.5" />
              Industrial Ethanol Supply
            </p>
            <h1 className="mt-5 font-display text-[2.4rem] font-extrabold leading-[1.1] tracking-tight text-forest sm:text-5xl lg:text-[3.4rem]">
              จัดหาเอทานอล
              <br />
              สำหรับผู้ใช้งานจริง
              <span className="mt-2 block bg-gradient-to-r from-brass to-[#ff9a52] bg-clip-text text-transparent">
                พร้อมจัดส่งทั่วประเทศ
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink/70">
              Industrial · Denatured · TBA &amp; Bitrex · Food Grade (อย.) บรรจุตั้งแต่แกลลอน 5 ลิตรถึง ISO Tank 25,000 ลิตร
              พร้อม CoA และ SDS ทุกล็อต
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-brass px-7 text-sm font-semibold text-white shadow-[0_14px_30px_-12px_rgba(232,97,26,0.8)] transition hover:bg-brass-soft"
              >
                ขอใบเสนอราคา
                <PillarIcon name="arrow" className="h-4 w-4" />
              </Link>
              <Link
                href="/products"
                className="inline-flex min-h-12 items-center rounded-full border border-forest/15 bg-white px-7 text-sm font-semibold text-forest transition hover:border-forest-light dark:bg-white/5"
              >
                ดูผลิตภัณฑ์
              </Link>
              {contact.showPhone ? (
                <a href={site.phoneHref} className="inline-flex min-h-12 items-center gap-2 px-2 text-sm font-semibold text-forest-light hover:underline">
                  <PillarIcon name="phone" className="h-4 w-4" />
                  {site.phoneDisplay}
                </a>
              ) : null}
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-forest/10 pt-6">
              <div>
                <dt className="text-xs text-ink/55">ความบริสุทธิ์</dt>
                <dd className="font-display text-2xl font-bold text-forest">95–99.9%</dd>
              </div>
              <div>
                <dt className="text-xs text-ink/55">บรรจุภัณฑ์</dt>
                <dd className="font-display text-2xl font-bold text-forest">5 ขนาด</dd>
              </div>
              <div>
                <dt className="text-xs text-ink/55">พื้นที่จัดส่ง</dt>
                <dd className="font-display text-2xl font-bold text-forest">ทั่วไทย</dd>
              </div>
            </dl>
          </div>

          <div className="relative">
            <div className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-[0_40px_80px_-40px_rgba(10,42,102,0.6)] dark:border-white/10">
              <div className="relative aspect-[575/274]">
                <Image
                  src="/images/etoh/truck.jpg"
                  alt="รถขนส่งเอทานอลของ Etoh Cols หน้าคลังสินค้า"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 46vw"
                  className="object-cover"
                />
              </div>
            </div>
            <div className="absolute -bottom-6 left-4 right-4 grid grid-cols-2 gap-3 sm:left-8 sm:right-auto sm:w-[26rem]">
              {ETOH_PILLARS.slice(0, 2).map((p) => (
                <div key={p.key} className="flex items-center gap-3 rounded-2xl border border-forest/10 bg-white/95 px-4 py-3 shadow-lg backdrop-blur dark:bg-[#0f1b34]/95">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest-mist text-forest-light">
                    <PillarIcon name={p.key} className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-forest">{p.title}</p>
                    <p className="text-xs text-ink/60">{p.titleTh}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PILLARS */}
      <section className="border-y border-forest/10 bg-white dark:bg-[#0b1428]">
        <div className="mx-auto grid max-w-content gap-px bg-forest/10 px-0 sm:grid-cols-2 lg:grid-cols-4 dark:bg-white/10">
          {ETOH_PILLARS.map((p) => (
            <div key={p.key} className="bg-white px-page py-8 dark:bg-[#0b1428] lg:px-7">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1553b7] to-[#0a2a66] text-white shadow-md">
                <PillarIcon name={p.key} className="h-5 w-5" />
              </span>
              <p className="mt-4 font-semibold text-forest">
                {p.title} <span className="font-normal text-ink/55">· {p.titleTh}</span>
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink/65">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="mx-auto max-w-content px-page py-16 sm:py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            eyebrow="Our Ethanol Products"
            title="ผลิตภัณฑ์เอทานอลของเรา"
            lead="4 กลุ่มผลิตภัณฑ์ครอบคลุมตั้งแต่งานอุตสาหกรรมทั่วไป งานที่ต้องการความปลอดภัย ไปจนถึงอาหารและสินค้าอุปโภคบริโภค"
          />
          <Link href="/products" className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest-light hover:underline">
            เปรียบเทียบทุกเกรด <PillarIcon name="arrow" className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {ETOH_PRODUCT_FAMILIES.map((f) => (
            <ProductFamilyCard key={f.slug} family={f} />
          ))}
        </div>
      </section>

      {/* END USES */}
      <section className="bg-gradient-to-b from-[#f1f6fd] to-white py-16 sm:py-24 dark:from-[#0b1428] dark:to-[#081022]">
        <div className="mx-auto max-w-content px-page">
          <SectionHeading
            align="center"
            eyebrow="End Use"
            title="ครอบคลุมทุกการใช้งานในทุกอุตสาหกรรม"
            lead="ตัวทำละลาย วัตถุดิบ และส่วนประกอบในผลิตภัณฑ์ — เลือกกลุ่มของคุณเพื่อดูเกรดและบรรจุภัณฑ์ที่เหมาะสม"
          />
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {ETOH_END_USES.map((u) => (
              <EndUseCard key={u.slug} use={u} compact />
            ))}
            <Link
              href="/contact"
              className="group flex flex-col justify-between rounded-2xl bg-gradient-to-br from-[#0a2a66] to-[#1553b7] p-5 text-white transition hover:-translate-y-0.5 hover:shadow-lift"
            >
              <LeafMark className="h-7 w-7" />
              <div>
                <p className="text-lg font-bold leading-snug">ไม่พบงานของคุณ?</p>
                <p className="mt-1 text-sm text-white/75">เล่าลักษณะงาน เราแนะนำเกรดให้</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brass-soft">
                  ปรึกษาฝ่ายขาย <PillarIcon name="arrow" className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* PACKAGING */}
      <section className="mx-auto max-w-content px-page py-16 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:items-center">
          <div>
            <SectionHeading
              eyebrow="Packaging Options"
              title="เลือกบรรจุภัณฑ์ตามปริมาณใช้จริง"
              lead="ความหนาแน่นประมาณ 0.80 กก./ลิตร (ใช้ในการคำนวณ) ถัง 200 ลิตรและ IBC เป็นภาชนะหมุนเวียน เก็บมัดจำแยกและคืนเงินเมื่อคืนถัง"
            />
            <Link href="/packaging" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-forest-light hover:underline">
              รายละเอียดบรรจุภัณฑ์และการจัดส่ง <PillarIcon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {ETOH_PACK_STORIES.map((p) => (
              <PackCard key={p.code} pack={p} />
            ))}
          </div>
        </div>
      </section>

      {/* DELIVERY */}
      <section className="relative overflow-hidden bg-[#0a2a66] py-16 text-white sm:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_100%_0%,rgba(21,83,183,0.6),transparent)]" aria-hidden />
        <div className="relative mx-auto grid max-w-content gap-12 px-page lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div>
            <SectionHeading
              tone="inverse"
              eyebrow="Nationwide Delivery"
              title="ไม่ว่าคุณจะอยู่จังหวัดไหน เราพร้อมจัดส่งเอทานอลถึงหน้างาน"
            />
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {ETOH_DELIVERY_POINTS.map((d) => (
                <li key={d} className="flex items-start gap-2.5 text-sm text-white/85">
                  <PillarIcon name="check" className="mt-0.5 h-5 w-5 shrink-0 text-[#4ade80]" />
                  {d}
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {ETOH_FLEET.map((v) => (
              <div key={v.key} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
                <div className="relative aspect-[4/3]">
                  <Image src={v.image} alt={v.title} fill sizes="(max-width: 1024px) 50vw, 25vw" className="object-cover" />
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm font-semibold">{v.title}</p>
                  <p className="text-xs text-white/65">{v.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW TO ORDER + DOCUMENTS */}
      <section className="mx-auto grid max-w-content gap-10 px-page py-16 sm:py-24 lg:grid-cols-2">
        <div>
          <SectionHeading eyebrow="How to Order" title="สั่งซื้อง่าย 4 ขั้นตอน" />
          <ol className="mt-8 space-y-5">
            {ETOH_ORDER_STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest font-display font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-forest">{s.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink/65">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-[2rem] border border-forest/10 bg-gradient-to-br from-white to-[#eef4fd] p-7 shadow-[0_30px_60px_-40px_rgba(10,42,102,0.5)] dark:from-[#0f1b34] dark:to-[#0b1428] sm:p-9">
          <SectionHeading eyebrow="Documents & Support" title="เอกสารและการรับรอง" />
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ETOH_DOCUMENT_KINDS.map((k) => (
              <div key={k} className="flex flex-col items-center rounded-2xl bg-white px-3 py-4 text-center shadow-sm dark:bg-white/5">
                <PillarIcon name="doc" className="h-8 w-8 text-forest-light" />
                <p className="mt-2 text-sm font-bold text-forest">{k === "FDA" ? "อย." : k}</p>
                <p className="mt-0.5 text-[11px] leading-tight text-ink/55">{ETOH_DOCUMENT_LABELS[k].replace(/^[A-Z]+ /, "")}</p>
              </div>
            ))}
          </div>
          <ul className="mt-7 space-y-2.5">
            {ETOH_SUPPORT_POINTS.map((s) => (
              <li key={s} className="flex items-center gap-2.5 text-sm text-ink/80">
                <PillarIcon name="check" className="h-5 w-5 text-leaf" />
                {s}
              </li>
            ))}
          </ul>
          <Link href="/documents" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-forest-light hover:underline">
            ดูรายละเอียดเอกสาร <PillarIcon name="arrow" className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#f6f9fe] py-16 sm:py-20 dark:bg-[#0b1428]">
        <div className="mx-auto max-w-3xl px-page">
          <SectionHeading align="center" eyebrow="FAQ" title="คำถามที่พบบ่อย" />
          <div className="mt-10 space-y-3">
            {ETOH_FAQ.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-forest/10 bg-white px-5 py-4 open:shadow-md dark:bg-[#0f1b34]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-forest [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest-mist text-forest-light transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-ink/70">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <CtaBand />
      <p className="sr-only">{ETOH_TAGLINE_EN}</p>
    </>
  );
}
