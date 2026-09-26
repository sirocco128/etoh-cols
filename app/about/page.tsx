import Image from "next/image";
import type { Metadata } from "next";
import { CtaBand, PageHero, SectionHeading } from "@/components/site/EtohBlocks";
import { PillarIcon } from "@/components/site/EtohIllustrations";
import { COMPANY_SERVICES } from "@/lib/company";
import { ETOH_TAGLINE_EN, ETOH_TAGLINE_TH } from "@/lib/etoh/brand";
import { ETOH_PILLARS } from "@/lib/etoh/storefront";
import { metadataForPath } from "@/lib/page-seo";
import { site } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForPath("/about");
}

export default function AboutPage() {
  return (
    <>
      <PageHero eyebrow="About Etoh Cols" title={site.legalName} lead="Industrial Ethanol Supply — จัดหาเอทานอลสำหรับผู้ใช้งานจริง พร้อมจัดส่งทั่วประเทศ" />

      <section className="mx-auto grid max-w-content gap-12 px-page py-14 lg:grid-cols-2 lg:items-center">
        <div className="relative aspect-[575/274] overflow-hidden rounded-[2rem] shadow-[0_40px_80px_-40px_rgba(10,42,102,0.6)]">
          <Image src="/images/etoh/truck.jpg" alt="คลังสินค้าและรถขนส่งของ Etoh Cols" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
        </div>
        <div>
          <SectionHeading eyebrow={ETOH_TAGLINE_EN} title="Delivering Clean Possibilities to Every Business" />
          <p className="mt-5 leading-relaxed text-ink/75">
            {site.name} นำเข้าและจัดหาเอทานอลสำหรับอุตสาหกรรมไทย ตั้งแต่ผู้ผลิตผลิตภัณฑ์สุขอนามัย เครื่องสำอาง ยา อาหาร
            หมึกพิมพ์และสี ไปจนถึงโรงงานเคมีภัณฑ์และผู้จัดจำหน่ายทั่วประเทศ เราดูแลตั้งแต่การเลือกเกรด เอกสารคุณภาพ
            จนถึงการจัดส่งถึงหน้างาน
          </p>
          <p className="mt-5 font-display text-xl italic text-forest-light">“{ETOH_TAGLINE_TH}”</p>
        </div>
      </section>

      <section className="bg-[#f6f9fe] py-14 dark:bg-[#0b1428]">
        <div className="mx-auto max-w-content px-page">
          <SectionHeading align="center" eyebrow="Why Etoh Cols" title="ทำไมต้องเรา" />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {COMPANY_SERVICES.map((item, i) => (
              <div key={item.title} className="rounded-2xl border border-forest/10 bg-white p-6 dark:bg-[#0f1b34]">
                <span className="font-display text-3xl font-extrabold text-forest-light/30">0{i + 1}</span>
                <p className="mt-2 font-semibold text-forest">{item.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink/65">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-content px-page py-14">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ETOH_PILLARS.map((p) => (
            <div key={p.key} className="flex items-start gap-4 rounded-2xl border border-forest/10 bg-white p-5 dark:bg-[#0f1b34]">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-forest-mist text-forest-light">
                <PillarIcon name={p.key} className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-forest">{p.title}</p>
                <p className="text-sm text-ink/60">{p.titleTh}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <CtaBand title="Let’s Grow Together" body="ร่วมงานกับเราในฐานะลูกค้าหรือตัวแทนจำหน่าย ติดต่อฝ่ายขายเพื่อรับราคาและเงื่อนไขที่เหมาะกับธุรกิจของคุณ" />
    </>
  );
}
