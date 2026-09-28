import { EtohForm } from "@/components/etoh/EtohForm";
import { EtohSubnav } from "@/components/etoh/EtohSubnav";
import { savePackAndTierSettingsAction, savePriceEntryAction } from "@/app/actions/ops-etoh";
import { actorMay, requireOpsPage } from "@/lib/ops-auth";
import { ETOH_GRADES, ETOH_PACKS, ETOH_TIERS, getGrade, perKgFromPerLitre } from "@/lib/etoh/catalog";
import { bangkokToday, currentPrices, listPriceHistory, litresPerContainer, loadPriceBook } from "@/lib/etoh/repository";
import { formatThaiDate, formatThb } from "@/lib/etoh/ops-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const inputCls = "mt-1 w-full rounded border border-forest/20 px-3 py-2 text-sm";

export default async function EtohPricesPage() {
  const actor = await requireOpsPage("catalog.write");
  const canSeeCost = actorMay(actor, "factory.read");
  const prices = currentPrices();
  const history = listPriceHistory(undefined, 50);
  const book = loadPriceBook();
  const perContainer = litresPerContainer();
  const today = bangkokToday();

  return (
    <div>
      <h1 className="text-2xl font-bold text-forest">ราคา / บรรจุภัณฑ์ / ระดับราคา</h1>
      <p className="mt-1 max-w-3xl text-sm text-ink/70">
        ราคาฐานเก็บเป็นบาท/ลิตร (ไม่รวม VAT) ตั้งเป็นบาท/กก. ได้ — ระบบแปลงด้วย 1 กก. = 1.25 ลิตร (0.80 กก./ลิตร) มีผลตามวันที่ ราคาเก่าเก็บไว้ในประวัติ ใบเสนอราคาที่บันทึกแล้วไม่เปลี่ยนตาม
      </p>
      <EtohSubnav current="prices" />

      <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="rounded-xl border border-forest/15 bg-paper p-5">
          <h2 className="font-semibold text-forest">ราคาที่ใช้วันนี้</h2>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b border-forest/15 text-left text-forest">
                <th className="py-2 pr-2 font-semibold">เกรด</th>
                <th className="py-2 pr-2 text-right font-semibold">บาท/ลิตร</th>
                <th className="py-2 pr-2 text-right font-semibold">บาท/กก.</th>
                {canSeeCost ? <th className="py-2 pr-2 text-right font-semibold">ต้นทุน/ลิตร</th> : null}
                <th className="py-2 text-right font-semibold">มีผล</th>
              </tr>
            </thead>
            <tbody>
              {ETOH_GRADES.map((g) => {
                const p = prices[g.code];
                return (
                  <tr key={g.code} className="border-b border-forest/10">
                    <td className="py-2 pr-2">
                      {g.nameTh}
                      <span className="ml-1 font-mono text-xs text-ink/50">{g.code}</span>
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums">{p ? formatThb(p.basePricePerLitre) : "—"}</td>
                    <td className="py-2 pr-2 text-right tabular-nums text-ink/70">{p ? formatThb(perKgFromPerLitre(p.basePricePerLitre)) : "—"}</td>
                    {canSeeCost ? (
                      <td className="py-2 pr-2 text-right tabular-nums">
                        {p?.landedCostPerLitre != null ? formatThb(p.landedCostPerLitre) : "—"}
                      </td>
                    ) : null}
                    <td className="py-2 text-right text-ink/70">{p ? formatThaiDate(p.effectiveFrom) : "ยังไม่ตั้ง"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-forest/15 bg-paper p-5">
          <h2 className="font-semibold text-forest">ตั้งราคาใหม่</h2>
          <EtohForm action={savePriceEntryAction} submitLabel="บันทึกราคา" successLabel="บันทึกราคาแล้ว">
            <label className="block text-sm">
              <span className="font-medium">เกรด</span>
              <select name="gradeCode" className={inputCls} required>
                {ETOH_GRADES.map((g) => (
                  <option key={g.code} value={g.code}>
                    {g.nameTh}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium">หน่วยราคาที่กรอก</span>
                <select name="priceUnit" defaultValue="kg" className={inputCls}>
                  <option value="kg">บาท/กก. (แบบขายยกตู้)</option>
                  <option value="litre">บาท/ลิตร</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-medium">ราคาขายฐาน (ไม่รวม VAT)</span>
                <input name="basePrice" type="number" step="0.0001" min="0.01" required placeholder="เช่น 34.00" className={inputCls} />
              </label>
              {canSeeCost ? (
                <label className="block text-sm">
                  <span className="font-medium">ต้นทุนถึงคลัง (หน่วยเดียวกัน)</span>
                  <input name="landedCost" type="number" step="0.0001" min="0" placeholder="เช่น 30.00" className={inputCls} />
                </label>
              ) : null}
              <label className="block text-sm">
                <span className="font-medium">มีผลตั้งแต่</span>
                <input name="effectiveFrom" type="date" defaultValue={today} className={inputCls} />
              </label>
              <label className="block text-sm">
                <span className="font-medium">หมายเหตุ</span>
                <input name="note" placeholder="เช่น ตู้ล็อต 09/69 FX 36.2" className={inputCls} />
              </label>
            </div>
          </EtohForm>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-forest/15 bg-paper p-5">
        <h2 className="font-semibold text-forest">บรรจุภัณฑ์และระดับราคา</h2>
        <p className="mt-1 text-sm text-ink/65">
          ถัง 200 ลิตร / IBC เก็บมัดจำคืนได้ (ไม่อยู่ในฐาน VAT) · แกลลอนคิดค่าภาชนะ + ค่ารีแพ็ก + มาร์กอัปแพ็กเล็ก
        </p>
        <EtohForm action={savePackAndTierSettingsAction} submitLabel="บันทึกค่าบรรจุภัณฑ์และส่วนลด" className="mt-4 space-y-5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-forest/15 text-left text-forest">
                  <th className="py-2 pr-2 font-semibold">บรรจุภัณฑ์</th>
                  <th className="py-2 pr-2 font-semibold">ค่าภาชนะ (บาท)</th>
                  <th className="py-2 pr-2 font-semibold">มัดจำ (บาท)</th>
                  <th className="py-2 pr-2 font-semibold">ค่ารีแพ็ก (บาท)</th>
                  <th className="py-2 pr-2 font-semibold">มาร์กอัป %</th>
                  <th className="py-2 font-semibold">เปิดขาย</th>
                </tr>
              </thead>
              <tbody>
                {ETOH_PACKS.map((p) => {
                  const s = book.packs[p.code];
                  return (
                    <tr key={p.code} className="border-b border-forest/10">
                      <td className="py-2 pr-2">
                        {p.nameTh}
                        <span className="ml-1 text-xs text-ink/50">
                          {p.kind === "bulk" ? "Bulk" : p.kind === "returnable" ? "หมุนเวียน" : "ขายขาด"}
                        </span>
                      </td>
                      {(["containerCostThb", "depositThb", "repackCostThb", "smallPackMarkupPct"] as const).map((f) => (
                        <td key={f} className="py-2 pr-2">
                          <input
                            name={`${p.code}.${f}`}
                            type="number"
                            step="0.01"
                            min="0"
                            defaultValue={s[f]}
                            className="w-28 rounded border border-forest/20 px-2 py-1 text-right"
                          />
                        </td>
                      ))}
                      <td className="py-2">
                        <input type="checkbox" name={`${p.code}.active`} defaultChecked={s.active} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {ETOH_TIERS.map((t) => (
              <label key={t.code} className="block text-sm">
                <span className="font-medium">{t.nameTh} (%)</span>
                <input
                  name={`tier.${t.code}`}
                  type="number"
                  step="0.1"
                  min="0"
                  max="49"
                  defaultValue={book.tiers[t.code].discountPct}
                  className={inputCls}
                />
                <span className="mt-1 block text-xs text-ink/55">{t.rule}</span>
              </label>
            ))}
          </div>
          <label className="block max-w-xs text-sm">
            <span className="font-medium">ขนาดตู้นำเข้า (ลิตร/ตู้ ISO)</span>
            <input name="litresPerContainer" type="number" min="1000" max="40000" step="1" defaultValue={perContainer} className={inputCls} />
            <span className="mt-1 block text-xs text-ink/55">ใช้คิดเป้า/แดชบอร์ดและวางแผนนำเข้า · 20,000 กก. = 25,000 ลิตร</span>
          </label>
        </EtohForm>
      </section>

      <section className="mt-6 rounded-xl border border-forest/15 bg-paper p-5">
        <h2 className="font-semibold text-forest">ประวัติราคา (50 รายการล่าสุด)</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-forest/15 text-left text-forest">
                <th className="py-2 pr-2 font-semibold">มีผล</th>
                <th className="py-2 pr-2 font-semibold">เกรด</th>
                <th className="py-2 pr-2 text-right font-semibold">บาท/ลิตร</th>
                {canSeeCost ? <th className="py-2 pr-2 text-right font-semibold">ต้นทุน</th> : null}
                <th className="py-2 pr-2 font-semibold">หมายเหตุ</th>
                <th className="py-2 font-semibold">โดย</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-ink/60">
                    ยังไม่มีประวัติราคา
                  </td>
                </tr>
              ) : (
                history.map((h) => (
                  <tr key={h.id} className="border-b border-forest/10">
                    <td className="py-2 pr-2">{formatThaiDate(h.effectiveFrom)}</td>
                    <td className="py-2 pr-2">{getGrade(h.gradeCode).nameTh}</td>
                    <td className="py-2 pr-2 text-right tabular-nums">{formatThb(h.basePricePerLitre)}</td>
                    {canSeeCost ? (
                      <td className="py-2 pr-2 text-right tabular-nums">
                        {h.landedCostPerLitre != null ? formatThb(h.landedCostPerLitre) : "—"}
                      </td>
                    ) : null}
                    <td className="py-2 pr-2 text-ink/70">{h.note || "—"}</td>
                    <td className="py-2 text-xs text-ink/60">{h.createdBy}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
