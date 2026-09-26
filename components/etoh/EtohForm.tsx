"use client";

import { useActionState } from "react";
import type { OpsActionResult } from "@/app/actions/ops";

/** Server-action form that shows both the error and a short success note. */
export function EtohForm({
  action,
  submitLabel,
  successLabel = "บันทึกแล้ว",
  children,
  className = "space-y-4",
  compact = false,
}: {
  action: (prev: OpsActionResult | null, formData: FormData) => Promise<OpsActionResult>;
  submitLabel: string;
  successLabel?: string;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className={className}>
      {state?.error ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p role="status" className="rounded-lg border border-forest/20 bg-forest-mist px-3 py-2 text-sm text-forest">
          {successLabel}
        </p>
      ) : null}
      {children}
      <button
        type="submit"
        disabled={pending}
        className={
          compact
            ? "rounded bg-forest px-3 py-1.5 text-xs font-medium text-paper disabled:opacity-60"
            : "min-h-11 rounded-lg bg-forest px-5 py-2.5 text-sm font-medium text-paper disabled:opacity-60"
        }
      >
        {pending ? "กำลังบันทึก…" : submitLabel}
      </button>
    </form>
  );
}
