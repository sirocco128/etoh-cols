import { redirect } from "next/navigation";
import { OpsCatalogImageSearch } from "@/components/OpsCatalogImageSearch";
import { listCatalogSourceImages } from "@/lib/catalog-source-images";
import { products } from "@/lib/data";
import { isOpsAuthConfigured, requireOpsSession } from "@/lib/ops-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function OpsCatalogImagesPage() {
  if (!isOpsAuthConfigured()) redirect("/ops/login");
  if (!(await requireOpsSession())) redirect("/ops/login");

  const saved = listCatalogSourceImages(48);

  return (
    <div>
      <h1 className="text-2xl font-bold text-forest">รูปจากเว็บโรงงาน</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink/70">
        ให้ Gemini ค้นหน้ารายการจริงบน 1688 และ Alibaba แล้วบันทึกรูปลงฐานข้อมูลภายใน
        ไม่ใช่รูปที่สร้างขึ้น และยังไม่แสดงบนหน้าร้าน
      </p>
      <div className="mt-6">
        <OpsCatalogImageSearch
          products={products.map((product) => ({
            slug: product.slug,
            name: product.name,
          }))}
          saved={saved}
        />
      </div>
    </div>
  );
}
