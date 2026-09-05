import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import {
  COMPANY,
  COMPANY_SERVICES,
  formatRegisteredAddress,
} from "@/lib/company";
import { getPublicContact } from "@/lib/public-contact";
import { buildBreadcrumbJsonLd } from "@/lib/seo";
import { metadataForPath } from "@/lib/page-seo";
import { site } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForPath("/about");
}

export default function AboutPage() {
  const contact = getPublicContact(site);
  const address = formatRegisteredAddress({
    streetAddress: site.localBusiness.streetAddress,
    locality: site.localBusiness.locality,
    region: site.localBusiness.region,
    postalCode: site.localBusiness.postalCode,
  });
  const breadcrumbs = buildBreadcrumbJsonLd([
    { name: "หน้าแรก", path: "/" },
    { name: "เกี่ยวกับเรา", path: "/about" },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbs} />

      <section className="relative isolate overflow-hidden bg-forest text-paper">
        <div className="relative min-h-[20rem] w-full sm:min-h-[26rem] lg:min-h-[32rem]">
          <Image
            src="/images/about-facility.jpg"
            alt="สำนักงานคอลเซ็นเตอร์และพื้นที่ผลิตของบริษัท เทราบิส จำกัด"
            fill
            priority
            className="object-cover object-[center_38%]"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-forest/90 via-forest/40 to-forest/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-forest/75 via-transparent to-forest/20" />
          <div className="relative mx-auto flex min-h-[20rem] max-w-content flex-col justify-end px-4 py-10 sm:min-h-[26rem] sm:px-6 sm:py-14 lg:min-h-[32rem]">
            <p className="text-sm font-semibold uppercase tracking-wide text-brass-soft">
              {COMPANY.legalNameEn}
            </p>
            <h1 className="mt-2 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
              เกี่ยวกับ {COMPANY.brandName}
            </h1>
            <p className="mt-3 max-w-xl text-sm text-paper/85 sm:text-base">
              ทีมขาย บริการลูกค้า และประสานงานผลิตของขวัญองค์กรพร้อมโลโก้
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-content px-4 py-12 sm:px-6 sm:py-16">
        <Breadcrumbs items={[{ label: "เกี่ยวกับเรา" }]} />

        <section className="max-w-3xl">
          <p className="text-base leading-relaxed text-ink/80">
            {COMPANY.legalName} รับออกแบบและผลิตของขวัญองค์กรพร้อมโลโก้
            สำหรับงานต้อนรับ พนักงานใหม่ คู่ค้า และอีเวนต์
            สินค้าสั่งตามออเดอร์แล้วผลิตจากจีน ไม่ใช่ร้านค้าพร้อมส่ง
          </p>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-bold text-forest">สิ่งที่เราทำให้</h2>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2">
            {COMPANY_SERVICES.map((item) => (
              <li
                key={item.title}
                className="rounded-2xl border border-forest/10 bg-paper p-6"
              >
                <h3 className="text-lg font-semibold text-forest">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/75">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14 rounded-3xl border border-forest/10 bg-forest-mist/40 p-6 sm:p-10">
          <h2 className="text-2xl font-bold text-forest">ข้อมูลนิติบุคคล</h2>
          <dl className="mt-8 grid gap-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-semibold text-forest">ชื่อบริษัท</dt>
              <dd className="mt-1 text-ink/80">{COMPANY.legalName}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-forest">ชื่อภาษาอังกฤษ</dt>
              <dd className="mt-1 text-ink/80">{COMPANY.legalNameEn}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-forest">
                เลขประจำตัวผู้เสียภาษี
              </dt>
              <dd className="mt-1 font-mono text-ink/80">{COMPANY.taxId}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-forest">จดทะเบียน</dt>
              <dd className="mt-1 text-ink/80">{COMPANY.registeredOnTh}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-semibold text-forest">ที่อยู่จดทะเบียน</dt>
              <dd className="mt-1 text-ink/80">{address}</dd>
            </div>
          </dl>
        </section>

        <section className="mt-14 max-w-3xl">
          <h2 className="text-2xl font-bold text-forest">ติดต่อเรา</h2>
          <p className="mt-3 text-ink/75">
            ส่งรายละเอียดผ่านแบบฟอร์มขอใบเสนอราคา ทีมขายจะติดต่อกลับในเวลาทำการ
          </p>
          <dl className="mt-8 space-y-4 text-sm">
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
                <dt className="font-semibold text-forest">LINE</dt>
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
          </dl>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-brass px-6 text-sm font-semibold text-forest"
            >
              ขอใบเสนอราคา
            </Link>
            <Link
              href="/products"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest/20 px-6 text-sm font-semibold text-forest"
            >
              ดูสินค้า
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
