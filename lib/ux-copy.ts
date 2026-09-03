/**
 * Shared Thai copy for consistent UX messaging.
 * Keep buyer-facing language plain; avoid internal jargon (SEO Landing, P2, etc.).
 */

export const PRICE_DISCLAIMER_SHORT =
  "ราคาที่แสดงเป็นค่าประมาณเท่านั้น ราคาสุดท้ายขึ้นกับจำนวน สเปค โลโก้ บรรจุภัณฑ์ และจุดส่ง";

export const PRICE_DISCLAIMER_FULL =
  "ราคาบนเว็บเป็นช่วงราคาโดยประมาณ ไม่ใช่ใบเสนอราคา และไม่รวมค่าตกแต่งพิเศษ ค่าแพ็ก หรือค่าขนส่งเสมอไป ทีมขายจะยืนยันราคาหลังได้รับรายละเอียดจากแบบฟอร์ม";

export const RFQ_NO_PAYMENT =
  "แบบฟอร์มนี้ใช้ขอใบเสนอราคาเท่านั้น ไม่มีการชำระเงิน และยังไม่ใช่การยืนยันสั่งซื้อ";

export const HOW_IT_WORKS = [
  {
    step: "1",
    title: "เลือกแนวเซ็ตหรือบอกโจทย์",
    body: "ดูหมวดสินค้า หรือแจ้งงบ จำนวน และโอกาสใช้งาน",
  },
  {
    step: "2",
    title: "ส่งคำขอใบเสนอราคา",
    body: "กรอกแบบฟอร์มหรือแชท LINE — ทีมขายติดต่อกลับในเวลาทำการ",
  },
  {
    step: "3",
    title: "อนุมัติแบบแล้วผลิต",
    body: "ยืนยันตัวอย่างก่อนผลิต จากนั้นผลิตและจัดส่งตามนัด",
  },
] as const;
