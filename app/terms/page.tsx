import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ข้อกำหนดการใช้งาน",
  description: "ข้อกำหนดการใช้งานและเงื่อนไขการขอใบเสนอราคา (ฉบับร่างเทมเพลต)",
  alternates: { canonical: "/terms" },
  robots: { index: false, follow: false },
};

function isLegalContentApproved(): boolean {
  const raw = (process.env.LEGAL_CONTENT_APPROVED ?? "").trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(raw);
}

export default function TermsPage() {
  const legalApproved = isLegalContentApproved();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold text-forest sm:text-4xl">
        ข้อกำหนดการใช้งาน
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
          <h2>ราคาโดยประมาณ</h2>
          <p>
            ราคาที่แสดงบนเว็บไซต์เป็นค่าประมาณการเท่านั้น ไม่ใช่ใบเสนอราคาผูกพัน
            และอาจเปลี่ยนแปลงตามจำนวน วัสดุ วิธีตกแต่ง และระยะเวลาผลิต
          </p>
        </section>
        <section>
          <h2>คำขอใบเสนอราคาไม่ใช่คำสั่งซื้อ</h2>
          <p>
            การส่งแบบฟอร์มขอใบเสนอราคาเป็นเพียงการขอข้อมูลและราคา
            การสั่งซื้อมีผลเมื่อได้รับการยืนยันเป็นลายลักษณ์อักษรตามกระบวนการขาย
          </p>
        </section>
        <section>
          <h2>โลโก้และงานออกแบบ</h2>
          <p>
            ลูกค้าต้องมีสิทธิในโลโก้ งานศิลป์ และเนื้อหาที่ส่งมา
            และรับผิดชอบต่อข้อพิพาทด้านทรัพย์สินทางปัญญาที่เกี่ยวข้อง
          </p>
        </section>
        <section>
          <h2>ตัวอย่างและการอนุมัติ</h2>
          <p>
            การผลิตจำนวนมากเริ่มหลังการอนุมัติตัวอย่างตามที่ตกลง
            การแก้ไขหลังอนุมัติอาจมีค่าใช้จ่ายและเวลาเพิ่ม
          </p>
        </section>
        <section>
          <h2>กฎหมายที่ใช้บังคับ</h2>
          <p>
            ข้อกำหนดนี้จัดทำเป็นโครงร่างเบื้องต้น
            กฎหมายที่ใช้บังคับและรายละเอียดเงื่อนไขการขายต้องระบุโดยฝ่ายกฎหมาย
          </p>
        </section>
      </div>
    </div>
  );
}
