import Link from "next/link";
import { requireOpsPage } from "@/lib/ops-auth";
import { listMovements } from "@/lib/wms-repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function StockMovementsPage() {
  await requireOpsPage("stock.read");
  const rows = listMovements({ limit: 200 });

  return (
    <div>
      <p className="text-sm">
        <Link href="/ops/stock" className="text-forest underline-offset-2 hover:underline">
          ← คลังสินค้า
        </Link>
      </p>
      <h1 className="mt-3 text-2xl font-bold text-forest">เคลื่อนไหวสต็อก</h1>
      <p className="mt-1 text-sm text-ink/70">ประวัติรับ / จอง / ตัด / ปรับ / โอน / ตรวจนับ</p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-forest/15 text-forest">
              <th className="px-2 py-2">เมื่อ</th>
              <th className="px-2 py-2">ชนิด</th>
              <th className="px-2 py-2">SKU</th>
              <th className="px-2 py-2 text-right">Δ บนมือ</th>
              <th className="px-2 py-2 text-right">Δ จอง</th>
              <th className="px-2 py-2">อ้างอิง</th>
              <th className="px-2 py-2">โดย</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.movementKey} className="border-b border-forest/10">
                <td className="px-2 py-2 text-xs text-ink/70">
                  {row.createdAt.slice(0, 19).replace("T", " ")}
                </td>
                <td className="px-2 py-2 font-mono text-xs">{row.kind}</td>
                <td className="px-2 py-2 font-mono text-xs">{row.productKey}</td>
                <td className="px-2 py-2 text-right tabular-nums">{row.qtyDelta}</td>
                <td className="px-2 py-2 text-right tabular-nums">{row.qtyReservedDelta}</td>
                <td className="px-2 py-2 text-xs text-ink/70">
                  {[row.receiptId, row.orderId, row.reservationId, row.memo]
                    .filter(Boolean)
                    .join(" · ")}
                </td>
                <td className="px-2 py-2 text-xs">{row.actor || "—"}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-2 py-8 text-ink/55">
                  ยังไม่มีการเคลื่อนไหว
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
