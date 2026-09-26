import Link from "next/link";
import { EtohBarChart } from "@/components/etoh/EtohBarChart";
import { EtohForm } from "@/components/etoh/EtohForm";
import { EtohSubnav } from "@/components/etoh/EtohSubnav";
import { saveTargetAction } from "@/app/actions/ops-etoh";
import { actorMay, requireOpsPage } from "@/lib/ops-auth";
import { buildDashboard, shiftMonth } from "@/lib/etoh/dashboard";
import { formatThb } from "@/lib/etoh/ops-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function monthLabel(mk: string, long = false): string {
  const [y, m] = mk.split("-").map(Number) as [number, number];
  const be = y + 543;
  return long ? `${TH_MONTHS[m - 1]} ${be}` : `${TH_MONTHS[m - 1]} ${String(be).slice(2)}`;
}

const n = (v: number) => v.toLocaleString("th-TH", { maximumFractionDigits: 1 });

export default async function EtohDashboardPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const actor = await requireOpsPage("reports.read");
  const sp = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(sp.m || "") ? sp.m : undefined;
  const d = buildDashboard(month);
  const pctCapped = Math.min(100, d.delivered.pct);
  const pacePct = d.target.litres > 0 ? Math.min(100, (d.paceLitres / d.target.litres) * 100) : 0;
  const behind = d.delivered.litres < d.paceLitres;
  const isCurrent = d.month === d.today.slice(0, 7);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-forest">ภาพรวมยอดขายเอทานอล</h1>
          <p className="mt-1 text-sm text-ink/70">นับจากลิตรในใบส่งของ (จุดออกใบกำกับภาษี) · เป้า {d.target.containers} ตู้/เดือน = {n(d.target.litres)} ลิตร</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link href={`/ops/etoh/dashboard?m=${shiftMonth(d.month, -1)}`} className="rounded border border-forest/20 px-3 py-1.5 text-forest">←</Link>
          <span className="min-w-24 text-center font-semibold text-forest">{monthLabel(d.month, true)}</span>
          {!isCurrent ? (
            <Link href={`/ops/etoh/dashboard?m=${shiftMonth(d.month, 1)}`} className="rounded border border-forest/20 px-3 py-1.5 text-forest">→</Link>
          ) : (
            <span className="w-9" />
          )}
        </div>
      </div>
      <EtohSubnav current="dashboard" />

      {/* Hero: progress vs target */}
      <section className="mt-6 rounded-2xl border border-forest/15 bg-paper p-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm text-ink/60">ส่งแล้วเดือนนี้</p>
            <p className="font-display text-5xl font-extrabold tabular-nums text-forest">
              {n(d.delivered.containers)} <span className="text-2xl font-semibold text-ink/60">/ {d.target.containers} ตู้</span>
            </p>
            <p className="mt-1 text-sm text-ink/70 tabular-nums">
              {n(d.delivered.litres)} ลิตร · {d.delivered.pct}% ของเป้า · {d.delivered.shipments} ใบส่งของ · มูลค่า {formatThb(d.delivered.subtotal)} บาท (ก่อน VAT)
            </p>
          </div>
          {isCurrent ? (
            <div className="text-right text-sm">
              <p className={behind ? "font-semibold text-red-700" : "font-semibold text-forest"}>
                {behind ? `ช้ากว่าเป้าตามวัน ${n(d.paceLitres - d.delivered.litres)} ลิตร` : "เร็วกว่าเป้าตามวัน"}
              </p>
              <p className="text-ink/60 tabular-nums">คาดการณ์สิ้นเดือน ≈ {n(d.projectedLitres)} ลิตร</p>
            </div>
          ) : null}
        </div>
        <div className="relative mt-5 h-3 rounded-full bg-forest-mist" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={d.delivered.pct} aria-label="ยอดส่งเทียบเป้า">
          <div className="h-3 rounded-full bg-[#1553b7] dark:bg-[#4f8ff0]" style={{ width: `${pctCapped}%` }} />
          {isCurrent ? (
            <div className="absolute -top-1 h-5 w-0.5 bg-brass" style={{ left: `${pacePct}%` }} title="เป้าตามวันที่ผ่านไป" />
          ) : null}
        </div>
        {isCurrent ? <p className="mt-1.5 text-xs text-ink/55">เส้นส้ม = ควรถึงเท่านี้ ณ วันนี้ ถ้ากระจายเท่ากันทั้งเดือน</p> : null}
      </section>

      {/* KPI tiles */}
      <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Tile label="คำขอราคาจากเว็บเดือนนี้" value={String(d.rfqThisMonth)} href="/ops/inquiries" />
        <Tile label="ใบเสนอราคาเปิดอยู่" value={String(d.quotes.openCount)} sub={`${formatThb(d.quotes.openValue)} บาท`} href="/ops/etoh/quotes" />
        <Tile
          label="อัตราปิดการขาย (90 วัน)"
          value={d.quotes.winRate90d == null ? "—" : `${d.quotes.winRate90d}%`}
          sub={`ยืนยันเดือนนี้ ${d.quotes.acceptedThisMonth} / สร้าง ${d.quotes.createdThisMonth}`}
        />
        <Tile
          label="ลูกหนี้ค้างรับ"
          value={formatThb(d.receivables.outstanding)}
          sub={d.receivables.overdueCount ? `เกินกำหนด ${d.receivables.overdueCount} ใบ` : "ไม่มีเกินกำหนด"}
          tone={d.receivables.overdueCount ? "warn" : undefined}
          href="/ops/etoh/followups"
        />
        <Tile label="ลูกค้าถึงรอบสั่ง" value={String(d.followupsDue)} sub="รอโทรตาม" tone={d.followupsDue ? "warn" : undefined} href="/ops/etoh/followups" />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-forest/15 bg-paper p-5">
          <h2 className="font-semibold text-forest">ลิตรที่ส่ง 6 เดือนล่าสุด</h2>
          <p className="text-xs text-ink/55">เส้นส้ม = เป้า {n(d.target.litres)} ลิตร/เดือน</p>
          <div className="mt-3">
            <EtohBarChart
              caption="ลิตรที่ส่งต่อเดือน 6 เดือนล่าสุด"
              unit="ลิตร"
              target={d.target.litres}
              targetLabel={`เป้า ${d.target.containers} ตู้`}
              highlightKey={d.month}
              bars={d.history.map((h) => ({ key: h.month, label: monthLabel(h.month), value: h.litres, detail: `≈ ${n(h.containers)} ตู้` }))}
            />
          </div>
        </div>
        <div className="rounded-2xl border border-forest/15 bg-paper p-5">
          <h2 className="font-semibold text-forest">สต็อกพร้อมขายตามเกรด</h2>
          <p className="text-xs text-ink/55">ล็อตที่ปล่อยขายแล้วและยังไม่หมดอายุ · ใช้ได้กี่เดือนคิดจากยอดส่งเฉลี่ย 3 เดือน</p>
          <div className="mt-3">
            <EtohBarChart
              orientation="horizontal"
              caption="สต็อกพร้อมขายตามเกรด"
              unit="ล."
              bars={d.stock.map((s) => ({
                key: s.grade,
                label: s.name,
                value: s.litres,
                detail: s.monthsCover == null ? "ยังไม่มียอดส่ง" : `พอขาย ≈ ${n(s.monthsCover)} เดือน`,
              }))}
            />
          </div>
          <ul className="mt-2 flex flex-wrap gap-2 text-xs">
            {d.stock
              .filter((s) => s.monthsCover != null && s.monthsCover < 1)
              .map((s) => (
                <li key={s.grade} className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-900">
                  ⚠ {s.name} เหลือ &lt; 1 เดือน — วางแผนสั่งตู้
                </li>
              ))}
          </ul>
        </div>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-forest/15 bg-paper p-5">
          <h2 className="font-semibold text-forest">ลูกค้าสูงสุดเดือนนี้</h2>
          {d.topCustomers.length === 0 ? (
            <p className="mt-3 text-sm text-ink/60">ยังไม่มีการส่งของเดือนนี้</p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="border-b border-forest/15 text-left text-forest">
                  <th className="py-2 pr-2 font-semibold">ลูกค้า</th>
                  <th className="py-2 pr-2 text-right font-semibold">ลิตร</th>
                  <th className="py-2 text-right font-semibold">มูลค่า (ก่อน VAT)</th>
                </tr>
              </thead>
              <tbody>
                {d.topCustomers.map((c) => (
                  <tr key={c.customerId} className="border-b border-forest/10">
                    <td className="py-2 pr-2">{c.name}</td>
                    <td className="py-2 pr-2 text-right tabular-nums">{n(c.litres)}</td>
                    <td className="py-2 text-right tabular-nums">{formatThb(c.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {actorMay(actor, "catalog.write") ? (
          <div className="rounded-2xl border border-forest/15 bg-paper p-5">
            <h2 className="font-semibold text-forest">ตั้งเป้ายอดขาย</h2>
            <p className="mt-1 text-xs text-ink/60">ตู้ละ {d.target.drumsPerContainer} ถัง × 200 ลิตร (แก้จำนวนถังต่อตู้ที่หน้า &quot;ราคา / บรรจุภัณฑ์&quot;)</p>
            <EtohForm action={saveTargetAction} submitLabel="บันทึกเป้า" className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="font-medium">เป้าตู้ต่อเดือน</span>
                <input name="containers" type="number" min="1" max="200" defaultValue={d.target.containers} className="mt-1 w-full rounded border border-forest/20 px-3 py-2 text-sm" />
              </label>
            </EtohForm>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
  href,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  href?: string;
  tone?: "warn";
}) {
  const body = (
    <>
      <p className="text-xs text-ink/60">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold tabular-nums ${tone === "warn" ? "text-red-700" : "text-forest"}`}>{value}</p>
      {sub ? <p className="text-xs text-ink/60">{sub}</p> : null}
    </>
  );
  return href ? (
    <Link href={href} className="block rounded-2xl border border-forest/15 bg-paper p-4 transition hover:border-forest/40">
      {body}
    </Link>
  ) : (
    <div className="rounded-2xl border border-forest/15 bg-paper p-4">{body}</div>
  );
}
