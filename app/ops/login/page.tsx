"use client";

import { useActionState } from "react";
import { opsLoginAction, type OpsActionResult } from "@/app/actions/ops";

const initial: OpsActionResult | null = null;

export default function OpsLoginPage() {
  const [state, action, pending] = useActionState(opsLoginAction, initial);

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold text-forest">เข้าสู่ระบบ Ops</h1>
      <p className="mt-2 text-sm text-ink/70">
        จัดการลูกค้าและใบเสนอราคาจากฐานข้อมูลร้าน — ไม่ใช่หน้าแก้ไขแคตตาล็อก
      </p>
      <form action={action} className="mt-6 space-y-4">
        <label className="block text-sm">
          <span className="font-medium text-forest">อีเมล</span>
          <input
            type="text"
            name="email"
            autoComplete="username"
            placeholder="admin"
            className="mt-1 w-full rounded border border-forest/20 bg-paper px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-forest">รหัสผ่าน</span>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded border border-forest/20 bg-paper px-3 py-2"
          />
        </label>
        {state && !state.ok ? (
          <p className="text-sm text-red-700" role="alert">
            {state.error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded bg-forest px-4 py-2.5 text-sm font-medium text-paper hover:bg-forest-light disabled:opacity-60"
        >
          {pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
        </button>
        <p className="text-xs text-ink/55">
          ผู้ดูแลหรือพนักงานใช้อีเมลที่ได้รับ รหัสผ่านอย่างน้อย 12 ตัวอักษร
          ผู้ดูแลระบบเดิมใช้อีเมลที่ตั้งไว้ (ค่าเริ่มต้น admin) หรือเว้นว่างแล้วใส่รหัสผ่านผู้ดูแล
        </p>
      </form>
    </div>
  );
}
