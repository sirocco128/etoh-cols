import Link from "next/link";
import { OpsCycleForm } from "@/components/OpsCycleForm";
import { adjustStockAction, transferStockAction } from "@/app/actions/ops-stock";
import { requireOpsPage } from "@/lib/ops-auth";
import { listLocations } from "@/lib/wms-repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SearchParams = Promise<{ ok?: string }>;

export default async function StockAdjustPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireOpsPage("stock.write");
  const sp = await searchParams;
  const locations = listLocations();

  return (
    <div>
      <p className="text-sm">
        <Link href="/ops/stock" className="text-forest underline-offset-2 hover:underline">
          ← คลังสินค้า
        </Link>
      </p>
      <h1 className="mt-3 text-2xl font-bold text-forest">ปรับ / โอนสต็อก</h1>
      {sp.ok ? (
        <p className="mt-4 rounded-lg bg-forest/10 px-3 py-2 text-sm text-forest">
          บันทึกแล้ว ({sp.ok === "xfer" ? "โอนย้าย" : "ปรับยอด"})
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-forest/15 bg-paper p-5">
          <h2 className="font-semibold text-forest">ปรับยอด</h2>
          <p className="mt-1 text-xs text-ink/60">ใส่จำนวนเป็นบวกหรือลบ (เช่น -2)</p>
          <div className="mt-4">
            <OpsCycleForm action={adjustStockAction} submitLabel="ปรับยอด">
              <label className="block text-sm">
                <span className="font-medium">รหัสสินค้า</span>
                <input name="productKey" required className="mt-1 w-full rounded border border-forest/20 px-3 py-2 font-mono" />
              </label>
              <label className="block text-sm">
                <span className="font-medium">ที่เก็บ</span>
                <select name="locationCode" className="mt-1 w-full rounded border border-forest/20 px-3 py-2">
                  {locations.map((loc) => (
                    <option key={loc.locationCode} value={loc.locationCode}>
                      {loc.locationCode} · {loc.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-medium">จำนวนที่เปลี่ยน (±)</span>
                <input name="qtyDelta" type="number" required className="mt-1 w-full rounded border border-forest/20 px-3 py-2" />
              </label>
              <label className="block text-sm">
                <span className="font-medium">หมายเหตุ</span>
                <input name="memo" className="mt-1 w-full rounded border border-forest/20 px-3 py-2" />
              </label>
            </OpsCycleForm>
          </div>
        </div>

        <div className="rounded-xl border border-forest/15 bg-paper p-5">
          <h2 className="font-semibold text-forest">โอนระหว่างที่เก็บ</h2>
          <div className="mt-4">
            <OpsCycleForm action={transferStockAction} submitLabel="โอนสต็อก">
              <label className="block text-sm">
                <span className="font-medium">รหัสสินค้า</span>
                <input name="productKey" required className="mt-1 w-full rounded border border-forest/20 px-3 py-2 font-mono" />
              </label>
              <label className="block text-sm">
                <span className="font-medium">จาก</span>
                <select name="fromLocation" className="mt-1 w-full rounded border border-forest/20 px-3 py-2">
                  {locations.map((loc) => (
                    <option key={`from-${loc.locationCode}`} value={loc.locationCode}>
                      {loc.locationCode} · {loc.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-medium">ไป</span>
                <select name="toLocation" defaultValue="BIN-QC" className="mt-1 w-full rounded border border-forest/20 px-3 py-2">
                  {locations.map((loc) => (
                    <option key={`to-${loc.locationCode}`} value={loc.locationCode}>
                      {loc.locationCode} · {loc.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-medium">จำนวน</span>
                <input name="qty" type="number" min={1} required className="mt-1 w-full rounded border border-forest/20 px-3 py-2" />
              </label>
              <label className="block text-sm">
                <span className="font-medium">หมายเหตุ</span>
                <input name="memo" className="mt-1 w-full rounded border border-forest/20 px-3 py-2" />
              </label>
            </OpsCycleForm>
          </div>
        </div>
      </div>
    </div>
  );
}
