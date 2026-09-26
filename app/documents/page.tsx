import Link from "next/link";
import type { Metadata } from "next";
import { CtaBand, PageHero, SectionHeading } from "@/components/site/EtohBlocks";
import { PillarIcon } from "@/components/site/EtohIllustrations";
import { ETOH_DOCUMENT_KINDS, ETOH_DOCUMENT_LABELS, type EtohDocumentKind } from "@/lib/etoh/catalog";
import { ETOH_SUPPORT_POINTS } from "@/lib/etoh/storefront";
import { metadataForPath } from "@/lib/page-seo";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForPath("/documents");
}

const DOC_DETAIL: Record<EtohDocumentKind, string> = {
  COA: "ผลวิเคราะห์ของล็อตที่ส่งจริง เช่น ความบริสุทธิ์และความชื้น ใช้ประกอบการตรวจรับสินค้าของฝ่าย QA",
  SDS: "เอกสารข้อมูลความปลอดภัย การจัดเก็บ การขนส่ง และการปฐมพยาบาล สำหรับฝ่ายคลังและความปลอดภัย",
  SPEC: "ข้อกำหนดของเกรดสินค้า ใช้เปรียบเทียบก่อนสั่งซื้อและขึ้นทะเบียนผู้ขายกับฝ่ายจัดซื้อ",
  FDA: "เอกสาร อย. สำหรับเอทานอลเกรดอาหาร ใช้กับอุตสาหกรรมอาหาร เครื่องดื่ม และเครื่องสำอาง",
};

export default function DocumentsPage() {
  return (
    <>
      <PageHero
        eyebrow="Documents & Support"
        title="เอกสารและการรับรอง"
        lead="เอกสารครบถ้วน พร้อมใช้งาน ส่งพร้อมสินค้าทุกครั้ง และขอ Specification / SDS ก่อนสั่งซื้อได้"
      />
      <section className="mx-auto max-w-content px-page py-14">
        <div className="grid gap-5 md:grid-cols-2">
          {ETOH_DOCUMENT_KINDS.map((k) => (
            <div key={k} className="flex gap-5 rounded-2xl border border-forest/10 bg-white p-6 dark:bg-[#0f1b34]">
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1553b7] to-[#0a2a66] text-white">
                <PillarIcon name="doc" className="h-7 w-7" />
              </span>
              <div>
                <p className="font-display text-lg font-bold text-forest">{ETOH_DOCUMENT_LABELS[k]}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink/70">{DOC_DETAIL[k]}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="bg-[#f6f9fe] py-14 dark:bg-[#0b1428]">
        <div className="mx-auto grid max-w-content gap-8 px-page lg:grid-cols-2 lg:items-center">
          <SectionHeading eyebrow="Support" title="ทีมงานพร้อมช่วยเหลือ" lead="ปรึกษาการเลือกเกรด การจัดเก็บ และความปลอดภัยในการใช้งานเอทานอลได้ก่อนและหลังการสั่งซื้อ" />
          <ul className="space-y-3">
            {ETOH_SUPPORT_POINTS.map((s) => (
              <li key={s} className="flex items-center gap-3 rounded-xl bg-white px-5 py-4 text-ink/85 shadow-sm dark:bg-[#0f1b34]">
                <PillarIcon name="check" className="h-5 w-5 text-leaf" />
                {s}
              </li>
            ))}
            <li>
              <Link href="/contact?intent=docs" className="inline-flex items-center gap-1.5 px-1 pt-2 text-sm font-semibold text-forest-light hover:underline">
                ขอเอกสาร Specification / SDS <PillarIcon name="arrow" className="h-4 w-4" />
              </Link>
            </li>
          </ul>
        </div>
      </section>
      <CtaBand />
    </>
  );
}
