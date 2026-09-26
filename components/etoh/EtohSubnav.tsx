import Link from "next/link";

const ITEMS = [
  { key: "dashboard", href: "/ops/etoh/dashboard", label: "ภาพรวม" },
  { key: "calc", href: "/ops/etoh", label: "คิดราคา" },
  { key: "quotes", href: "/ops/etoh/quotes", label: "ใบเสนอราคา" },
  { key: "orders", href: "/ops/etoh/orders", label: "ออเดอร์ / ส่งของ" },
  { key: "followups", href: "/ops/etoh/followups", label: "ตามขาย" },
  { key: "customers", href: "/ops/etoh/customers", label: "เงื่อนไขลูกค้า" },
  { key: "prices", href: "/ops/etoh/prices", label: "ราคา / บรรจุภัณฑ์" },
  { key: "lots", href: "/ops/etoh/lots", label: "ล็อตนำเข้า / CoA" },
  { key: "drums", href: "/ops/etoh/drums", label: "ถังหมุนเวียน" },
  { key: "sync", href: "/ops/etoh/sync", label: "ส่งข้อมูล NEXTERP" },
] as const;

export type EtohSubnavKey = (typeof ITEMS)[number]["key"];

export function EtohSubnav({ current }: { current: EtohSubnavKey }) {
  return (
    <nav aria-label="เมนูเอทานอล" className="mt-4 flex flex-wrap gap-2 border-b border-forest/10 pb-3">
      {ITEMS.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-current={item.key === current ? "page" : undefined}
          className={
            item.key === current
              ? "rounded-full bg-forest px-3 py-1 text-sm text-paper"
              : "rounded-full border border-forest/20 px-3 py-1 text-sm text-forest hover:bg-forest-mist"
          }
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
