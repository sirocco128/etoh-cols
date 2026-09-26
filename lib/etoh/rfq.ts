import { findEndUse } from "@/lib/etoh/brand";
import { getGrade, getPack, isGradeCode, isPackCode } from "@/lib/etoh/catalog";
import { ETOH_RFQ_FREQUENCIES } from "@/lib/etoh/storefront";

/** Build the structured ethanol request that lands in /ops/inquiries. */
export function composeEtohRfqMessage(fields: {
  grade: string;
  pack: string;
  qty: string;
  frequency: string;
  province: string;
  endUse: string;
  deliveryDate: string;
  note: string;
}): string {
  const lines = [
    "[ขอใบเสนอราคาเอทานอล]",
    `เกรด: ${isGradeCode(fields.grade) ? getGrade(fields.grade).nameTh : "ให้ฝ่ายขายแนะนำ"}`,
    `บรรจุภัณฑ์: ${isPackCode(fields.pack) ? getPack(fields.pack).nameTh : "ให้ฝ่ายขายแนะนำ"}`,
    `จำนวน: ${fields.qty || "-"}`,
    `ความถี่: ${ETOH_RFQ_FREQUENCIES.find((f) => f.value === fields.frequency)?.label ?? "-"}`,
    `จังหวัดที่จัดส่ง: ${fields.province || "-"}`,
    `การใช้งาน: ${findEndUse(fields.endUse)?.title ?? "-"}`,
    `ต้องการรับสินค้า: ${fields.deliveryDate || "-"}`,
  ];
  if (fields.note) lines.push(`รายละเอียดเพิ่มเติม: ${fields.note}`);
  // cleanText collapses newlines, so separators must survive on one line.
  return lines.join(" | ");
}

