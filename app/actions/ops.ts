"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  updateCustomer,
  getCustomerById,
} from "@/lib/customer-repository";
import type { CustomerStatus } from "@/lib/customer-types";
import { CUSTOMER_STATUSES } from "@/lib/customer-types";
import {
  clearOpsSessionCookie,
  isOpsAuthConfigured,
  requireOpsSession,
  setOpsSessionCookie,
  verifyOpsPassword,
} from "@/lib/ops-auth";
import { updateQuoteOps } from "@/lib/quote-repository";
import type { LeadStatus } from "@/lib/quote-types";
import { LEAD_STATUSES } from "@/lib/quote-types";

export type OpsActionResult = {
  ok: boolean;
  error?: string;
};

export async function opsLoginAction(
  _prev: OpsActionResult | null,
  formData: FormData,
): Promise<OpsActionResult> {
  if (!isOpsAuthConfigured()) {
    return { ok: false, error: "ยังไม่ได้ตั้งค่า ADMIN_PASSWORD / ADMIN_SESSION_SECRET" };
  }
  const password = String(formData.get("password") || "");
  if (!verifyOpsPassword(password)) {
    return { ok: false, error: "รหัสผ่านไม่ถูกต้อง" };
  }
  await setOpsSessionCookie();
  redirect("/ops/quotes");
}

export async function opsLogoutAction(): Promise<void> {
  await clearOpsSessionCookie();
  redirect("/ops/login");
}

async function guardOps(): Promise<OpsActionResult | null> {
  if (!(await requireOpsSession())) {
    return { ok: false, error: "unauthorized" };
  }
  return null;
}

export async function updateQuoteOpsAction(
  _prev: OpsActionResult | null,
  formData: FormData,
): Promise<OpsActionResult> {
  const denied = await guardOps();
  if (denied) return denied;

  const requestId = String(formData.get("requestId") || "").trim();
  const leadStatus = String(formData.get("leadStatus") || "").trim() as LeadStatus;
  const salesNotes = String(formData.get("salesNotes") || "");

  if (!requestId) return { ok: false, error: "ไม่มีเลขคำขอ" };
  if (!(LEAD_STATUSES as readonly string[]).includes(leadStatus)) {
    return { ok: false, error: "สถานะไม่ถูกต้อง" };
  }

  const updated = updateQuoteOps({
    requestId,
    leadStatus,
    salesNotes: salesNotes.trim() || null,
  });
  if (!updated) return { ok: false, error: "ไม่พบคำขอ" };

  revalidatePath("/ops/quotes");
  revalidatePath(`/ops/quotes/${requestId}`);
  if (updated.customerId) {
    revalidatePath(`/ops/customers/${updated.customerId}`);
  }
  return { ok: true };
}

export async function updateCustomerOpsAction(
  _prev: OpsActionResult | null,
  formData: FormData,
): Promise<OpsActionResult> {
  const denied = await guardOps();
  if (denied) return denied;

  const id = Number(formData.get("id"));
  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false, error: "ไม่พบลูกค้า" };
  }

  const status = String(formData.get("status") || "").trim() as CustomerStatus;
  if (!(CUSTOMER_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, error: "สถานะไม่ถูกต้อง" };
  }

  const existing = getCustomerById(id);
  if (!existing) return { ok: false, error: "ไม่พบลูกค้า" };

  updateCustomer({
    id,
    company: String(formData.get("company") || existing.company),
    phone: String(formData.get("phone") || "") || null,
    contactName: String(formData.get("contactName") || "") || null,
    notes: String(formData.get("notes") || "") || null,
    status,
  });

  revalidatePath("/ops/customers");
  revalidatePath(`/ops/customers/${id}`);
  return { ok: true };
}
