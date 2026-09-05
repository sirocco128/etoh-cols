import type { Metadata } from "next";
import { COMPANY } from "@/lib/company";
import { metadataForPath } from "@/lib/page-seo";
import { getPublicContact } from "@/lib/public-contact";
import { site } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForPath("/privacy");
}

function isLegalContentApproved(): boolean {
  const raw = (process.env.LEGAL_CONTENT_APPROVED ?? "").trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(raw);
}

export default function PrivacyPage() {
  const legalApproved = isLegalContentApproved();
  const contact = getPublicContact(site);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold text-forest sm:text-4xl">
        นโยบายความเป็นส่วนตัว
      </h1>
      {!legalApproved ? (
        <p
          role="status"
          className="mt-4 rounded-xl border border-brass/40 bg-brass/10 px-4 py-3 text-sm font-medium text-forest"
        >
          รออนุมัติ Legal/PDPA — ข้อความนี้เป็นแม่แบบ
        </p>
      ) : null}

      <div className="prose-custom mt-10 space-y-6">
        <section>
          <h2>ข้อมูลที่เก็บรวบรวม</h2>
          <p>
            เมื่อคุณส่งแบบฟอร์มขอใบเสนอราคา {COMPANY.legalName} อาจเก็บชื่อ บริษัท อีเมล เบอร์โทร
            รายละเอียดโปรเจกต์ และข้อมูลการอ้างอิงแคมเปญ (เช่น UTM)
          </p>
        </section>
        <section>
          <h2>วัตถุประสงค์</h2>
          <p>
            เพื่อติดต่อกลับ ประเมินราคา ประสานงานผลิต และปรับปรุงบริการ
            ไม่ใช้ข้อมูลเพื่อวัตถุประสงค์ที่ไม่เกี่ยวข้องโดยไม่แจ้งให้ทราบ
          </p>
        </section>
        <section>
          <h2>การส่งต่อข้อมูล</h2>
          <p>
            อาจส่งต่อให้ระบบภายในหรือผู้ประมวลผลที่จำเป็นต่อการให้บริการ
            (เช่น Webhook CRM) ภายใต้ข้อตกลงที่เหมาะสม
          </p>
        </section>
        <section>
          <h2>ระยะเวลาเก็บรักษา</h2>
          <p>
            เก็บเท่าที่จำเป็นต่อวัตถุประสงค์ทางธุรกิจและข้อกำหนดกฎหมาย
            ระยะเวลาจริงต้องกำหนดโดยฝ่ายกฎหมายก่อนเปิดใช้งาน Production
          </p>
        </section>
        <section>
          <h2>สิทธิของเจ้าของข้อมูล</h2>
          <p>
            คุณสามารถขอเข้าถึง แก้ไข หรือลบข้อมูลส่วนบุคคลได้ตามกฎหมายที่เกี่ยวข้อง
            โดยติดต่อ {COMPANY.legalName} ผ่านหน้าติดต่อของเว็บไซต์นี้
            {contact.showEmail ? ` หรืออีเมล ${site.email}` : ""}
          </p>
        </section>
      </div>
    </div>
  );
}
