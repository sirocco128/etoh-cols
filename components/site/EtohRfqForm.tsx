"use client";

import { useActionState, useState } from "react";
import { submitEtohRfq, type EtohRfqState } from "@/app/actions/etoh-rfq";
import { ETOH_END_USES } from "@/lib/etoh/brand";
import { ETOH_GRADES, ETOH_PACKS } from "@/lib/etoh/catalog";
import { ETOH_RFQ_FREQUENCIES } from "@/lib/etoh/storefront";

const initial: EtohRfqState = { ok: false };

const inputCls =
  "mt-1.5 w-full rounded-xl border border-forest/15 bg-white px-3.5 py-2.5 text-[0.95rem] text-ink shadow-sm transition focus:border-forest-light focus:outline-none focus:ring-2 focus:ring-forest-light/20 dark:border-white/15 dark:bg-white/5";

function Field({
  label,
  error,
  required,
  children,
  className = "",
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="font-medium text-forest">
        {label}
        {required ? <span className="text-brass"> *</span> : null}
      </span>
      {children}
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}
    </label>
  );
}

export function EtohRfqForm({
  defaults,
  provinces,
}: {
  defaults: { grade?: string; pack?: string; endUse?: string; intent?: string };
  provinces: string[];
}) {
  const [state, action, pending] = useActionState(submitEtohRfq, initial);
  const [startedAt] = useState(() => Date.now());
  const v = state.values ?? {};
  const e = state.fieldErrors ?? {};

  if (state.ok) {
    return (
      <div className="rounded-3xl border border-leaf/30 bg-leaf/5 p-8 text-center" role="status">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-leaf text-2xl text-white">✓</div>
        <h2 className="mt-4 font-display text-2xl font-bold text-forest">ได้รับคำขอแล้ว</h2>
        <p className="mt-2 text-ink/70">
          เลขอ้างอิง <span className="font-mono font-semibold text-forest">{state.inquiryId}</span>
          <br />
          ฝ่ายขายจะติดต่อกลับพร้อมใบเสนอราคาและ Specification ภายในเวลาทำการ
        </p>
      </div>
    );
  }

  const defaultNote =
    defaults.intent === "docs" ? "ขอเอกสาร Specification / SDS ก่อนสั่งซื้อ" : "";

  return (
    <form action={action} className="space-y-7" noValidate>
      {state.formError ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.formError}
        </p>
      ) : null}

      <fieldset className="space-y-4">
        <legend className="mb-1 flex items-center gap-2 font-display text-lg font-bold text-forest">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-forest text-xs text-white">1</span>
          สินค้าที่ต้องการ
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="เกรด">
            <select name="grade" defaultValue={v.grade ?? defaults.grade ?? ""} className={inputCls}>
              <option value="">ให้ฝ่ายขายแนะนำ</option>
              {ETOH_GRADES.map((g) => (
                <option key={g.code} value={g.code}>
                  {g.nameEn} — {g.nameTh}
                </option>
              ))}
            </select>
          </Field>
          <Field label="บรรจุภัณฑ์">
            <select name="pack" defaultValue={v.pack ?? (defaults.pack || "DRUM200")} className={inputCls}>
              <option value="">ให้ฝ่ายขายแนะนำ</option>
              {ETOH_PACKS.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.nameTh}
                </option>
              ))}
            </select>
          </Field>
          <Field label="จำนวน / ปริมาณ" required error={e.qty}>
            <input name="qty" defaultValue={v.qty ?? ""} placeholder="เช่น 10 ถัง หรือ 2,000 ลิตร" className={inputCls} />
          </Field>
          <Field label="ความถี่ในการสั่ง">
            <select name="frequency" defaultValue={v.frequency ?? "monthly"} className={inputCls}>
              {ETOH_RFQ_FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="จังหวัดที่จัดส่ง" required error={e.province}>
            <input name="province" list="etoh-provinces" defaultValue={v.province ?? ""} placeholder="พิมพ์ชื่อจังหวัด" className={inputCls} />
            <datalist id="etoh-provinces">
              {provinces.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </Field>
          <Field label="ต้องการรับสินค้าประมาณ">
            <input name="deliveryDate" type="date" defaultValue={v.deliveryDate ?? ""} className={inputCls} />
          </Field>
          <Field label="ใช้กับงาน" className="sm:col-span-2">
            <select name="endUse" defaultValue={v.endUse ?? defaults.endUse ?? ""} className={inputCls}>
              <option value="">— เลือกกลุ่มการใช้งาน —</option>
              {ETOH_END_USES.map((u) => (
                <option key={u.slug} value={u.slug}>
                  {u.no}. {u.title} ({u.titleEn})
                </option>
              ))}
            </select>
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-1 flex items-center gap-2 font-display text-lg font-bold text-forest">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-forest text-xs text-white">2</span>
          ข้อมูลติดต่อ
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ชื่อผู้ติดต่อ" required error={e.name}>
            <input name="name" autoComplete="name" defaultValue={v.name ?? ""} className={inputCls} />
          </Field>
          <Field label="บริษัท">
            <input name="company" autoComplete="organization" defaultValue={v.company ?? ""} className={inputCls} />
          </Field>
          <Field label="โทรศัพท์" required error={e.phone}>
            <input name="phone" type="tel" autoComplete="tel" inputMode="tel" defaultValue={v.phone ?? ""} placeholder="08x-xxx-xxxx" className={inputCls} />
          </Field>
          <Field label="อีเมล" required error={e.email}>
            <input name="email" type="email" autoComplete="email" defaultValue={v.email ?? ""} className={inputCls} />
          </Field>
          <Field label="ให้ติดต่อกลับทาง" error={e.callbackChannel}>
            <select name="callbackChannel" defaultValue={v.callbackChannel ?? "phone"} className={inputCls}>
              <option value="phone">โทรศัพท์</option>
              <option value="email">อีเมล</option>
              <option value="both">ทั้งโทรศัพท์และอีเมล</option>
            </select>
          </Field>
          <Field label="รายละเอียดเพิ่มเติม" className="sm:col-span-2" error={e.message}>
            <textarea name="note" rows={4} defaultValue={v.note ?? defaultNote} placeholder="เช่น Specification ที่ต้องการ ข้อกำหนดเอกสาร หรือเงื่อนไขการชำระเงิน" className={inputCls} />
          </Field>
        </div>
      </fieldset>

      <input type="hidden" name="startedAt" value={startedAt} />
      <input type="hidden" name="landingPath" value="/contact" />
      <div aria-hidden className="hidden">
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label className="flex items-start gap-3 text-sm text-ink/75">
        <input type="checkbox" name="consent" defaultChecked={v.consent === "on"} className="mt-1 h-4 w-4 accent-[#1553b7]" />
        <span>
          ยินยอมให้ {`Etoh Cols`} ติดต่อกลับเพื่อเสนอราคา ตาม
          <a href="/privacy" className="text-forest-light underline"> นโยบายความเป็นส่วนตัว</a>
          {e.consent ? <span className="block text-xs text-red-600">{e.consent}</span> : null}
        </span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-brass px-8 text-base font-semibold text-white shadow-[0_14px_30px_-12px_rgba(232,97,26,0.8)] transition hover:bg-brass-soft disabled:opacity-60 sm:w-auto"
      >
        {pending ? "กำลังส่ง…" : "ส่งคำขอใบเสนอราคา"}
      </button>
      <p className="text-xs text-ink/55">การส่งแบบฟอร์มยังไม่ใช่การยืนยันสั่งซื้อ และไม่มีการชำระเงินบนเว็บ</p>
    </form>
  );
}
