"use client";

import { useActionState } from "react";
import {
  updateQuoteOpsAction,
  type OpsActionResult,
} from "@/app/actions/ops";
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  type LeadStatus,
} from "@/lib/quote-types";

const initial: OpsActionResult | null = null;

export function QuoteOpsForm({
  requestId,
  leadStatus,
  salesNotes,
}: {
  requestId: string;
  leadStatus: LeadStatus;
  salesNotes: string | null;
}) {
  const [state, action, pending] = useActionState(
    updateQuoteOpsAction,
    initial,
  );

  return (
    <form action={action} className="mt-6 space-y-4 rounded border border-forest/15 bg-paper p-4">
      <input type="hidden" name="requestId" value={requestId} />
      <h2 className="text-lg font-semibold text-forest">อัปเดตสถานะขาย</h2>
      <label className="block text-sm">
        <span className="font-medium">สถานะ lead</span>
        <select
          name="leadStatus"
          defaultValue={leadStatus}
          className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
        >
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {LEAD_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="font-medium">บันทึกฝ่ายขาย</span>
        <textarea
          name="salesNotes"
          rows={4}
          defaultValue={salesNotes || ""}
          className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
          placeholder="สรุปการติดต่อ / ราคาที่เสนอ / หมายเหตุภายใน"
        />
      </label>
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
