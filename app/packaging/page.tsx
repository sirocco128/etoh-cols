import Image from "next/image";
import type { Metadata } from "next";
import { CtaBand, PageHero, SectionHeading } from "@/components/site/EtohBlocks";
import { PackIllustration, PillarIcon } from "@/components/site/EtohIllustrations";
import { getPack } from "@/lib/etoh/catalog";
import { ETOH_DELIVERY_POINTS, ETOH_FLEET, ETOH_PACK_STORIES } from "@/lib/etoh/storefront";
import { metadataForPath } from "@/lib/page-seo";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForPath("/packaging");
}

const KIND_LABEL = {
  bulk: "Bulk — ไม่มีค่าภาชนะ",
  returnable: "ภาชนะหมุนเวียน — มัดจำคืนได้",
  oneway: "ขายพร้อมภาชนะ",
} as const;

export default function PackagingPage() {
  return (
    <>
      <PageHero
        eyebrow="Packaging & Nationwide Delivery"
        title="บรรจุภัณฑ์และการจัดส่ง"
        lead="เลือกขนาดบรรจุให้ตรงกับปริมาณใช้งานจริง แล้วให้เราจัดรถที่เหมาะสมส่งถึงหน้างานทุกจังหวัด"
      />

      <section className="mx-auto max-w-content px-page py-14">
        <div className="space-y-4">
          {ETOH_PACK_STORIES.map((p) => {
            const pack = getPack(p.code);
            return (
              <div key={p.code} className="grid items-center gap-6 rounded-2xl border border-forest/10 bg-white p-5 sm:grid-cols-[8rem_1fr_auto] sm:p-6 dark:bg-[#0f1b34]">
                <div className="flex h-24 items-center justify-center rounded-xl bg-forest-mist/60">
                  <PackIllustration code={p.code} className={p.code === "ISO25000" ? "h-16 w-24" : "h-20 w-20"} />
                </div>
                <div>
                  <p className="font-display text-xl font-bold text-forest">
                    {p.title} <span className="text-forest-light">{p.volume}</span>
                  </p>
                  <p className="mt-1 text-sm text-ink/70">{p.forWho}</p>
                  <p className="mt-2 inline-flex rounded-full bg-forest-mist px-2.5 py-0.5 text-xs font-semibold text-forest">{KIND_LABEL[pack.kind]}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs text-ink/55">น้ำหนักโดยประมาณ</p>
                  <p className="font-display text-2xl font-bold text-forest">{p.weight}</p>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 flex items-center gap-2 text-sm text-ink/60">
          <PillarIcon name="check" className="h-4 w-4 text-leaf" />
          ความหนาแน่นประมาณ 0.80 กก./ลิตร (ใช้ในการคำนวณ) น้ำหนักจริงตามเกรดและผล CoA
        </p>
      </section>

      <section className="relative overflow-hidden bg-[#0a2a66] py-16 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_0%_100%,rgba(31,157,85,0.35),transparent)]" aria-hidden />
        <div className="relative mx-auto max-w-content px-page">
          <SectionHeading tone="inverse" eyebrow="Nationwide Delivery" title="จัดส่งทั่วประเทศไทย" lead="จากกรุงเทพฯ สู่ทุกจังหวัด เราส่งถึงคุณ" />
          <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {ETOH_FLEET.map((v) => (
              <div key={v.key} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                <div className="relative aspect-[4/3]">
                  <Image src={v.image} alt={v.title} fill sizes="(max-width: 1024px) 50vw, 25vw" className="object-cover" />
                </div>
                <div className="px-4 py-3">
                  <p className="font-semibold">{v.title}</p>
                  <p className="text-xs text-white/65">{v.note}</p>
                </div>
              </div>
            ))}
          </div>
          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ETOH_DELIVERY_POINTS.map((d) => (
              <li key={d} className="flex items-center gap-2.5 rounded-xl bg-white/5 px-4 py-3 text-sm">
                <PillarIcon name="check" className="h-5 w-5 shrink-0 text-[#4ade80]" />
                {d}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <CtaBand title="แจ้งปริมาณและจังหวัดที่จัดส่ง" body="เราจะแนะนำขนาดบรรจุและวิธีขนส่งที่คุ้มที่สุดสำหรับปริมาณของคุณ พร้อมใบเสนอราคา" />
    </>
  );
}
