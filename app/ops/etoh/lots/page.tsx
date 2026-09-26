import { EtohForm } from "@/components/etoh/EtohForm";
import { EtohSubnav } from "@/components/etoh/EtohSubnav";
import { createLotAction, updateLotAction } from "@/app/actions/ops-etoh";
import { actorMay, requireOpsPage } from "@/lib/ops-auth";
import { ETOH_GRADES, getGrade, isGradeCode } from "@/lib/etoh/catalog";
import {
  bangkokToday,
  ETOH_LOT_STATUS_LABELS,
  ETOH_LOT_STATUSES,
  getSetting,
  listLots,
  type EtohLotStatus,
} from "@/lib/etoh/repository";
import { planContainers } from "@/lib/etoh/pricing";
import { formatThaiDate } from "@/lib/etoh/ops-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SearchParams = Promise<{ grade?: string; status?: string }>;

const inputCls = "mt-1 w-full rounded border border-forest/20 px-3 py-2 text-sm";

export default async function EtohLotsPage({ searchParams }: { searchParams: SearchParams }) {
  const actor = await requireOpsPage("stock.read");
  const sp = await searchParams;
  const grade = isGradeCode(sp.grade) ? sp.grade : undefined;
  const status = (ETOH_LOT_STATUSES as readonly string[]).includes(sp.status || "")
    ? (sp.status as EtohLotStatus)
    : undefined;
  const lots = listLots({ gradeCode: grade, status });
  const canWrite = actorMay(actor, "stock.write");
  const today = bangkokToday();
  const releasedLitres = lots.filter((l) => l.status === "released").reduce((s, l) => s + l.receivedLitres, 0);
  const drumsPerContainer = Number(getSetting("drums_per_container", "80")) || 80;
  const plan = planContainers(releasedLitres, drumsPerContainer);

  return (
    <div>
      <h1 className="text-2xl font-bold text-forest">ล็อตนำเข้า / CoA</h1>
      <p className="mt-1 max-w-3xl text-sm text-ink/70">
        ทุกตู้ที่เข้าคลังเปิดเป็นล็อต สถานะเริ่มที่ &quot;รอตรวจ&quot; ปล่อยขายได้เมื่อมีผล CoA แล้วเท่านั้น
        เกรดอาหารต้องมีเลขอ้างอิง อย. และล็อตหมดอายุปล่อยขายไม่ได้
      </p>
      <EtohSubnav current="lots" />

      <p className="mt-4 text-sm text-ink/70">
        ล็อตที่ปล่อยขายในรายการนี้รวม {releasedLitres.toLocaleString("th-TH")} ลิตร ≈ {plan.drums.toLocaleString("th-TH")} ถัง
        ({plan.containers} ตู้ ที่ {drumsPerContainer} ถัง/ตู้)
      </p>

      <div className="mt-4 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div>
          <form method="get" className="flex flex-wrap gap-2">
            <select name="grade" defaultValue={grade || ""} className="rounded border border-forest/20 px-3 py-2 text-sm">
              <option value="">ทุกเกรด</option>
              {ETOH_GRADES.map((g) => (
                <option key={g.code} value={g.code}>
                  {g.nameTh}
                </option>
              ))}
            </select>
            <select name="status" defaultValue={status || ""} className="rounded border border-forest/20 px-3 py-2 text-sm">
              <option value="">ทุกสถานะ</option>
              {ETOH_LOT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ETOH_LOT_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded bg-forest px-4 py-2 text-sm text-paper">
              กรอง
            </button>
          </form>

          <div className="mt-4 space-y-3">
            {lots.length === 0 ? (
              <p className="rounded-xl border border-forest/10 p-6 text-center text-sm text-ink/60">ยังไม่มีล็อต</p>
            ) : (
              lots.map((lot) => {
                const expired = Boolean(lot.expiryDate && lot.expiryDate < today);
                return (
                  <div key={lot.id} className="rounded-xl border border-forest/15 bg-paper p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-mono font-semibold text-forest">{lot.lotNo}</p>
                        <p className="text-sm">{getGrade(lot.gradeCode).nameTh}</p>
                        <p className="text-xs text-ink/60">
                          {lot.receivedLitres.toLocaleString("th-TH")} ลิตร · ตู้ {lot.containerNo || "—"} · B/L {lot.blNo || "—"} · เข้า{" "}
                          {formatThaiDate(lot.arrivalDate)}
                        </p>
                        <p className="text-xs text-ink/60">
                          {lot.supplierName || "ไม่ระบุผู้ขาย"}
                          {lot.originCountry ? ` · ${lot.originCountry}` : ""} · CoA{" "}
                          {lot.coaPurityPct != null ? `${lot.coaPurityPct}%` : "ยังไม่มี"}
                          {lot.gradeCode === "FOOD" ? ` · อย. ${lot.fdaRef || "ยังไม่มี"}` : ""}
                          {lot.expiryDate ? ` · หมดอายุ ${formatThaiDate(lot.expiryDate)}` : ""}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs ${
                          lot.status === "released"
                            ? "bg-forest text-paper"
                            : lot.status === "blocked" || expired
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {expired && lot.status !== "depleted" ? "หมดอายุ" : ETOH_LOT_STATUS_LABELS[lot.status]}
                      </span>
                    </div>
                    {canWrite && lot.status !== "depleted" ? (
                      <EtohForm action={updateLotAction} submitLabel="อัปเดต" compact className="mt-3 flex flex-wrap items-end gap-2 text-xs">
                        <input type="hidden" name="lotId" value={lot.id} />
                        <label>
                          CoA %
                          <input name="coaPurityPct" type="number" step="0.01" min="0" max="100" defaultValue={lot.coaPurityPct ?? ""} className="ml-1 w-20 rounded border border-forest/20 px-2 py-1" />
                        </label>
                        {lot.gradeCode === "FOOD" ? (
                          <label>
                            เลข อย.
                            <input name="fdaRef" defaultValue={lot.fdaRef ?? ""} className="ml-1 w-32 rounded border border-forest/20 px-2 py-1" />
                          </label>
                        ) : null}
                        <select name="status" defaultValue="" className="rounded border border-forest/20 px-2 py-1">
                          <option value="">— คงสถานะ —</option>
                          {ETOH_LOT_STATUSES.filter((s) => s !== lot.status).map((s) => (
                            <option key={s} value={s}>
                              {ETOH_LOT_STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      </EtohForm>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {canWrite ? (
          <div className="rounded-xl border border-forest/15 bg-paper p-5">
            <h2 className="font-semibold text-forest">รับล็อตใหม่</h2>
            <EtohForm action={createLotAction} submitLabel="เปิดล็อต" className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="font-medium">เลขล็อต</span>
                  <input name="lotNo" required placeholder="L6909-IND95-01" className={`${inputCls} font-mono`} />
                </label>
                <label className="block text-sm">
                  <span className="font-medium">เกรด</span>
                  <select name="gradeCode" className={inputCls}>
                    {ETOH_GRADES.map((g) => (
                      <option key={g.code} value={g.code}>
                        {g.nameTh}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="font-medium">ปริมาณรับเข้า (ลิตร)</span>
                  <input name="receivedLitres" type="number" min="1" required className={inputCls} />
                </label>
                <label className="block text-sm">
                  <span className="font-medium">วันที่เข้าคลัง</span>
                  <input name="arrivalDate" type="date" defaultValue={today} className={inputCls} />
                </label>
                <label className="block text-sm">
                  <span className="font-medium">เลขตู้</span>
                  <input name="containerNo" placeholder="MSKU1234567" className={`${inputCls} font-mono`} />
                </label>
                <label className="block text-sm">
                  <span className="font-medium">เลข B/L</span>
                  <input name="blNo" className={inputCls} />
                </label>
                <label className="block text-sm">
                  <span className="font-medium">ผู้ขาย / ผู้ผลิต</span>
                  <input name="supplierName" className={inputCls} />
                </label>
                <label className="block text-sm">
                  <span className="font-medium">ประเทศต้นทาง</span>
                  <input name="originCountry" className={inputCls} />
                </label>
                <label className="block text-sm">
                  <span className="font-medium">CoA ความบริสุทธิ์ (%)</span>
                  <input name="coaPurityPct" type="number" step="0.01" min="0" max="100" className={inputCls} />
                </label>
                <label className="block text-sm">
                  <span className="font-medium">วันหมดอายุ</span>
                  <input name="expiryDate" type="date" className={inputCls} />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="font-medium">เลขอ้างอิง อย. (เกรดอาหาร)</span>
                  <input name="fdaRef" className={inputCls} />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="font-medium">หมายเหตุ</span>
                  <input name="note" className={inputCls} />
                </label>
              </div>
            </EtohForm>
          </div>
        ) : null}
      </div>
    </div>
  );
}
