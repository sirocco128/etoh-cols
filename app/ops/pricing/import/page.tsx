import Link from "next/link";
import { OpsPriceImport } from "@/components/OpsPriceImport";
import { getFxGuide } from "@/lib/fx-rates";
import { actorMay, requireOpsPage } from "@/lib/ops-auth";
import { listPriceConfigs } from "@/lib/ops-price-batch";
import { isSmartgiftMysqlEnabled } from "@/lib/smartgift-mysql";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function OpsPriceImportPage() {
  const actor = await requireOpsPage("quotes.read");
  const fx = await getFxGuide();
  const savedConfigs = listPriceConfigs();

  return (
    <div>
      <p className="text-sm">
        <Link href="/ops/pricing" className="text-forest underline-offset-2 hover:underline">
          ← คิดทีละชุด
        </Link>
      </p>
      <h1 className="mt-3 text-2xl font-bold text-forest">นำเข้า Excel แล้วอัปเดตราคาขาย</h1>
      <p className="mt-1 max-w-3xl text-sm text-ink/70">
        อ่านไฟล์โรงงาน คิดต้นทุนตามสูตรเดียวกับเว็บ ดูพรีวิวทั้งตาราง ส่งออกไปรีเช็ค
        แล้วค่อยกดอัปเดตช่วงราคาและบันไดจำนวนที่ลูกค้าสั่งได้ — คอลัมน์รหัสต้องเป็นรหัสโรงงาน
        ไม่ใช่รหัสขาย A00001 / B00001 / C00003
      </p>
      <div className="mt-6">
        <OpsPriceImport
          canSeeCost={actorMay(actor, "factory.read")}
          canApply={actorMay(actor, "catalog.write")}
          mysqlOn={isSmartgiftMysqlEnabled()}
          fxCny={fx.cnyThb}
          savedConfigs={savedConfigs}
        />
      </div>
    </div>
  );
}
