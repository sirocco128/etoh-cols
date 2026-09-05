"use client";

import { useActionState } from "react";
import {
  submitPublicIssue,
  type IssueActionState,
} from "@/app/actions/issues";
import {
  ISSUE_CATEGORIES,
  ISSUE_CATEGORY_LABELS,
} from "@/lib/ops-cycle-types";
import { ISSUE_REPORT_INTRO } from "@/lib/ux-copy";

const initial: IssueActionState = { ok: false };

export function IssueReportForm() {
  const [state, action, pending] = useActionState(submitPublicIssue, initial);

  if (state.ok && state.issueId) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-forest/20 bg-forest-mist/50 p-6"
      >
        <p className="text-lg font-semibold text-forest">รับเรื่องแล้ว</p>
        <p className="mt-2 text-sm text-ink/80">
          เลขเรื่อง{" "}
          <span className="font-mono font-semibold">{state.issueId}</span> —
          ทีมจะติดต่อกลับตามข้อมูลที่ให้ไว้ ไม่มีการชำระเงินในขั้นตอนนี้
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <p className="text-sm leading-relaxed text-ink/75">{ISSUE_REPORT_INTRO}</p>
      {state.error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium">บริษัท / หน่วยงาน</span>
          <input
            name="company"
            className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">ชื่อผู้ติดต่อ</span>
          <input
            name="contactName"
            required
            className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">อีเมล</span>
          <input
            name="email"
            type="email"
            className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">โทรศัพท์</span>
          <input
            name="phone"
            className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">เลขออเดอร์ (ถ้ามี)</span>
          <input
            name="orderId"
            className="mt-1 w-full rounded border border-forest/20 px-3 py-2 font-mono"
            placeholder="เช่น TB-…"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">ประเภทปัญหา</span>
          <select
            name="category"
            defaultValue="other"
            className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
          >
            {ISSUE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {ISSUE_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block text-sm">
        <span className="font-medium">หัวข้อ</span>
        <input
          name="title"
          required
          className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium">รายละเอียด</span>
        <textarea
          name="detail"
          required
          rows={5}
          className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-forest px-5 py-2.5 text-sm text-paper disabled:opacity-60"
      >
        {pending ? "กำลังส่ง…" : "ส่งเรื่อง"}
      </button>
    </form>
  );
}
