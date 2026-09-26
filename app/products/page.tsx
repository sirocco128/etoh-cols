import Link from "next/link";
import type { Metadata } from "next";
import { CtaBand, PageHero, ProductFamilyCard, SectionHeading } from "@/components/site/EtohBlocks";
import { PackIllustration, PillarIcon } from "@/components/site/EtohIllustrations";
import { ETOH_DOCUMENT_LABELS, ETOH_GRADES, ETOH_PACKS } from "@/lib/etoh/catalog";
import { ETOH_PRODUCT_FAMILIES } from "@/lib/etoh/storefront";
import { metadataForPath } from "@/lib/page-seo";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForPath("/products");
}

export default function ProductsPage() {
  return (
    <>
      <PageHero
        eyebrow="Our Ethanol Products"
        title="ผลิตภัณฑ์เอทานอล"
        lead="เลือกเกรดตามลักษณะงาน ทุกเกรดมีเอกสาร CoA SDS และ Specification และสั่งได้ทุกขนาดบรรจุ"
      />

      <section className="mx-auto max-w-content px-page py-14">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {ETOH_PRODUCT_FAMILIES.map((f) => (
            <ProductFamilyCard key={f.slug} family={f} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-content px-page pb-6">
        <SectionHeading eyebrow="Compare" title="เปรียบเทียบเกรด" lead="ความหนาแน่นใช้สำหรับคำนวณน้ำหนักบนใบส่งของ ค่าจริงตามผล CoA ของแต่ละล็อต" />
        <div className="mt-8 overflow-x-auto rounded-2xl border border-forest/10 bg-white dark:bg-[#0f1b34]">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="bg-forest text-left text-white">
                <th className="px-4 py-3 font-semibold">เกรด</th>
                <th className="px-4 py-3 font-semibold">ความบริสุทธิ์</th>
                <th className="px-4 py-3 font-semibold">เหมาะสำหรับ</th>
                <th className="px-4 py-3 font-semibold">ความหนาแน่น (โดยประมาณ)</th>
                <th className="px-4 py-3 font-semibold">เอกสาร</th>
              </tr>
            </thead>
            <tbody>
              {ETOH_GRADES.map((g, i) => (
                <tr key={g.code} className={i % 2 ? "bg-forest-mist/40" : ""}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-forest">{g.nameEn}</p>
                    <p className="text-xs text-ink/60">{g.nameTh}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-forest-light">{g.purity}</td>
                  <td className="px-4 py-3 text-ink/75">{g.suitableFor}</td>
                  <td className="px-4 py-3 tabular-nums">{g.densityKgPerL.toFixed(2)} กก./ลิตร</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {g.documents.map((d) => (
                        <span key={d} title={ETOH_DOCUMENT_LABELS[d]} className="rounded-full bg-forest-mist px-2 py-0.5 text-xs font-semibold text-forest">
                          {d === "FDA" ? "อย." : d}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto max-w-content px-page py-14">
        <div className="rounded-[2rem] border border-forest/10 bg-gradient-to-r from-[#eaf2fc] to-white p-7 dark:from-[#0f1b34] dark:to-[#0b1428] sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-lg">
              <h2 className="font-display text-2xl font-bold text-forest">ทุกเกรดสั่งได้ 5 ขนาดบรรจุ</h2>
              <p className="mt-2 text-sm text-ink/70">ตั้งแต่แกลลอน 5 ลิตรสำหรับทดลองใช้ จนถึง ISO Tank 25,000 ลิตรสำหรับโรงงาน</p>
              <Link href="/packaging" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-forest-light hover:underline">
                ดูบรรจุภัณฑ์ <PillarIcon name="arrow" className="h-4 w-4" />
              </Link>
            </div>
            <div className="flex items-end gap-4">
              {ETOH_PACKS.map((p) => (
                <PackIllustration
                  key={p.code}
                  code={p.code}
                  className={p.code === "ISO25000" ? "h-14 w-20" : p.code === "GAL5" ? "h-9 w-9" : p.code === "GAL20" ? "h-12 w-12" : "h-16 w-16"}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
