import Link from "next/link";
import { redirect } from "next/navigation";
import { OpsCycleForm } from "@/components/OpsCycleForm";
import { receiveGoodsAction } from "@/app/actions/ops-cycle";
import { listPos } from "@/lib/factory-po-service";
import { isOpsAuthConfigured, requireOpsActor } from "@/lib/ops-auth";
import {
  factoryPayableSnapshot,
  listGoodsReceipts,
} from "@/lib/ops-cycle-service";
import {
  DESTINATION_LABELS,
  DESTINATIONS,
} from "@/lib/ops-cycle-types";
import { formatThaiDateTime, formatThb } from "@/lib/th-billing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SearchParams = Promise<{ ok?: string; poId?: string; claim?: string }>;

export default async function InboundPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!isOpsAuthConfigured() || !(await requireOpsActor("factory.write"))) {
    redirect("/ops/login");
  }
  const sp = await searchParams;
  const pos = listPos({ status: "all" }).filter(
    (po) => po.status !== "cancelled" && po.status !== "draft",
  );
  const selectedPoId = (sp.poId || pos[0]?.poId || "").trim();
  const snap = selectedPoId ? factoryPayableSnapshot(selectedPoId) : null;
  const receipts = listGoodsReceipts({ limit: 40 });

  return (
    <div>
      <p className="text-sm">
        <Link href="/ops/cycle" className="text-forest underline-offset-2 hover:underline">
          ← วงจรปฏิบัติการ
        </Link>
      </p>
      <h1 className="mt-3 text-2xl font-bold text-forest">รับสินค้าเข้า</h1>
      <p className="mt-1 text-sm text-ink/70">
        รับตามใบสั่งโรงงาน — เข้าคลังไทย หรือไม่เข้าคลังส่งตรงลูกค้า
      </p>
      {sp.ok ? (
        <p className="mt-4 rounded-lg bg-forest/10 px-3 py-2 text-sm text-forest">
          บันทึกใบรับ {sp.ok} แล้ว
          {" · "}
          <Link
            href={`/ops/inbound/${encodeURIComponent(sp.ok)}/print`}
            className="underline-offset-2 hover:underline"
          >
            พรีวิว / PDF
          </Link>
          {sp.claim ? (
            <>
              {" · เปิดเคลมของเสีย "}
              <Link
                href={`/ops/claims?ok=${encodeURIComponent(sp.claim)}`}
                className="font-mono underline-offset-2 hover:underline"
              >
                {sp.claim}
              </Link>
            </>
          ) : null}
        </p>
      ) : null}

      <div className="mt-6 rounded-xl border border-forest/15 bg-paper p-5">
        <OpsCycleForm action={receiveGoodsAction} submitLabel="บันทึกการรับ">
          <label className="block text-sm">
            <span className="font-medium">ใบสั่งโรงงาน</span>
            <select
              name="poId"
              defaultValue={selectedPoId}
              className="mt-1 w-full rounded border border-forest/20 px-3 py-2 font-mono"
            >
              {pos.length === 0 ? (
                <option value="">ยังไม่มีใบสั่งที่รับได้</option>
              ) : null}
              {pos.map((po) => (
                <option key={po.poId} value={po.poId}>
                  {po.poId} · {po.productName} · ค้างรับ {Math.max(0, po.quantity - po.receivedQty)} ชิ้น
                </option>
              ))}
            </select>
          </label>
          {snap ? (
            <p className="text-xs text-ink/60">
              สั่ง {snap.orderedQty} · รับแล้ว {snap.receivedQty} · ค้าง{" "}
              {snap.remainingQty} · ต้นทุนต่อชิ้น {formatThb(snap.unitThb)} ·{" "}
              {DESTINATION_LABELS[snap.destination]}
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="font-medium">จำนวนที่รับดี</span>
              <input
                name="qtyReceived"
                type="number"
                min={1}
                required
                defaultValue={snap?.remainingQty || ""}
                className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">เสีย / ไม่ผ่าน QC</span>
              <input
                name="qtyDamaged"
                type="number"
                min={0}
                defaultValue={0}
                className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">ปลายทาง</span>
              <select
                name="destination"
                defaultValue={snap?.destination || "warehouse"}
                className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
              >
                {DESTINATIONS.map((d) => (
                  <option key={d} value={d}>
                    {DESTINATION_LABELS[d]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm">
            <span className="font-medium">เลขติดตามไทย</span>
            <input name="trackingTh" className="mt-1 w-full rounded border border-forest/20 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="font-medium">บันทึก QC</span>
            <textarea
              name="qcNotes"
              rows={2}
              className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
            />
          </label>
        </OpsCycleForm>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-forest">ใบรับล่าสุด</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-forest/15 text-forest">
              <th className="px-2 py-2">ใบรับ</th>
              <th className="px-2 py-2">PO</th>
              <th className="px-2 py-2">ปลายทาง</th>
              <th className="px-2 py-2 text-right">จำนวน</th>
              <th className="px-2 py-2 text-right">ยอดตามรับ</th>
              <th className="px-2 py-2">เมื่อ</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {receipts.map((row) => (
              <tr key={row.receiptId} className="border-b border-forest/10">
                <td className="px-2 py-2 font-mono text-xs">{row.receiptId}</td>
                <td className="px-2 py-2 font-mono text-xs">
                  <Link href={`/ops/factory-po/${row.poId}`} className="underline-offset-2 hover:underline">
                    {row.poId}
                  </Link>
                </td>
                <td className="px-2 py-2">{DESTINATION_LABELS[row.destination]}</td>
                <td className="px-2 py-2 text-right">{row.qtyReceived}</td>
                <td className="px-2 py-2 text-right">{formatThb(row.amountThb)}</td>
                <td className="px-2 py-2 text-ink/70">{formatThaiDateTime(row.receivedAt)}</td>
                <td className="px-2 py-2">
                  <Link
                    href={`/ops/inbound/${encodeURIComponent(row.receiptId)}/print`}
                    className="text-forest underline-offset-2 hover:underline"
                  >
                    พรีวิว / PDF
                  </Link>
                  {row.qtyDamaged > 0 ? (
                    <span className="ml-2 text-xs text-ink/60">เสีย {row.qtyDamaged}</span>
                  ) : null}
                </td>
              </tr>
            ))}
            {receipts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-2 py-6 text-ink/55">
                  ยังไม่มีใบรับสินค้า
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
