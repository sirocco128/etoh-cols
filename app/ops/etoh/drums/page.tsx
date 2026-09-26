import { EtohForm } from "@/components/etoh/EtohForm";
import { EtohSubnav } from "@/components/etoh/EtohSubnav";
import { recordDrumMovementAction } from "@/app/actions/ops-etoh";
import { actorMay, requireOpsPage } from "@/lib/ops-auth";
import { ETOH_PACKS, getPack } from "@/lib/etoh/catalog";
import { drumBalances, loadPriceBook } from "@/lib/etoh/repository";
import { listEtohCustomerOptions, formatThb } from "@/lib/etoh/ops-data";

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
          <div className="rounded-xl border border-forest/15 bg-paper p-5">
            <h2 className="font-semibold text-forest">บันทึกส่ง / รับคืนภาชนะ</h2>
            <EtohForm action={recordDrumMovementAction} submitLabel="บันทึก" className="mt-4 space-y-4">
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
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="font-medium">ภาชนะ</span>
                  <select name="packCode" className={inputCls}>
                    {returnable.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.nameTh} (มัดจำ {formatThb(book.packs[p.code].depositThb)})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="font-medium">ทิศทาง</span>
                  <select name="direction" className={inputCls}>
                    <option value="out">ส่งไปกับสินค้า</option>
                    <option value="in">รับคืนจากลูกค้า</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="font-medium">จำนวน</span>
                  <input name="qty" type="number" min="1" step="1" required className={inputCls} />
                </label>
                <label className="block text-sm">
                  <span className="font-medium">มัดจำ/ใบ (บาท)</span>
                  <input name="depositPerUnitThb" type="number" min="0" step="0.01" defaultValue={book.packs.DRUM200.depositThb} className={inputCls} />
                </label>
                <label className="block text-sm">
                  <span className="font-medium">อ้างอิงเอกสาร</span>
                  <input name="refId" placeholder="เลขใบส่งของ / ใบเสนอราคา" className={inputCls} />
                </label>
                <label className="block text-sm">
                  <span className="font-medium">หมายเหตุ</span>
                  <input name="memo" className={inputCls} />
                </label>
              </div>
            </EtohForm>
          </div>
        ) : null}
      </div>
    </div>
  );
}
