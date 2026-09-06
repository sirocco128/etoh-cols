import Link from "next/link";
import { actorMay, requireOpsPage } from "@/lib/ops-auth";
import { countQuoteRequests } from "@/lib/quote-repository";
import { countApprovalQueue } from "@/lib/payment-approval";
import { countInboundPos } from "@/lib/factory-po-queries";
import { getStrapiAdminUrl } from "@/lib/strapi-url";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function OpsIndexPage() {
  const actor = await requireOpsPage();
  const newQuotes = countQuoteRequests({ leadStatus: "new" });
  const approvals = actorMay(actor, "orders.read") ? countApprovalQueue() : 0;
  const inbound = actorMay(actor, "factory.read") ? countInboundPos() : 0;

  const cards = [
    actorMay(actor, "quotes.read")
      ? {
          href: "/ops/quotes?status=new",
          title: "คำขอใหม่",
          count: newQuotes,
          body: "ใบเสนอราคาที่ยังไม่ได้ติดต่อ",
        }
      : null,
    actorMay(actor, "quotes.read")
      ? {
          href: "/ops/pricing",
          title: "คิดราคา",
          count: "—",
          body: "บันไดจำนวนตามสูตรราคาบนเว็บ",
        }
      : null,
    actorMay(actor, "orders.read")
      ? {
          href: "/ops/approvals",
          title: "รออนุมัติยอด",
          count: approvals,
          body: "สลิปที่บัญชีต้องตรวจ",
        }
      : null,
    actorMay(actor, "factory.read")
      ? {
          href: actorMay(actor, "factory.write")
            ? "/ops/inbound"
            : "/ops/factory-po",
          title: "ค้างรับของ",
          count: inbound,
          body: "ใบสั่งโรงงานที่ยังรับไม่ครบ",
        }
      : null,
    actorMay(actor, "reports.read")
      ? {
          href: "/ops/reports",
          title: "รายงานวงจร",
          count: "—",
          body: "คำขอถึงรับเงิน — ทุกขั้น ทุกมิติ ตามสิทธิ์บัญชีนี้",
        }
      : null,
  ].filter((card) => card !== null);

  return (
    <div>
      <h1 className="text-2xl font-bold text-forest">ภาพรวมงานวันนี้</h1>
      <p className="mt-1 text-sm text-ink/70">
        คิวที่ต้องเคลียร์ — เปิดรายการจากบัตรด้านล่าง
      </p>
      {cards.length ? (
        <ul className="mt-6 grid gap-4 sm:grid-cols-3">
          {cards.map((card) => (
            <li key={card.href}>
              <Link
                href={card.href}
                className="block rounded-xl border border-forest/15 bg-paper p-5 hover:border-brass/50"
              >
                <p className="text-sm text-ink/65">{card.title}</p>
                <p className="mt-2 text-3xl font-bold text-forest">{card.count}</p>
                <p className="mt-2 text-sm text-ink/70">{card.body}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-ink/70">ยังไม่มีคิวที่บัญชีนี้ดูได้</p>
      )}
      {actorMay(actor, "catalog.write") ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-forest">แคตตาล็อก</h2>
          <p className="mt-1 text-sm text-ink/70">
            จัดการสินค้าและรูปใน Strapi — เปิดแท็บใหม่ ไม่ใช่หน้าคอนโซลนี้
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <a
              href={getStrapiAdminUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl border border-forest/15 bg-paper p-5 hover:border-brass/50"
            >
              <p className="font-semibold text-forest">เข้า Strapi</p>
              <p className="mt-2 text-sm text-ink/70">
                เปิดแอดมินแคตตาล็อก (สินค้า หมวด รูป)
              </p>
            </a>
            <Link
              href="/ops/catalog-books"
              className="block rounded-xl border border-forest/15 bg-paper p-5 hover:border-brass/50"
            >
              <p className="font-semibold text-forest">สร้างสมุดแคตตาล็อก</p>
              <p className="mt-2 text-sm text-ink/70">
                จัดไฟล์ตามกลุ่มที่ fix ไว้ แล้วออกเป็นอัลบั้มพลิกพร้อมลิงก์ส่งลูกค้า
              </p>
            </Link>
            <Link
              href="/ops/catalog-images"
              className="block rounded-xl border border-forest/15 bg-paper p-5 hover:border-brass/50"
            >
              <p className="font-semibold text-forest">รูปโรงงาน</p>
              <p className="mt-2 text-sm text-ink/70">
                ค้นรูปจากเว็บโรงงาน แล้วนำไปใส่ใน Strapi ทีหลัง
              </p>
            </Link>
            <Link
              href="/ops/pricing/import"
              className="block rounded-xl border border-forest/15 bg-paper p-5 hover:border-brass/50"
            >
              <p className="font-semibold text-forest">อัปเดตราคาจาก Excel</p>
              <p className="mt-2 text-sm text-ink/70">
                นำเข้าไฟล์โรงงาน พรีวิวทั้งตาราง ส่งออกเช็ค แล้วค่อยอัปเดตราคาขาย
              </p>
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
