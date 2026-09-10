import Link from "next/link";
import { requireOpsPage } from "@/lib/ops-auth";
import { listBalances, stockDashboard } from "@/lib/wms-repository";
import { listPos } from "@/lib/factory-po-queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function StockPage() {
  await requireOpsPage("stock.read");
  const dash = stockDashboard();
  const balances = listBalances({ limit: 300 });
  const openInbound = listPos({ status: "all" }).filter(
    (po) =>
      po.status !== "cancelled" &&
      po.status !== "draft" &&
      po.receivedQty < po.quantity,
  ).length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-forest">คลังสินค้า</h1>
      <p className="mt-1 text-sm text-ink/70">
        คงเหลือตาม SKU และที่เก็บ · จองแล้ว · พร้อมขาย
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "SKU มีของ", value: dash.skuCount },
          { label: "ชิ้นในคลัง", value: dash.onHandUnits },
          { label: "จองแล้ว", value: dash.reservedUnits },
          { label: "พร้อมขาย", value: dash.availableUnits },
          { label: "ค้างรับ PO", value: openInbound },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-forest/15 bg-paper px-4 py-3"
          >
            <p className="text-xs text-ink/60">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-forest">
              {card.value.toLocaleString("th-TH")}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link href="/ops/inbound" className="text-forest underline-offset-2 hover:underline">
          รับสินค้าเข้า
        </Link>
        <Link href="/ops/stock/movements" className="text-forest underline-offset-2 hover:underline">
          เคลื่อนไหว
        </Link>
        <Link href="/ops/stock/adjust" className="text-forest underline-offset-2 hover:underline">
          ปรับ / โอน
        </Link>
        <Link href="/ops/stock/counts" className="text-forest underline-offset-2 hover:underline">
          ตรวจนับ
        </Link>
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-forest/15 text-forest">
              <th className="px-2 py-2">SKU</th>
              <th className="px-2 py-2">ที่เก็บ</th>
              <th className="px-2 py-2 text-right">บนมือ</th>
              <th className="px-2 py-2 text-right">จอง</th>
              <th className="px-2 py-2 text-right">พร้อมขาย</th>
              <th className="px-2 py-2">อัปเดต</th>
            </tr>
          </thead>
          <tbody>
            {balances.map((row) => (
              <tr key={`${row.productKey}-${row.locationId}`} className="border-b border-forest/10">
                <td className="px-2 py-2 font-mono text-xs">{row.productKey}</td>
                <td className="px-2 py-2">
                  {row.locationCode}
                  {row.locationName ? ` · ${row.locationName}` : ""}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">{row.qtyOnHand}</td>
                <td className="px-2 py-2 text-right tabular-nums">{row.qtyReserved}</td>
                <td className="px-2 py-2 text-right font-medium tabular-nums text-forest">
                  {row.qtyAvailable}
                </td>
                <td className="px-2 py-2 text-xs text-ink/60">
                  {row.updatedAt.slice(0, 16).replace("T", " ")}
                </td>
              </tr>
            ))}
            {balances.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-2 py-8 text-ink/55">
                  ยังไม่มีสต็อก — รับสินค้าเข้าจากใบสั่งโรงงานก่อน
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
