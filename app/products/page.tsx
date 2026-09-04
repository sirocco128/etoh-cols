import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EmptyState } from "@/components/EmptyState";
import { PriceDisclaimer } from "@/components/PriceDisclaimer";
import { getProducts } from "@/lib/strapi";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "สินค้าพรีเมียม",
  description:
    "แคตตาล็อกสินค้า Gift Set พรีเมียมสำหรับองค์กร พร้อมช่วงราคาโดยประมาณและจำนวนสั่งผลิตขั้นต่ำ",
  alternates: { canonical: "/products" },
};

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="mx-auto max-w-content px-4 py-12 sm:px-6 sm:py-16">
      <Breadcrumbs items={[{ label: "สินค้าพรีเมียม" }]} />
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold text-forest sm:text-4xl">สินค้าพรีเมียม</h1>
        <p className="mt-3 text-ink/75">
          เลือกรูปแบบเซ็ต แล้วปรับโลโก้ วัสดุ และบรรจุภัณฑ์ตามแบรนด์ —
          กดเข้าไปดูรายละเอียดแล้วขอใบเสนอราคาได้ทันที
        </p>
      </div>

      {products.length === 0 ? (
        <EmptyState
          title="ยังไม่มีสินค้าในแคตตาล็อก"
          description="ขณะนี้ยังไม่มีรายการเผยแพร่ ติดต่อทีมขายเพื่อขอคำแนะนำเซ็ตที่เหมาะกับงบและโอกาสของคุณ"
          actionHref="/contact"
          actionLabel="ขอคำแนะนำจากทีมขาย"
        />
      ) : (
        <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <li key={product.slug}>
              <Link href={`/products/${product.slug}`} className="group block">
                <div className="relative aspect-square overflow-hidden rounded-2xl bg-forest-mist">
                  <Image
                    src={product.images[0] || "/images/product-placeholder.jpg"}
                    alt={product.name}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="(max-width:768px) 100vw, 33vw"
                  />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-forest group-hover:text-brass">
                  {product.name}
                </h2>
                <p className="mt-2 text-sm text-ink/70">
                  ประมาณ {product.priceRange || "สอบถามราคา"}
                </p>
                <p className="mt-1 text-sm text-ink/60">
                  สั่งขั้นต่ำ {product.minOrder} เซ็ต
                </p>
                <p className="mt-2 text-sm font-medium text-brass">
                  ดูรายละเอียดและขอราคา →
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {products.length > 0 ? <PriceDisclaimer className="mt-8" /> : null}
    </div>
  );
}
