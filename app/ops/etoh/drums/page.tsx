import { EtohForm } from "@/components/etoh/EtohForm";
import { EtohSubnav } from "@/components/etoh/EtohSubnav";
import Link from "next/link";
import {
  recordDrumMovementAction,
  returnContainersAction,
  settleDepositAction,
  voidDepositAction,
} from "@/app/actions/ops-etoh";
import { DEPOSIT_METHOD_LABELS, DEPOSIT_METHODS, listDepositDocs, type DepositMethod } from "@/lib/etoh/sales";
import { actorMay, requireOpsPage } from "@/lib/ops-auth";
import { ETOH_PACKS, getPack } from "@/lib/etoh/catalog";
import { drumBalances, loadPriceBook } from "@/lib/etoh/repository";
import { listEtohCustomerOptions, formatThaiDate, formatThb } from "@/lib/etoh/ops-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const inputCls = "mt-1 w-full rounded border border-forest/20 px-3 py-2 text-sm";

export default async function EtohDrumsPage() {
  const actor = await requireOpsPage("stock.read");
  const customers = listEtohCustomerOptions();
  const names = new Map(customers.map((c) => [c.id, c.name]));
  const balances = drumBalances();
  const book = loadPriceBook();
  const returnable = ETOH_PACKS.filter((p) => p.kind === "returnable");
  const holderIds = new Set(balances.filter((b) => b.outstanding > 0).map((b) => b.customerId));
  const holders = customers.filter((c) => holderIds.has(c.id));
  const deposits = listDepositDocs({}, 100).sort((a, b) => (a.status === "open" ? 0 : 1) - (b.status === "open" ? 0 : 1) || b.id - a.id);
  const canSettle = actorMay(actor, "finance.write");
  const totals = returnable.map((p) => ({
    pack: p,
    outstanding: balances.filter((b) => b.packCode === p.code).reduce((s, b) => s + b.outstanding, 0),
    deposit: balances.filter((b) => b.packCode === p.code).reduce((s, b) => s + b.depositHeldThb, 0),
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-forest">ถังหมุนเวียน / มัดจำภาชนะ</h1>
      <p className="mt-1 max-w-3xl text-sm text-ink/70">
        ถัง 200 ลิตรและ IBC ที่อยู่กับลูกค้า พร้อมเงินมัดจำที่ต้องคืน ใช้ตามทวงถังและวางแผนสต็อกถังเปล่า
      </p>
      <EtohSubnav current="drums" />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {totals.map((t) => (
          <div key={t.pack.code} className="rounded-xl border border-forest/15 bg-paper p-4">
            <p className="text-sm text-ink/70">{t.pack.nameTh} อยู่กับลูกค้า</p>
            <p className="text-2xl font-bold tabular-nums text-forest">{t.outstanding.toLocaleString("th-TH")}</p>
            <p className="text-xs text-ink/60">มัดจำค้างคืน {formatThb(t.deposit)} บาท</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-forest/15 text-left text-forest">
                <th className="px-2 py-2 font-semibold">ลูกค้า</th>
                <th className="px-2 py-2 font-semibold">ภาชนะ</th>
                <th className="px-2 py-2 text-right font-semibold">ค้าง</th>
                <th className="px-2 py-2 text-right font-semibold">มัดจำ</th>
              </tr>
            </thead>
            <tbody>
              {balances.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-2 py-8 text-center text-ink/60">
                    ไม่มีถังค้างที่ลูกค้า
                  </td>
                </tr>
              ) : (
                balances.map((b) => (
                  <tr key={`${b.customerId}-${b.packCode}`} className="border-b border-forest/10">
                    <td className="px-2 py-2">{names.get(b.customerId) ?? `ลูกค้า #${b.customerId}`}</td>
                    <td className="px-2 py-2">{getPack(b.packCode).nameTh}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{b.outstanding.toLocaleString("th-TH")}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{formatThb(b.depositHeldThb)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {actorMay(actor, "stock.write") ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-forest/15 bg-paper p-5">
              <h2 className="font-semibold text-forest">รับคืนภาชนะจากลูกค้า</h2>
              <p className="mt-1 text-xs text-ink/60">
                ระบบยกเลิกมัดจำที่ยังไม่ได้เก็บเงินก่อน แล้วออกใบคืนเงินมัดจำ (RF) เฉพาะส่วนที่รับเงินมาแล้ว
              </p>
              <EtohForm action={returnContainersAction} submitLabel="บันทึกรับคืน" className="mt-4 space-y-4">
                <label className="block text-sm">
                  <span className="font-medium">ลูกค้า</span>
                  <select name="customerId" required className={inputCls}>
                    <option value="">— เลือก —</option>
                    {holders.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="font-medium">ภาชนะ</span>
                    <select name="packCode" defaultValue="DRUM200" className={inputCls}>
                      {returnable.map((p) => (
                        <option key={p.code} value={p.code}>
                          {p.nameTh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium">จำนวนที่คืน</span>
                    <input name="qty" type="number" min="1" step="1" required className={inputCls} />
                  </label>
                  <label className="block text-sm sm:col-span-2">
                    <span className="font-medium">หมายเหตุ (สภาพถัง / เลขใบรับ)</span>
                    <input name="memo" className={inputCls} />
                  </label>
                </div>
              </EtohForm>
            </div>

            <details className="rounded-xl border border-forest/15 bg-paper p-5">
              <summary className="cursor-pointer text-sm font-semibold text-forest">ยอดยกมา — ถังที่อยู่กับลูกค้าก่อนเริ่มใช้ระบบ</summary>
              <p className="mt-2 text-xs text-ink/60">ถังที่ส่งตามใบส่งของ ระบบบันทึกให้อัตโนมัติแล้ว ใช้ช่องนี้เฉพาะตั้งยอดเริ่มต้น</p>
              <EtohForm action={recordDrumMovementAction} submitLabel="บันทึกยอดยกมา" className="mt-4 space-y-4">
                <input type="hidden" name="direction" value="out" />
                <label className="block text-sm">
                  <span className="font-medium">ลูกค้า</span>
                  <select name="customerId" required className={inputCls}>
                    <option value="">— เลือก —</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block text-sm">
                    <span className="font-medium">ภาชนะ</span>
                    <select name="packCode" defaultValue="DRUM200" className={inputCls}>
                      {returnable.map((p) => (
                        <option key={p.code} value={p.code}>
                          {p.nameTh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium">จำนวน</span>
                    <input name="qty" type="number" min="1" step="1" required className={inputCls} />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium">มัดจำ/ใบ ที่ถืออยู่</span>
                    <input name="depositPerUnitThb" type="number" min="0" step="0.01" defaultValue={book.packs.DRUM200.depositThb} className={inputCls} />
                  </label>
                </div>
                <input type="hidden" name="refType" value="OPENING" />
                <input type="hidden" name="memo" value="ยอดยกมา" />
              </EtohForm>
            </details>
          </div>
        ) : null}
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-bold text-forest">เอกสารมัดจำภาชนะ</h2>
        <p className="mt-1 text-sm text-ink/65">
          ใบรับเงินมัดจำ (DP) ออกพร้อมใบส่งของ · ใบคืนเงินมัดจำ (RF) ออกเมื่อรับถังคืน · ไม่ใช่เอกสารภาษี (นอกฐาน VAT) ·
          เมื่อรับ/จ่ายเงินแล้วลงบัญชี 2150 เงินมัดจำภาชนะรับจากลูกค้า
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-forest/15 text-left text-forest">
                <th className="px-2 py-2 font-semibold">เลขที่</th>
                <th className="px-2 py-2 font-semibold">ลูกค้า</th>
                <th className="px-2 py-2 font-semibold">รายการ</th>
                <th className="px-2 py-2 text-right font-semibold">จำนวนเงิน</th>
                <th className="px-2 py-2 font-semibold">สถานะ</th>
                <th className="px-2 py-2 font-semibold">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {deposits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 py-8 text-center text-ink/60">ยังไม่มีเอกสารมัดจำ</td>
                </tr>
              ) : (
                deposits.map((d) => (
                  <tr key={d.id} className="border-b border-forest/10 align-top">
                    <td className="px-2 py-2.5">
                      <Link href={`/ops/etoh/deposits/${d.id}`} className="font-mono text-forest underline-offset-2 hover:underline">{d.docNo}</Link>
                      <p className="text-xs text-ink/50">{formatThaiDate(d.createdAt)}</p>
                    </td>
                    <td className="px-2 py-2.5">{names.get(d.customerId) ?? `ลูกค้า #${d.customerId}`}</td>
                    <td className="px-2 py-2.5">
                      <span className={d.kind === "charge" ? "text-forest" : "text-brass"}>{d.kind === "charge" ? "รับมัดจำ" : "คืนมัดจำ"}</span>
                      <p className="text-xs text-ink/60">{d.note}</p>
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{formatThb(d.amountThb)}</td>
                    <td className="px-2 py-2.5">
                      {d.status === "open" ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">{d.kind === "charge" ? "รอรับเงิน" : "รอจ่ายคืน"}</span>
                      ) : d.status === "settled" ? (
                        <span className="text-xs text-ink/70">
                          {d.kind === "charge" ? "รับแล้ว" : "คืนแล้ว"} · {d.method ? DEPOSIT_METHOD_LABELS[d.method as DepositMethod] : ""}
                          {d.reference ? ` · ${d.reference}` : ""}
                        </span>
                      ) : (
                        <span className="text-xs text-ink/50">ยกเลิก</span>
                      )}
                    </td>
                    <td className="px-2 py-2.5">
                      {d.status === "open" && canSettle ? (
                        <div className="flex flex-wrap gap-2">
                          <EtohForm action={settleDepositAction} submitLabel={d.kind === "charge" ? "รับเงิน" : "จ่ายคืน"} compact className="flex flex-wrap items-center gap-1.5 text-xs">
                            <input type="hidden" name="id" value={d.id} />
                            <select name="method" defaultValue="transfer" className="rounded border border-forest/20 px-1.5 py-1">
                              {DEPOSIT_METHODS.map((m) => (
                                <option key={m} value={m}>{DEPOSIT_METHOD_LABELS[m]}</option>
                              ))}
                            </select>
                            <input name="reference" placeholder="อ้างอิง" className="w-24 rounded border border-forest/20 px-1.5 py-1" />
                          </EtohForm>
                          <EtohForm action={voidDepositAction} submitLabel="ยกเลิก" compact className="text-xs">
                            <input type="hidden" name="id" value={d.id} />
                          </EtohForm>
                        </div>
                      ) : null}
                    </td>
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
