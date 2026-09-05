"use client";

import { useActionState } from "react";
import { updateOrderFulfillmentAction } from "@/app/actions/ops-orders";
import { PaymentReviewForm } from "@/components/AccountingDecisionForms";
import type { OpsActionResult } from "@/app/actions/ops";
import {
  FULFILLMENT_LABELS,
  FULFILLMENT_STATUSES,
  type FulfillmentStatus,
  type PaymentRecord,
} from "@/lib/order-types";

const initial: OpsActionResult | null = null;

export function OrderFulfillmentForm({
  orderId,
  current,
  readOnly,
}: {
  orderId: string;
  current: FulfillmentStatus;
  readOnly?: boolean;
}) {
  const [state, action, pending] = useActionState(
    updateOrderFulfillmentAction,
    initial,
  );

  if (readOnly) {
    return (
      <p className="text-sm">สถานะสินค้า: {FULFILLMENT_LABELS[current]}</p>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="orderId" value={orderId} />
      <label className="block text-sm">
        <span className="font-medium">เลื่อนสถานะสินค้า</span>
        <select
          name="status"
          defaultValue={current}
          className="mt-1 w-full rounded border border-forest/20 px-3 py-2"
        >
          {FULFILLMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {FULFILLMENT_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      {state?.ok ? <p className="text-sm text-forest">บันทึกแล้ว</p> : null}
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
        {pending ? "กำลังบันทึก…" : "อัปเดตสถานะ"}
      </button>
    </form>
  );
}

export function ConfirmPaymentForm({
  payment,
  orderId,
  readOnly,
}: {
  payment: PaymentRecord;
  orderId: string;
  readOnly?: boolean;
}) {
  return (
    <PaymentReviewForm payment={payment} orderId={orderId} readOnly={readOnly} />
  );
}
