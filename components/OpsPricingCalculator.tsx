"use client";

import { useEffect, useMemo, useState, useTransition, Fragment } from "react";
import {
  computeOpsPricingAction,
  searchOpsCatalogAction,
} from "@/app/actions/ops-pricing";
import { PriceDisclaimer } from "@/components/PriceDisclaimer";
import {
  FormulaBandLegend,
  FormulaCheckNote,
} from "@/components/FormulaCheckNote";
import type { OpsCatalogItem, OpsQuoteRow } from "@/lib/ops-pricing";
import { DEFAULT_PACKAGING_MAX_THB, DEFAULT_PACKAGING_MIN_THB } from "@/lib/product-price-options";
import { formatThb } from "@/lib/th-billing";
import { PRICE_DISCLAIMER_FULL } from "@/lib/ux-copy";

type Brand = {
  name: string;
  legalName: string;
  phone: string;
  email: string;
  lineId: string;
};

type BasketItem = {
  slug: string;
  name: string;
  image: string;
  qty: number;
  sellMin: number;
  sellMax: number;
  includeFreight: boolean;
  includePackaging: boolean;
};

const MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

function money(n: number): string {
  return formatThb(n);
}

export function OpsPricingCalculator({
  catalog,
  brand,
  canSeeCost,
  fxGuide,
  initialSlug,
}: {
  catalog: OpsCatalogItem[];
  brand: Brand;
  canSeeCost: boolean;
  fxGuide: { cnyThb: number; source: string; live: boolean };
  initialSlug?: string;
}) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState(catalog);
  const [slug, setSlug] = useState(initialSlug || "");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [mode, setMode] = useState<"auto" | "truck" | "sea">("auto");
  const [includeFreight, setIncludeFreight] = useState(true);
  const [includePackaging, setIncludePackaging] = useState(false);
  const [profile, setProfile] = useState<"standard" | "corporate">("standard");
  const [extraQty, setExtraQty] = useState("");
  const [origin, setOrigin] = useState("guangzhou_shenzhen");
  const [category, setCategory] = useState("general");
  const [cnyToThb, setCnyToThb] = useState(String(fxGuide.cnyThb));
  const [factoryCny, setFactoryCny] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [lengthCm, setLengthCm] = useState("");
  const [widthCm, setWidthCm] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [rows, setRows] = useState<OpsQuoteRow[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [product, setProduct] = useState<OpsCatalogItem | null>(
    catalog.find((item) => item.slug === initialSlug) || null,
  );
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [pending, startTransition] = useTransition();

  const selected = product || items.find((item) => item.slug === slug) || null;

  useEffect(() => {
    const handle = setTimeout(() => {
      startTransition(async () => {
        const result = await searchOpsCatalogAction(query);
        if (result.ok) setItems(result.items);
      });
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (!slug) {
      setRows([]);
      setNote("เลือกสินค้าจากแคตตาล็อกเว็บ");
      return;
    }
    const handle = setTimeout(() => {
      startTransition(async () => {
        const result = await computeOpsPricingAction({
          slug,
          extraQty: extraQty === "" ? undefined : Number(extraQty),
          includeFreight,
          includePackaging,
          month,
          profile,
          forceMode: mode === "auto" ? undefined : mode,
          origin,
          category,
          cnyToThb: Number(cnyToThb),
          factoryCny: factoryCny === "" ? undefined : Number(factoryCny),
          weightKg: weightKg === "" ? undefined : Number(weightKg),
          lengthCm: lengthCm === "" ? undefined : Number(lengthCm),
          widthCm: widthCm === "" ? undefined : Number(widthCm),
          heightCm: heightCm === "" ? undefined : Number(heightCm),
        });
        if (!result.ok) {
          setError(result.error);
          setRows([]);
          return;
        }
        setError("");
        setRows(result.rows);
        setNote(result.note);
        if (result.product) setProduct(result.product);
      });
    }, 200);
    return () => clearTimeout(handle);
  }, [
    slug,
    extraQty,
    includeFreight,
    includePackaging,
    month,
    profile,
    mode,
    origin,
    category,
    cnyToThb,
    factoryCny,
    weightKg,
    lengthCm,
    widthCm,
    heightCm,
  ]);

  const sheetRows = useMemo(() => {
    if (basket.length) return basket;
    if (!selected || !rows.length) return [];
    const pick = rows[rows.length - 1]!;
    return [
      {
        slug: selected.slug,
        name: selected.name,
        image: selected.image,
        qty: pick.qty,
        sellMin: pick.sellMin,
        sellMax: pick.sellMax,
        includeFreight,
        includePackaging,
      },
    ];
  }, [basket, selected, rows, includeFreight, includePackaging]);

  function addCurrent() {
    if (!selected || !rows.length) return;
    const pick =
      rows.find((row) => extraQty && row.qty === Math.floor(Number(extraQty))) ||
      rows[rows.length - 1]!;
    setBasket((prev) => {
      const next = prev.filter((item) => item.slug !== selected.slug);
      next.push({
        slug: selected.slug,
        name: selected.name,
        image: selected.image,
        qty: pick.qty,
        sellMin: pick.sellMin,
        sellMax: pick.sellMax,
        includeFreight,
        includePackaging,
      });
      return next;
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
      <section className="rounded-xl border border-forest/15 bg-paper p-4 print:hidden">
        <label className="block text-sm">
          <span className="font-medium text-forest">ค้นแคตตาล็อกเว็บ</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ชื่อชุด หรือ slug"
            className="mt-1 w-full rounded border border-forest/20 px-3 py-2 text-sm"
          />
        </label>
        <ul className="mt-3 max-h-[70vh] space-y-2 overflow-y-auto">
          {items.map((item) => (
            <li key={item.slug}>
              <button
                type="button"
                onClick={() => {
                  setSlug(item.slug);
                  setProduct(item);
                }}
                className={`flex w-full gap-3 rounded-lg border p-2 text-left text-sm hover:border-brass/50 ${
                  slug === item.slug
                    ? "border-brass bg-brass/10"
                    : "border-forest/10"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded object-cover bg-forest-mist/40"
                />
                <span className="min-w-0">
                  <span className="block font-medium text-forest line-clamp-2">
                    {item.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink/60">
                    {item.priceRange} · ขั้นต่ำ {item.minOrder}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="space-y-4">
        <form
          className="rounded-xl border border-forest/15 bg-paper p-4 print:hidden"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-forest">
                {selected?.name || "ยังไม่ได้เลือกสินค้า"}
              </h2>
              <p className="mt-1 text-xs text-ink/60">
                {pending ? "กำลังคิดราคา…" : note}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={addCurrent}
                disabled={!rows.length}
                className="rounded border border-forest/20 px-3 py-2 text-sm disabled:opacity-50"
              >
                ใส่ใบราคา
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                disabled={!sheetRows.length}
                className="rounded bg-forest px-3 py-2 text-sm font-medium text-paper disabled:opacity-50"
              >
                พิมพ์ / PDF
              </button>
            </div>
          </div>

          {error ? (
            <p className="mt-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm">
              <span className="text-ink/70">เดือนจัดส่งจากจีน</span>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="mt-1 w-full rounded border border-forest/20 px-2 py-2"
              >
                {MONTHS.map((label, i) => (
                  <option key={label} value={i + 1}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-ink/70">วิธีส่งจีน→ไทย</span>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as typeof mode)}
                className="mt-1 w-full rounded border border-forest/20 px-2 py-2"
              >
                <option value="auto">ตามกฎเว็บ (ฤดู=รถ, ≥5 CBM=เรือ)</option>
                <option value="truck">บังคับรถ</option>
                <option value="sea">บังคับเรือ</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="text-ink/70">จำนวนที่ลูกค้าขอ</span>
              <input
                type="number"
                min={1}
                value={extraQty}
                onChange={(e) => setExtraQty(e.target.value)}
                placeholder="เช่น 80"
                className="mt-1 w-full rounded border border-forest/20 px-2 py-2"
              />
            </label>
            {canSeeCost ? (
              <label className="text-sm">
                <span className="text-ink/70">
                  อัตรา CNY→THB
                  <span className="ml-1 text-xs text-ink/50">
                    {fxGuide.live ? fxGuide.source : "ค่าเริ่มต้นระบบ"}
                  </span>
                </span>
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={cnyToThb}
                  onChange={(e) => setCnyToThb(e.target.value)}
                  className="mt-1 w-full rounded border border-forest/20 px-2 py-2"
                />
              </label>
            ) : (
              <p className="self-end text-xs text-ink/55">
                แพ็กไทย +{DEFAULT_PACKAGING_MIN_THB}–{DEFAULT_PACKAGING_MAX_THB} บาท/ชุด
              </p>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <div className="flex rounded border border-forest/20">
              <button
                type="button"
                className={`px-3 py-1.5 ${profile === "standard" ? "bg-forest text-paper" : ""}`}
                onClick={() => setProfile("standard")}
              >
                ทั่วไป (ราคาเว็บ)
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 ${profile === "corporate" ? "bg-forest text-paper" : ""}`}
                onClick={() => setProfile("corporate")}
              >
                องค์กร (1.47×)
              </button>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeFreight}
                onChange={(e) => setIncludeFreight(e.target.checked)}
              />
              รวมค่าขนส่งจากจีน (ค่าเริ่มต้นบนเว็บ)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includePackaging}
                onChange={(e) => setIncludePackaging(e.target.checked)}
              />
              รวมแพ็กในไทย (+{DEFAULT_PACKAGING_MIN_THB}–{DEFAULT_PACKAGING_MAX_THB} บาท)
            </label>
          </div>

          {canSeeCost ? (
            <details className="mt-4 rounded border border-forest/10 p-3 text-sm">
              <summary className="cursor-pointer font-medium text-forest">
                ต้นทุนโรงงาน / กล่อง (ผู้ดูแล)
              </summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label>
                  ต้นทุน CNY/ชุด
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={factoryCny}
                    onChange={(e) => setFactoryCny(e.target.value)}
                    placeholder="จาก offer"
                    className="mt-1 w-full rounded border border-forest/20 px-2 py-1.5"
                  />
                </label>
                <label>
                  คลังจีน
                  <select
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="mt-1 w-full rounded border border-forest/20 px-2 py-1.5"
                  >
                    <option value="guangzhou_shenzhen">กว่างโจว / เซินเจิ้น</option>
                    <option value="yiwu">อี้อู</option>
                  </select>
                </label>
                <label>
                  ประเภทสินค้า
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1 w-full rounded border border-forest/20 px-2 py-1.5"
                  >
                    <option value="general">ทั่วไป</option>
                    <option value="electronic_tisi">ไฟฟ้า / มอก.</option>
                  </select>
                </label>
                <label>
                  กก./ชิ้น
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="mt-1 w-full rounded border border-forest/20 px-2 py-1.5"
                  />
                </label>
                <label>
                  กว้าง ซม.
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={lengthCm}
                    onChange={(e) => setLengthCm(e.target.value)}
                    className="mt-1 w-full rounded border border-forest/20 px-2 py-1.5"
                  />
                </label>
                <label>
                  ยาว ซม.
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={widthCm}
                    onChange={(e) => setWidthCm(e.target.value)}
                    className="mt-1 w-full rounded border border-forest/20 px-2 py-1.5"
                  />
                </label>
                <label>
                  สูง ซม.
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    className="mt-1 w-full rounded border border-forest/20 px-2 py-1.5"
                  />
                </label>
              </div>
            </details>
          ) : null}
        </form>

        <section className="rounded-xl border border-forest/15 bg-paper p-4 print:hidden">
          <h2 className="text-lg font-semibold text-forest">บันไดจำนวน</h2>
          <FormulaBandLegend profile={profile} className="mt-2" />
          {rows.length ? (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-forest/15 text-left text-ink/60">
                    <th className="py-2">จำนวน</th>
                    <th>ราคา/ชุด</th>
                    {includePackaging ? <th>ช่วงแพ็ก</th> : null}
                    <th>ที่มา</th>
                    {canSeeCost ? <th>ต้นทุนรวม</th> : null}
                    {canSeeCost ? <th>กำไรขั้นต้นทั้งออเดอร์</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const colCount =
                      3 +
                      (includePackaging ? 1 : 0) +
                      (canSeeCost ? 2 : 0);
                    return (
                      <Fragment key={row.qty}>
                        <tr className="border-b border-forest/10">
                          <td className="py-2 font-medium">{row.qty} ชุด</td>
                          <td className="font-semibold text-forest">
                            {money(row.sellThb)}
                          </td>
                          {includePackaging ? (
                            <td className="text-ink/70">
                              {money(row.sellMin)}–{money(row.sellMax)}
                            </td>
                          ) : null}
                          <td className="text-ink/60">
                            {row.belowFloor
                              ? "ต่ำกว่าพื้นกำไร"
                              : row.source === "landed"
                                ? row.mode === "sea"
                                  ? "สูตรเว็บ · เรือ"
                                  : "สูตรเว็บ · รถ"
                                : "ช่วงบนเว็บ"}
                          </td>
                          {canSeeCost ? (
                            <td>{row.cost ? money(row.cost.landedCostThb) : "—"}</td>
                          ) : null}
                          {canSeeCost ? (
                            <td>{row.cost ? money(row.cost.gpThb) : "—"}</td>
                          ) : null}
                        </tr>
                        {row.formulaNote ? (
                          <tr className="border-b border-forest/10 bg-forest-mist/40">
                            <td colSpan={colCount} className="py-2">
                              <FormulaCheckNote note={row.formulaNote} />
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink/65">เลือกสินค้าแล้วระบบจะแตกจำนวนให้</p>
          )}
          <PriceDisclaimer variant="short" className="mt-4" />
        </section>

        {basket.length ? (
          <section className="rounded-xl border border-forest/15 bg-paper p-4 print:hidden">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-forest">
                รายการในใบราคา ({basket.length})
              </h2>
              <button
                type="button"
                className="text-sm text-ink/70 underline"
                onClick={() => setBasket([])}
              >
                ล้าง
              </button>
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              {basket.map((item) => (
                <li key={item.slug} className="flex justify-between gap-3">
                  <span>
                    {item.name} · {item.qty} ชุด
                  </span>
                  <span className="font-medium">
                    {item.sellMin === item.sellMax
                      ? money(item.sellMin)
                      : `${money(item.sellMin)}–${money(item.sellMax)}`}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="hidden print:block">
          <header className="border-b border-forest/20 pb-4">
            <p className="text-xs tracking-wide text-ink/55">ใบเสนอราคาโดยประมาณ</p>
            <h1 className="mt-1 text-2xl font-bold text-forest">{brand.legalName}</h1>
            <p className="text-sm text-ink/70">{brand.name}</p>
            <p className="mt-2 text-sm">
              โทร {brand.phone} · {brand.email} · LINE {brand.lineId}
            </p>
          </header>
          <ul className="mt-6 space-y-4">
            {sheetRows.map((item) => (
              <li key={item.slug} className="flex gap-4 border-b border-forest/10 pb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image}
                  alt=""
                  className="h-24 w-24 object-cover"
                />
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="mt-1 text-sm">จำนวนอ้างอิง {item.qty} ชุด</p>
                  <p className="mt-1 text-lg font-bold text-forest">
                    {item.sellMin === item.sellMax
                      ? `${money(item.sellMin)} / ชุด`
                      : `${money(item.sellMin)}–${money(item.sellMax)} / ชุด`}
                  </p>
                  <p className="text-xs text-ink/60">
                    {item.includeFreight ? "รวมค่าขนส่งจากจีนโดยประมาณ" : "ยังไม่รวมค่าขนส่งจากจีน"}
                    {item.includePackaging ? " · รวมแพ็กในไทย" : " · ยังไม่รวมแพ็กในไทย"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs leading-relaxed text-ink/70">
            {PRICE_DISCLAIMER_FULL} ราคานี้ยังไม่รวม VAT 7%
          </p>
        </section>
      </div>
    </div>
  );
}
