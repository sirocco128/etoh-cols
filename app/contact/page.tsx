import type { Metadata } from "next";
import { PageHero } from "@/components/site/EtohBlocks";
import { PillarIcon } from "@/components/site/EtohIllustrations";
import { EtohRfqForm } from "@/components/site/EtohRfqForm";
import { formatOpeningHoursDisplay, formatRegisteredAddress } from "@/lib/company";
import { ETOH_ORDER_STEPS } from "@/lib/etoh/storefront";
import { metadataForPath } from "@/lib/page-seo";
import { getPublicContact } from "@/lib/public-contact";
import { site } from "@/lib/site";
import { listThaiProvinces } from "@/lib/thai-address";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForPath("/contact");
}

type ContactPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const params = await searchParams;
  const contact = getPublicContact(site);
  const hasStreet = Boolean(site.localBusiness.streetAddress.trim());
  const address = formatRegisteredAddress({
    streetAddress: site.localBusiness.streetAddress,
    locality: site.localBusiness.locality,
    region: site.localBusiness.region,
    postalCode: site.localBusiness.postalCode,
  });
  const hours = formatOpeningHoursDisplay(site.localBusiness.openingHours);

  return (
    <>
      <PageHero
        eyebrow="Contact Us"
        title="ขอใบเสนอราคาเอทานอล"
        lead="กรอกความต้องการสั้น ๆ ฝ่ายขายจะติดต่อกลับพร้อมราคา Specification และตัวเลือกการจัดส่ง"
      />
      <section className="mx-auto grid max-w-content gap-10 px-page py-12 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-[2rem] border border-forest/10 bg-white p-6 shadow-[0_30px_60px_-45px_rgba(10,42,102,0.6)] sm:p-9 dark:bg-[#0f1b34]">
          <EtohRfqForm
            provinces={listThaiProvinces()}
            defaults={{
              grade: first(params.grade),
              pack: first(params.pack),
              endUse: first(params.use),
              intent: first(params.intent),
            }}
          />
        </div>

        <aside className="space-y-6">
          <div className="rounded-[2rem] bg-gradient-to-br from-[#0a2a66] to-[#1553b7] p-7 text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brass-soft">ติดต่อฝ่ายขาย</p>
            <p className="mt-3 text-lg font-semibold">{site.legalName}</p>
            <ul className="mt-5 space-y-3 text-sm">
              {contact.showPhone ? (
                <li>
                  <a href={site.phoneHref} className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 hover:bg-white/15">
                    <PillarIcon name="phone" className="h-5 w-5 text-brass-soft" />
                    <span>
                      <span className="block text-xs text-white/60">โทร</span>
                      <span className="text-base font-semibold">{site.phoneDisplay}</span>
                    </span>
                  </a>
                </li>
              ) : null}
              {contact.showEmail ? (
                <li>
                  <a href={`mailto:${site.email}`} className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 hover:bg-white/15">
                    <PillarIcon name="mail" className="h-5 w-5 text-brass-soft" />
                    <span>
                      <span className="block text-xs text-white/60">อีเมล</span>
                      <span className="font-semibold">{site.email}</span>
                    </span>
                  </a>
                </li>
              ) : null}
              {contact.showLine ? (
                <li>
                  <a href={site.lineUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-[#06c755] px-4 py-3 font-semibold hover:opacity-90">
                    แอดไลน์ {site.lineId}
                  </a>
                </li>
              ) : null}
              {!contact.showPhone && !contact.showEmail && !contact.showLine ? (
                <li className="text-white/75">ส่งแบบฟอร์มด้านซ้าย ฝ่ายขายจะติดต่อกลับ</li>
              ) : null}
            </ul>
            {hasStreet ? (
              <p className="mt-5 flex gap-2 text-sm text-white/75">
                <PillarIcon name="pin" className="mt-0.5 h-4 w-4 shrink-0" />
                {address}
              </p>
            ) : null}
            {hours ? <p className="mt-2 text-xs text-white/60">เวลาทำการ {hours}</p> : null}
          </div>

          <div className="rounded-[2rem] border border-forest/10 bg-white p-7 dark:bg-[#0f1b34]">
            <p className="font-display text-lg font-bold text-forest">ขั้นตอนหลังส่งคำขอ</p>
            <ol className="mt-4 space-y-4">
              {ETOH_ORDER_STEPS.map((s, i) => (
                <li key={s.title} className="flex gap-3">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest-mist text-xs font-bold text-forest">{i + 1}</span>
                  <div>
                    <p className="text-sm font-semibold text-forest">{s.title}</p>
                    <p className="text-xs leading-relaxed text-ink/60">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </section>
    </>
  );
}
