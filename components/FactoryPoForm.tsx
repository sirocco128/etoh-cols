"use client";

import { useActionState, useMemo, useState } from "react";
import { saveFactoryPoAction } from "@/app/actions/ops-factory-po";
import type { OpsActionResult } from "@/app/actions/ops";
import {
  FACTORY_PLATFORMS,
  FACTORY_PLATFORM_LABELS,
  FACTORY_PO_STATUSES,
  FACTORY_PO_STATUS_LABELS,
  FREIGHT_MODES,
  FREIGHT_MODE_LABELS,
  type FactoryPoRecord,
} from "@/lib/factory-po-types";
import { computePoCost } from "@/lib/po-cost";
import { formatThb } from "@/lib/th-billing";
import { LOGO_DECORATION_OPTIONS } from "@/lib/product-decoration";

const initial: OpsActionResult | null = null;

function num(value: number | null | undefined): string {
  if (value == null || value === 0) return "";
  return String(value);
}

export function FactoryPoForm({
  orderId,
  po,
  defaults,
}: {
  orderId: string;
  po?: FactoryPoRecord | null;
  defaults?: {
    productName?: string;
    quantity?: number;
    fxCnyThb?: number;
    shipToName?: string | null;
    shipToPhone?: string | null;
    shipToAddress?: string | null;
    shipToProvince?: string | null;
    destinationMode?: string | null;
  };
}) {
  const [state, action, pending] = useActionState(saveFactoryPoAction, initial);
  const [quantity, setQuantity] = useState(String(po?.quantity || defaults?.quantity || 1));
  const [unitCny, setUnitCny] = useState(num(po?.factoryUnitCny));
  const [amountCny, setAmountCny] = useState(num(po?.factoryAmountCny));
  const [fx, setFx] = useState(String(po?.fxCnyThb || defaults?.fxCnyThb || 5));
  const [inland, setInland] = useState(num(po?.inlandThb));
  const [freight, setFreight] = useState(num(po?.freightThb));
  const [duty, setDuty] = useState(num(po?.importDutyThb));
  const [customs, setCustoms] = useState(num(po?.customsFeeThb));
  const [packing, setPacking] = useState(num(po?.packingThb));
  const [lastMile, setLastMile] = useState(num(po?.lastMileThb));

  const preview = useMemo(() => {
    return computePoCost({
      quantity: Number(quantity) || 0,
      factoryUnitCny: Number(unitCny) || 0,
      factoryAmountCny: Number(amountCny) || undefined,
      fxCnyThb: Number(fx) || 5,
      inlandThb: Number(inland) || 0,
      freightThb: Number(freight) || 0,
      importDutyThb: Number(duty) || 0,
      customsFeeThb: Number(customs) || 0,
      packingThb: Number(packing) || 0,
      lastMileThb: Number(lastMile) || 0,
    });
  }, [quantity, unitCny, amountCny, fx, inland, freight, duty, customs, packing, lastMile]);

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="orderId" value={orderId} />
      {po ? <input type="hidden" name="poId" value={po.poId} /> : null}

      <section className="rounded-xl border border-forest/15 bg-paper p-5">
        <h2 className="text-lg font-semibold text-forest">โรงงานจีน</h2>
        <p className="mt-1 text-sm text-ink/65">
          ใบนี้ส่งสเปคและต้นทุนกลับโรงงาน — ลูกค้าและเซลล์ไม่เห็นราคา CNY
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium">ชื่อโรงงาน / ผู้ขาย</span>
            <input
              name="factoryName"
              required
              defaultValue={po?.factoryName || ""}
              className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">ช่องทาง</span>
            <select
              name="factoryPlatform"
              defaultValue={po?.factoryPlatform || "other"}
              className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
            >
              {FACTORY_PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {FACTORY_PLATFORM_LABELS[p]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium">รหัสสินค้าโรงงาน (ถ้ามี)</span>
            <input
              name="sourceOfferId"
              defaultValue={po?.sourceOfferId || ""}
              className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium">ผู้ติดต่อโรงงาน</span>
            <input
              name="factoryContact"
              defaultValue={po?.factoryContact || ""}
              className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">สถานะใบสั่ง</span>
            <select
              name="status"
              defaultValue={po?.status || "draft"}
              className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
            >
              {FACTORY_PO_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {FACTORY_PO_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-forest/15 bg-paper p-5">
        <h2 className="text-lg font-semibold text-forest">สเปคผลิตและโลโก้</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium">ชื่อสินค้า</span>
            <input
              name="productName"
              defaultValue={po?.productName || defaults?.productName || ""}
              className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">จำนวน</span>
            <input
              name="quantity"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">สี</span>
            <input
              name="color"
              defaultValue={po?.color || ""}
              className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">วัสดุ</span>
            <input
              name="material"
              defaultValue={po?.material || ""}
              className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">วิธีสกรีนโลโก้</span>
            <select
              name="decorationMethod"
              defaultValue={po?.decorationMethod || ""}
              className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
            >
              <option value="">ยังไม่ระบุ</option>
              {LOGO_DECORATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium">ตำแหน่งโลโก้</span>
            <input
              name="logoPosition"
              defaultValue={po?.logoPosition || ""}
              className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium">รายละเอียดโลโก้ / สีพิมพ์</span>
            <textarea
              name="logoNotes"
              rows={3}
              defaultValue={po?.logoNotes || ""}
              className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium">แพ็กเกจ / การ์ด / โบว์</span>
            <textarea
              name="packagingNotes"
              rows={2}
              defaultValue={po?.packagingNotes || ""}
              className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium">จุดตรวจคุณภาพ</span>
            <textarea
              name="qcNotes"
              rows={2}
              defaultValue={po?.qcNotes || ""}
              className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
            />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-brass/40 bg-brass/5 p-5">
        <h2 className="text-lg font-semibold text-forest">ต้นทุนต่อใบสั่ง — จนถึงส่งลูกค้า</h2>
        <p className="mt-1 text-sm text-ink/65">
          เมื่อสถานะเป็น «โรงงานยืนยันแล้ว» ขึ้นไป ระบบจะลงบัญชีต้นทุนอัตโนมัติ
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="font-medium">ราคาต่อชิ้น (CNY)</span>
            <input
              name="factoryUnitCny"
              type="number"
              step="0.01"
              min={0}
              value={unitCny}
              onChange={(e) => setUnitCny(e.target.value)}
              className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">รวมโรงงาน (CNY) — ว่างแล้วคูณจำนวน</span>
            <input
              name="factoryAmountCny"
              type="number"
              step="0.01"
              min={0}
              value={amountCny}
              onChange={(e) => setAmountCny(e.target.value)}
              className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">อัตราแลกเปลี่ยน CNY→THB</span>
            <input
              name="fxCnyThb"
              type="number"
              step="0.01"
              min={0.01}
              value={fx}
              onChange={(e) => setFx(e.target.value)}
              className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">ขนส่งในจีน (บาท)</span>
            <input
              name="inlandThb"
              type="number"
              step="0.01"
              min={0}
              value={inland}
              onChange={(e) => setInland(e.target.value)}
              className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">ขนส่งจีน–ไทย (บาท)</span>
            <input
              name="freightThb"
              type="number"
              step="0.01"
              min={0}
              value={freight}
              onChange={(e) => setFreight(e.target.value)}
              className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">รูปแบบขนส่ง</span>
            <select
              name="freightMode"
              defaultValue={po?.freightMode || ""}
              className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
            >
              <option value="">ยังไม่ระบุ</option>
              {FREIGHT_MODES.map((m) => (
                <option key={m} value={m}>
                  {FREIGHT_MODE_LABELS[m]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium">ภาษีนำเข้า (บาท)</span>
            <input
              name="importDutyThb"
              type="number"
              step="0.01"
              min={0}
              value={duty}
              onChange={(e) => setDuty(e.target.value)}
              className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">ค่าพิธีการศุลกากร (บาท)</span>
            <input
              name="customsFeeThb"
              type="number"
              step="0.01"
              min={0}
              value={customs}
              onChange={(e) => setCustoms(e.target.value)}
              className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">แพ็กในไทย (บาท)</span>
            <input
              name="packingThb"
              type="number"
              step="0.01"
              min={0}
              value={packing}
              onChange={(e) => setPacking(e.target.value)}
              className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium">จัดส่งถึงลูกค้า (บาท)</span>
            <input
              name="lastMileThb"
              type="number"
              step="0.01"
              min={0}
              value={lastMile}
              onChange={(e) => setLastMile(e.target.value)}
              className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
            />
          </label>
        </div>
        <dl className="mt-5 grid gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-paper px-3 py-2">
            <dt className="text-xs text-ink/55">โรงงาน (บาท)</dt>
            <dd className="font-semibold">{formatThb(preview.factoryThb)}</dd>
          </div>
          <div className="rounded-lg bg-paper px-3 py-2">
            <dt className="text-xs text-ink/55">ต้นทุนขาย</dt>
            <dd className="font-semibold">{formatThb(preview.cogsThb)}</dd>
          </div>
          <div className="rounded-lg bg-paper px-3 py-2">
            <dt className="text-xs text-ink/55">ค่าจัดส่ง/แพ็ก</dt>
            <dd className="font-semibold">{formatThb(preview.sellingExpenseThb)}</dd>
          </div>
          <div className="rounded-lg bg-forest px-3 py-2 text-paper">
            <dt className="text-xs text-paper/70">ต้นทุนลงเรือรวม</dt>
            <dd className="text-lg font-semibold">{formatThb(preview.landedTotalThb)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-forest/15 bg-paper p-5">
        <h2 className="text-lg font-semibold text-forest">นำส่งลูกค้าในไทย</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium">ปลายทางรับของ</span>
            <select
              name="destinationMode"
              defaultValue={po?.destinationMode || defaults?.destinationMode || "warehouse"}
              className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
            >
              <option value="warehouse">เข้าคลังไทย</option>
              <option value="ship_to">ไม่เข้าคลัง — ส่งตรงลูกค้า</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium">ผู้รับ</span>
            <input
              name="shipToName"
              defaultValue={po?.shipToName || defaults?.shipToName || ""}
              className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">โทรศัพท์</span>
            <input
              name="shipToPhone"
              defaultValue={po?.shipToPhone || defaults?.shipToPhone || ""}
              className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium">ที่อยู่จัดส่ง</span>
            <textarea
              name="shipToAddress"
              rows={2}
              defaultValue={po?.shipToAddress || defaults?.shipToAddress || ""}
              className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">จังหวัด</span>
            <input
              name="shipToProvince"
              defaultValue={po?.shipToProvince || defaults?.shipToProvince || ""}
              className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">เลขติดตามจีน</span>
            <input
              name="trackingCn"
              defaultValue={po?.trackingCn || ""}
              className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium">เลขติดตามไทย</span>
            <input
              name="trackingTh"
              defaultValue={po?.trackingTh || ""}
              className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium">หมายเหตุภายใน</span>
            <textarea
              name="notes"
              rows={2}
              defaultValue={po?.notes || ""}
              className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
            />
          </label>
        </div>
      </section>

      {state && !state.ok ? (
        <p className="text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-forest px-5 py-2.5 text-sm font-medium text-paper disabled:opacity-60"
      >
        {pending ? "กำลังบันทึก…" : po ? "บันทึกใบสั่งโรงงาน" : "สร้างใบสั่งโรงงาน"}
      </button>
    </form>
  );
}
