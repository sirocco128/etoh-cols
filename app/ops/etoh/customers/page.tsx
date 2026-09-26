import Link from "next/link";
import { EtohForm } from "@/components/etoh/EtohForm";
import { EtohSubnav } from "@/components/etoh/EtohSubnav";
import { saveCustomerTermsAction } from "@/app/actions/ops-etoh";
import { actorMay, requireOpsPage } from "@/lib/ops-auth";
import { ETOH_TIERS, getTier } from "@/lib/etoh/catalog";
import { ETOH_END_USES, findEndUse } from "@/lib/etoh/brand";
import { listEtohCustomerOptions, formatThb } from "@/lib/etoh/ops-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SearchParams = Promise<{ q?: string; id?: string }>;

const inputCls = "mt-1 w-full rounded border border-forest/20 px-3 py-2 text-sm";

export default async function EtohCustomerTermsPage({ searchParams }: { searchParams: SearchParams }) {
  const actor = await requireOpsPage("customers.read");
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const customers = listEtohCustomerOptions(q, 300);
  const selected = customers.find((c) => c.id === Number(sp.id)) ?? null;
  const canWrite = actorMay(actor, "customers.write");
  const canSetSpecialTier = actorMay(actor, "catalog.write");

  return (
    <div>
      <h1 className="text-2xl font-bold text-forest">เงื่อนไขลูกค้า</h1>
      <p className="mt-1 max-w-3xl text-sm text-ink/70">
        ระดับราคา วงเงินและเครดิตเทอม รอบสั่งซื้อ (ใช้เตือนตามขาย) และกลุ่มการใช้งาน 9 กลุ่ม ข้อมูลลูกค้าหลักแก้ที่{" "}
        <Link href="/ops/customers" className="text-forest underline">
          CRM ลูกค้า
        </Link>
      </p>
      <EtohSubnav current="customers" />

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div>
          <form method="get" className="flex gap-2">
            <input name="q" defaultValue={q} placeholder="ค้นชื่อบริษัท / อีเมล / เลขภาษี" className="flex-1 rounded border border-forest/20 px-3 py-2 text-sm" />
            <button type="submit" className="rounded bg-forest px-4 py-2 text-sm text-paper">
              ค้นหา
            </button>
          </form>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-forest/15 text-left text-forest">
                  <th className="px-2 py-2 font-semibold">ลูกค้า</th>
                  <th className="px-2 py-2 font-semibold">ระดับ</th>
                  <th className="px-2 py-2 text-right font-semibold">วงเงิน</th>
                  <th className="px-2 py-2 text-right font-semibold">เครดิต</th>
                  <th className="px-2 py-2 font-semibold">กลุ่ม</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-2 py-8 text-center text-ink/60">
                      ไม่พบลูกค้า — เพิ่มที่ CRM ก่อน
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id} className={`border-b border-forest/10 ${selected?.id === c.id ? "bg-forest-mist/60" : ""}`}>
                      <td className="px-2 py-2">
                        <Link href={`/ops/etoh/customers?id=${c.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className="text-forest underline-offset-2 hover:underline">
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-2 py-2">{getTier(c.tier).nameTh}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{c.creditLimitThb ? formatThb(c.creditLimitThb) : "—"}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{c.creditTermDays ? `${c.creditTermDays} วัน` : "เงินสด"}</td>
                      <td className="px-2 py-2 text-ink/70">{c.endUseSegment ? findEndUse(c.endUseSegment)?.title ?? c.endUseSegment : "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-forest/15 bg-paper p-5">
          {selected ? (
            canWrite ? (
              <>
                <h2 className="font-semibold text-forest">{selected.name}</h2>
                <EtohForm action={saveCustomerTermsAction} submitLabel="บันทึกเงื่อนไข" className="mt-4 space-y-4">
                  <input type="hidden" name="customerId" value={selected.id} />
                  <label className="block text-sm">
                    <span className="font-medium">ระดับราคา</span>
                    <select name="priceTier" defaultValue={selected.tier} className={inputCls}>
                      {ETOH_TIERS.map((t) => (
                        <option
                          key={t.code}
                          value={t.code}
                          disabled={!canSetSpecialTier && ["contract", "dealer", "bulk"].includes(t.code) && selected.tier !== t.code}
                        >
                          {t.nameTh} — {t.rule}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm">
                      <span className="font-medium">วงเงินเครดิต (บาท)</span>
                      <input name="creditLimitThb" type="number" min="0" step="1000" defaultValue={selected.creditLimitThb} className={inputCls} />
                    </label>
                    <label className="block text-sm">
                      <span className="font-medium">เครดิตเทอม (วัน)</span>
                      <input name="creditTermDays" type="number" min="0" max="180" defaultValue={selected.creditTermDays} className={inputCls} />
                    </label>
                    <label className="block text-sm">
                      <span className="font-medium">รอบสั่งซื้อปกติ (วัน)</span>
                      <input name="reorderCycleDays" type="number" min="1" defaultValue={selected.reorderCycleDays ?? ""} placeholder="เช่น 14" className={inputCls} />
                    </label>
                    <label className="block text-sm">
                      <span className="font-medium">กลุ่มการใช้งาน</span>
                      <select name="endUseSegment" defaultValue={selected.endUseSegment ?? ""} className={inputCls}>
                        <option value="">— ไม่ระบุ —</option>
                        {ETOH_END_USES.map((e) => (
                          <option key={e.slug} value={e.slug}>
                            {e.no}. {e.title}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </EtohForm>
              </>
            ) : (
              <p className="text-sm text-ink/70">สิทธิ์ของคุณดูเงื่อนไขได้อย่างเดียว</p>
            )
          ) : (
            <p className="text-sm text-ink/60">เลือกลูกค้าจากตารางเพื่อตั้งระดับราคาและเครดิต</p>
          )}
        </div>
      </div>
    </div>
  );
}
