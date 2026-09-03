import { site } from "@/lib/site";

export function EnvironmentBanner() {
  if (site.allowIndexing) return null;

  return (
    <div
      role="status"
      className="bg-brass px-4 py-2.5 text-center text-sm font-medium leading-snug text-forest"
    >
      <span className="font-semibold">โหมดสาธิต</span>
      {" — "}
      เว็บนี้ยังไม่เปิดให้ Search Engine จัดทำดัชนี ข้อมูลติดต่อและสินค้าเป็นตัวอย่าง
      ใช้สำรวจประสบการณ์ก่อนเปลี่ยนเป็นข้อมูลจริง
    </div>
  );
}
