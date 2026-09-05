import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { QuoteForm } from "@/components/QuoteForm";
import { COMPANY, formatRegisteredAddress } from "@/lib/company";
import { metadataForPath } from "@/lib/page-seo";
import { getPublicContact } from "@/lib/public-contact";
import { site } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForPath("/contact");
}

type ContactPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(
  value: string | string[] | undefined,
): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const params = await searchParams;
  const note = firstParam(params.note);
  const productInterest = firstParam(params.productInterest) || firstParam(params.product);
  const productSlug = firstParam(params.productSlug) || firstParam(params.slug);
  const quantity = firstParam(params.quantity);
  const basketId = firstParam(params.basketId);
  const contact = getPublicContact(site);
  const address = formatRegisteredAddress({
    streetAddress: site.localBusiness.streetAddress,
    locality: site.localBusiness.locality,
    region: site.localBusiness.region,
    postalCode: site.localBusiness.postalCode,
  });

  return (
    <div className="mx-auto max-w-content px-4 py-12 sm:px-6 sm:py-16">
      <Breadcrumbs items={[{ label: "ติดต่อ / ขอใบเสนอราคา" }]} />
      <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section>
          <h1 className="text-3xl font-bold text-forest sm:text-4xl">ติดต่อ / ขอใบเสนอราคา</h1>
          <p className="mt-4 text-ink/80 leading-relaxed">
            {COMPANY.legalName} — แจ้งจำนวน งบประมาณ และวันที่ต้องการใช้งาน
            ทีมขายติดต่อกลับในเวลาทำการ แบบฟอร์มนี้ไม่มีการชำระเงิน
            และยังไม่ใช่การยืนยันสั่งซื้อ หลังอนุมัติราคาแล้วจึงชำระมัดจำหรือเต็มจำนวนผ่านพร้อมเพย์ที่หน้าออเดอร์
          </p>
          {basketId ? (
            <p
              role="status"
              className="mt-4 rounded-xl border border-brass/30 bg-brass/10 px-4 py-3 text-sm text-forest"
            >
              ตรวจพบตะกร้าใบเสนอราคา (<span className="font-mono text-xs">{basketId}</span>) —
              รายละเอียดถูกเติมในฟอร์มแล้ว กรุณาตรวจสอบก่อนส่ง
            </p>
          ) : null}

          <dl className="mt-8 space-y-5 text-sm">
            <div>
              <dt className="font-semibold text-forest">นิติบุคคล</dt>
              <dd className="mt-1 text-ink/80">{site.legalName}</dd>
            </div>
            {site.taxId ? (
              <div>
                <dt className="font-semibold text-forest">เลขประจำตัวผู้เสียภาษี</dt>
                <dd className="mt-1 font-mono text-ink/80">{site.taxId}</dd>
              </div>
            ) : null}
            {contact.showPhone ? (
              <div>
                <dt className="font-semibold text-forest">โทรศัพท์</dt>
                <dd className="mt-1">
                  <a href={site.phoneHref} className="text-ink/80 hover:text-brass">
                    {site.phoneDisplay}
                  </a>
                </dd>
              </div>
            ) : null}
            {contact.showEmail ? (
              <div>
                <dt className="font-semibold text-forest">อีเมล</dt>
                <dd className="mt-1">
                  <a
                    href={`mailto:${site.email}`}
                    className="text-ink/80 hover:text-brass"
                  >
                    {site.email}
                  </a>
                </dd>
              </div>
            ) : null}
            {contact.showLine ? (
              <div>
                <dt className="font-semibold text-forest">LINE OA</dt>
                <dd className="mt-1">
                  <a
                    href={site.lineUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink/80 hover:text-brass"
                  >
                    {site.lineId}
                  </a>
                </dd>
              </div>
            ) : null}
            {address ? (
              <div>
                <dt className="font-semibold text-forest">ที่อยู่</dt>
                <dd className="mt-1 text-ink/80">{address}</dd>
              </div>
            ) : null}
            {site.localBusiness.openingHours ? (
              <div>
                <dt className="font-semibold text-forest">เวลาทำการ</dt>
                <dd className="mt-1 text-ink/80">
                  {site.localBusiness.openingHours}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>

        <QuoteForm
          heading="แบบฟอร์มขอใบเสนอราคา"
          productInterest={productInterest}
          productSlug={productSlug}
          initialDetail={note}
          initialQuantity={quantity}
          basketId={basketId}
        />
      </div>
    </div>
  );
}
