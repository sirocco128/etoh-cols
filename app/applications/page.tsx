import type { Metadata } from "next";
import { CtaBand, EndUseCard, PageHero } from "@/components/site/EtohBlocks";
import { ETOH_END_USES } from "@/lib/etoh/brand";
import { metadataForPath } from "@/lib/page-seo";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForPath("/applications");
}

export default function ApplicationsPage() {
  return (
    <>
      <PageHero
        eyebrow="Thailand Market Segmentation by End Use"
        title="เอทานอลสำหรับทุกอุตสาหกรรม"
        lead="ตัวทำละลาย (Solvent) วัตถุดิบ และส่วนประกอบในผลิตภัณฑ์ — 9 กลุ่มการใช้งานที่เราดูแลลูกค้าอยู่ในประเทศไทย"
      />
      <section className="mx-auto max-w-content px-page py-14">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ETOH_END_USES.map((u) => (
            <EndUseCard key={u.slug} use={u} />
          ))}
        </div>
      </section>
      <CtaBand title="ไม่แน่ใจว่างานของคุณควรใช้เกรดไหน?" body="เล่าลักษณะงานหรือผลิตภัณฑ์ที่ผลิต ทีมงานจะแนะนำเกรด ความบริสุทธิ์ และบรรจุภัณฑ์ที่เหมาะสม" />
    </>
  );
}
