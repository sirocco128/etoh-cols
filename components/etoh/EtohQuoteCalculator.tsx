"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  computeEtohQuoteAction,
  saveEtohQuoteAction,
  type EtohQuoteDraft,
} from "@/app/actions/ops-etoh";
import {
  ETOH_GRADES,
  ETOH_PACKS,
  ETOH_TIERS,
  type EtohGradeCode,
  type EtohPackCode,
  type EtohTierCode,
} from "@/lib/etoh/catalog";
import type { EtohQuoteResult } from "@/lib/etoh/pricing";

export type EtohCalcCustomer = {
  id: number;
  name: string;
  taxId: string | null;
  contact: string | null;
  tier: EtohTierCode;
  creditTermDays: number;
};

type Line = EtohQuoteDraft["lines"][number] & { key: number };

const thb = (n: number) =>
  n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qtyFmt = (n: number) => n.toLocaleString("th-TH");

let lineKey = 1;
function newLine(grade: EtohGradeCode = "IND95", pack: EtohPackCode = "DRUM200"): Line {
  lineKey += 1;
  return { key: lineKey, grade, pack, qty: 1, chargeDeposit: true, unitPriceOverrideThb: null };
}

export function EtohQuoteCalculator({
  customers,
  pricedGrades,
  canSave,
  canOverride,
}: {
  customers: EtohCalcCustomer[];
  pricedGrades: EtohGradeCode[];
  canSave: boolean;
  canOverride: boolean;
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerTaxId, setCustomerTaxId] = useState("");
  const [contact, setContact] = useState("");
  const [tier, setTier] = useState<EtohTierCode>("standard");
  const [deliveryFeeThb, setDeliveryFeeThb] = useState(0);
  const [extraDiscountThb, setExtraDiscountThb] = useState(0);
  const [validDays, setValidDays] = useState(7);
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>(() => [newLine(pricedGrades[0] ?? "IND95")]);
  const [result, setResult] = useState<EtohQuoteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [computing, startCompute] = useTransition();
  const seq = useRef(0);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId) ?? null,
    [customers, customerId],
  );

  const draft: EtohQuoteDraft = useMemo(
    () => ({
      customerId,
      customerName,
      customerTaxId,
      contact,
      customerTier: tier,
      deliveryFeeThb,
      extraDiscountThb,
      validDays,
      note,
      lines: lines.map((l) => ({
        grade: l.grade,
        pack: l.pack,
        qty: l.qty,
        chargeDeposit: l.chargeDeposit,
        unitPriceOverrideThb: l.unitPriceOverrideThb,
      })),
    }),
    [customerId, customerName, customerTaxId, contact, tier, deliveryFeeThb, extraDiscountThb, validDays, note, lines],
  );

  // Recalculate on the server (price book + permissions live there), debounced.
  useEffect(() => {
    const current = ++seq.current;
    const timer = setTimeout(() => {
      startCompute(async () => {
        const res = await computeEtohQuoteAction(draft);
        if (current !== seq.current) return;
        if (res.ok) {
          setResult(res.result);
          setError(null);
        } else {
          setResult(null);
          setError(res.error);
        }
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [draft]);

  function pickCustomer(idRaw: string) {
    const id = Number(idRaw) || null;
    setCustomerId(id);
    const c = customers.find((x) => x.id === id);
    if (c) {
      setCustomerName(c.name);
      setCustomerTaxId(c.taxId || "");
      setContact(c.contact || "");
      setTier(c.tier);
    }
  }

  function patchLine(key: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function save() {
    startSave(async () => {
      const res = await saveEtohQuoteAction(draft);
      if (res.ok) router.push(`/ops/etoh/quotes/${res.id}`);
      else setError(res.error);
    });
  }

  const inputCls = "mt-1 w-full rounded border border-forest/20 px-3 py-2 text-sm";

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="space-y-5 rounded-xl border border-forest/15 bg-paper p-5">
        <h2 className="font-semibold text-forest">ลูกค้า</h2>
        <label className="block text-sm">
          <span className="font-medium">เลือกจาก CRM</span>
          <select
            className={inputCls}
            value={customerId ?? ""}
            onChange={(e) => pickCustomer(e.target.value)}
          >
            <option value="">— ลูกค้าใหม่ / ไม่ผูก CRM —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {ETOH_TIERS.find((t) => t.code === c.tier)?.nameTh}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium">ชื่อบริษัทบนใบเสนอราคา</span>
            <input className={inputCls} value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="font-medium">เลขผู้เสียภาษี</span>
            <input
              className={`${inputCls} font-mono`}
              inputMode="numeric"
              value={customerTaxId}
              onChange={(e) => setCustomerTaxId(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">ผู้ติดต่อ</span>
            <input className={inputCls} value={contact} onChange={(e) => setContact(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="font-medium">ระดับราคา</span>
            <select
              className={inputCls}
              value={tier}
              disabled={Boolean(selectedCustomer)}
              onChange={(e) => setTier(e.target.value as EtohTierCode)}
            >
              {ETOH_TIERS.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.nameTh} — {t.rule}
                </option>
              ))}
            </select>
            {selectedCustomer ? (
              <span className="mt-1 block text-xs text-ink/60">
                ใช้ระดับจาก CRM · เครดิต {selectedCustomer.creditTermDays} วัน
              </span>
            ) : null}
          </label>
          <label className="block text-sm">
            <span className="font-medium">ยืนราคา (วัน)</span>
            <input
              type="number"
              min={1}
              max={90}
              className={inputCls}
              value={validDays}
              onChange={(e) => setValidDays(Number(e.target.value) || 7)}
            />
          </label>
        </div>

        <h2 className="pt-2 font-semibold text-forest">รายการสินค้า</h2>
        <div className="space-y-3">
          {lines.map((line) => {
            const pack = ETOH_PACKS.find((p) => p.code === line.pack);
            return (
              <div key={line.key} className="rounded-lg border border-forest/10 p-3">
                <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_0.6fr_auto]">
                  <label className="block text-xs">
                    <span className="font-medium">เกรด</span>
                    <select
                      className={inputCls}
                      value={line.grade}
                      onChange={(e) => patchLine(line.key, { grade: e.target.value as EtohGradeCode })}
                    >
                      {ETOH_GRADES.map((g) => (
                        <option key={g.code} value={g.code} disabled={!pricedGrades.includes(g.code)}>
                          {g.nameTh}
                          {pricedGrades.includes(g.code) ? "" : " (ยังไม่ตั้งราคา)"}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs">
                    <span className="font-medium">บรรจุภัณฑ์</span>
                    <select
                      className={inputCls}
                      value={line.pack}
                      onChange={(e) => patchLine(line.key, { pack: e.target.value as EtohPackCode })}
                    >
                      {ETOH_PACKS.map((p) => (
                        <option key={p.code} value={p.code}>
                          {p.nameTh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs">
                    <span className="font-medium">จำนวน</span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      className={inputCls}
                      value={line.qty}
                      onChange={(e) => patchLine(line.key, { qty: Math.max(1, Math.floor(Number(e.target.value) || 1)) })}
                    />
                  </label>
                  <button
                    type="button"
                    className="self-end rounded border border-forest/20 px-3 py-2 text-xs text-ink/70 disabled:opacity-40"
                    disabled={lines.length === 1}
                    onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                    aria-label="ลบรายการ"
                  >
                    ลบ
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-ink/70">
                  <span>= {qtyFmt((pack?.litres ?? 0) * line.qty)} ลิตร</span>
                  {pack?.kind === "returnable" ? (
                    <label className="inline-flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={line.chargeDeposit}
                        onChange={(e) => patchLine(line.key, { chargeDeposit: e.target.checked })}
                      />
                      เก็บมัดจำภาชนะ
                    </label>
                  ) : null}
                  {canOverride ? (
                    <label className="inline-flex items-center gap-1.5">
                      ราคาพิเศษ/หน่วย
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="อัตโนมัติ"
                        className="w-28 rounded border border-forest/20 px-2 py-1"
                        value={line.unitPriceOverrideThb ?? ""}
                        onChange={(e) =>
                          patchLine(line.key, {
                            unitPriceOverrideThb: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                      />
                    </label>
                  ) : null}
                </div>
              </div>
            );
          })}
          <button
            type="button"
            className="rounded border border-dashed border-forest/30 px-3 py-2 text-sm text-forest"
            onClick={() => setLines((prev) => [...prev, newLine(pricedGrades[0] ?? "IND95")])}
          >
            + เพิ่มรายการ
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium">ค่าขนส่ง (บาท)</span>
            <input
              type="number"
              min={0}
              className={inputCls}
              value={deliveryFeeThb}
              onChange={(e) => setDeliveryFeeThb(Math.max(0, Number(e.target.value) || 0))}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">ส่วนลดท้ายบิล (บาท)</span>
            <input
              type="number"
              min={0}
              className={inputCls}
              value={extraDiscountThb}
              onChange={(e) => setExtraDiscountThb(Math.max(0, Number(e.target.value) || 0))}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium">หมายเหตุบนใบเสนอราคา</span>
            <textarea className={inputCls} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-forest/15 bg-paper p-5" aria-live="polite">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-forest">สรุปราคา</h2>
          {computing ? <span className="text-xs text-ink/50">กำลังคำนวณ…</span> : null}
        </div>
        {error ? (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}
        {result ? (
          <>
            <p className="rounded-lg bg-forest-mist px-3 py-2 text-sm text-forest">
              {result.tierReason}
              {result.appliedDiscountPct > 0 ? ` · ส่วนลด ${result.appliedDiscountPct}%` : ""}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-forest/15 text-left text-forest">
                    <th className="py-2 pr-2 font-semibold">รายการ</th>
                    <th className="py-2 pr-2 text-right font-semibold">จำนวน</th>
                    <th className="py-2 pr-2 text-right font-semibold">ราคา/หน่วย</th>
                    <th className="py-2 pr-2 text-right font-semibold">บาท/ลิตร</th>
                    <th className="py-2 text-right font-semibold">รวม</th>
                  </tr>
                </thead>
                <tbody>
                  {result.lines.map((l, i) => (
                    <tr key={`${l.sku}-${i}`} className="border-b border-forest/10 align-top">
                      <td className="py-2 pr-2">
                        <p>{l.label}</p>
                        <p className="font-mono text-xs text-ink/50">
                          {l.sku} · {qtyFmt(l.litres)} ล. · {qtyFmt(l.kg)} กก.
                          {l.overridden ? " · ราคาพิเศษ" : ""}
                        </p>
                        {l.marginPct != null ? (
                          <p className="text-xs text-ink/60">
                            ต้นทุน {thb(l.costTotalThb ?? 0)} · กำไร {thb(l.marginThb ?? 0)} ({l.marginPct}%)
                          </p>
                        ) : null}
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums">{qtyFmt(l.qty)}</td>
                      <td className="py-2 pr-2 text-right tabular-nums">{thb(l.unitPriceThb)}</td>
                      <td className="py-2 pr-2 text-right tabular-nums">{thb(l.pricePerLitreThb)}</td>
                      <td className="py-2 text-right tabular-nums">{thb(l.lineTotalThb)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="ml-auto max-w-sm space-y-1 text-sm tabular-nums">
              <Row label="มูลค่าสินค้า" value={thb(result.goodsThb)} />
              {result.deliveryFeeThb > 0 ? <Row label="ค่าขนส่ง" value={thb(result.deliveryFeeThb)} /> : null}
              {result.extraDiscountThb > 0 ? <Row label="ส่วนลดท้ายบิล" value={`−${thb(result.extraDiscountThb)}`} /> : null}
              <Row label="ยอดก่อน VAT" value={thb(result.vatBaseThb)} />
              <Row label="VAT 7%" value={thb(result.vatThb)} />
              {result.depositThb > 0 ? <Row label="มัดจำภาชนะ (คืนได้ ไม่มี VAT)" value={thb(result.depositThb)} /> : null}
              <div className="flex justify-between border-t border-forest/20 pt-2 text-base font-bold text-forest">
                <dt>ยอดชำระรวม</dt>
                <dd>{thb(result.grandTotalThb)}</dd>
              </div>
              <p className="pt-1 text-xs text-ink/60">
                รวม {qtyFmt(result.totalLitres)} ลิตร · ประมาณ {qtyFmt(result.totalKg)} กก.
              </p>
              {result.marginPct != null ? (
                <p className="text-xs text-ink/60">
                  กำไรขั้นต้นรวม {thb(result.marginThb ?? 0)} ({result.marginPct}%)
                </p>
              ) : null}
            </dl>
            {result.warnings.length ? (
              <ul className="list-disc space-y-1 rounded-lg border border-amber-200 bg-amber-50 py-2 pl-8 pr-3 text-sm text-amber-900">
                {result.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : null}
            {canSave ? (
              <button
                type="button"
                onClick={save}
                disabled={saving || !customerName.trim()}
                className="min-h-11 w-full rounded-lg bg-forest px-5 py-2.5 text-sm font-medium text-paper disabled:opacity-60"
              >
                {saving ? "กำลังบันทึก…" : customerName.trim() ? "บันทึกเป็นใบเสนอราคา" : "ใส่ชื่อลูกค้าก่อนบันทึก"}
              </button>
            ) : (
              <p className="text-xs text-ink/60">สิทธิ์ของคุณดูราคาได้อย่างเดียว</p>
            )}
          </>
        ) : !error ? (
          <p className="text-sm text-ink/60">กำลังเตรียมราคา…</p>
        ) : null}
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink/70">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
