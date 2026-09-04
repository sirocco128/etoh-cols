"use client";

import { useActionState } from "react";
import {
  updateCustomerOpsAction,
  type OpsActionResult,
} from "@/app/actions/ops";
import type { CustomerRecord } from "@/lib/customer-types";
import { CUSTOMER_STATUSES } from "@/lib/customer-types";

const initial: OpsActionResult | null = null;

export function CustomerOpsForm({ customer }: { customer: CustomerRecord }) {
  const [state, action, pending] = useActionState(
    updateCustomerOpsAction,
    initial,
  );

  return (
    <form action={action} className="mt-6 space-y-4 rounded border border-forest/15 bg-paper p-4">
      <input type="hidden" name="id" value={customer.id} />
      <h2 className="text-lg font-semibold text-forest">แก้ไขข้อมูลลูกค้า</h2>
      <label className="block text-sm">
        <span className="font-medium">บริษัท</span>
        <input
          name="company"
          defaultValue={customer.company}
          required
          className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium">ผู้ติดต่อ</span>
        <input
          name="contactName"
          defaultValue={customer.contactName || ""}
          className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium">โทรศัพท์</span>
        <input
          name="phone"
          defaultValue={customer.phone || ""}
          className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium">สถานะ</span>
        <select
          name="status"
          defaultValue={customer.status}
          className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
        >
          {CUSTOMER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === "active" ? "ใช้งาน" : "ปิดใช้งาน"}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="font-medium">บันทึกภายใน</span>
        <textarea
          name="notes"
          rows={4}
          defaultValue={customer.notes || ""}
          className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
        />
      </label>
      <p className="text-xs text-ink/60">อีเมล: {customer.email} (ใช้เป็นคีย์ลูกค้า)</p>
      {state?.ok ? (
        <p className="text-sm text-forest">บันทึกแล้ว</p>
      ) : null}
      {state && !state.ok ? (
        <p className="text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-forest px-4 py-2 text-sm font-medium text-paper disabled:opacity-60"
      >
        {pending ? "กำลังบันทึก…" : "บันทึก"}
      </button>
    </form>
  );
}
