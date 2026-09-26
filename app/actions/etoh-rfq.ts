"use server";

import { headers } from "next/headers";
import { parseContactInquiryFormData } from "@/lib/contact-inquiry-schema";
import { submitContactInquiryPayload } from "@/lib/contact-inquiry-service";
import { composeEtohRfqMessage } from "@/lib/etoh/rfq";
import { formatRfqNotice, getLineNotifyConfig, pushLineText } from "@/lib/etoh/line-notify";
import { cleanText } from "@/lib/sanitize";

export type EtohRfqState = {
  ok: boolean;
  inquiryId?: string;
  fieldErrors?: Record<string, string>;
  formError?: string;
  values?: Record<string, string>;
};

function text(form: FormData, key: string, max = 200): string {
  return cleanText(String(form.get(key) ?? "")).slice(0, max);
}

export async function submitEtohRfq(_prev: EtohRfqState, formData: FormData): Promise<EtohRfqState> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && key !== "website") values[key] = value;
  }

  const fields = {
    grade: text(formData, "grade", 20),
    pack: text(formData, "pack", 20),
    qty: text(formData, "qty", 60),
    frequency: text(formData, "frequency", 20),
    province: text(formData, "province", 80),
    endUse: text(formData, "endUse", 60),
    deliveryDate: text(formData, "deliveryDate", 20),
    note: text(formData, "note", 2000),
  };
  const fieldErrors: Record<string, string> = {};
  if (!fields.qty) fieldErrors.qty = "ระบุจำนวนหรือปริมาณที่ต้องการ";
  if (!fields.province) fieldErrors.province = "ระบุจังหวัดที่จัดส่ง";

  // Reuse the contact-inquiry pipeline: validation, honeypot, timing, rate limit, mail, ops inbox.
  const payload = new FormData();
  payload.set("topic", "inquiry");
  for (const key of ["name", "company", "email", "phone", "callbackChannel", "consent", "landingPath", "website", "startedAt"]) {
    const v = formData.get(key);
    if (v != null) payload.set(key, v);
  }
  payload.set("message", composeEtohRfqMessage(fields));

  const parsed = parseContactInquiryFormData(payload);
  if (!parsed.success) Object.assign(fieldErrors, parsed.fieldErrors);
  if (Object.keys(fieldErrors).length > 0 || !parsed.success) {
    return { ok: false, fieldErrors, formError: "กรุณาตรวจสอบข้อมูลในฟอร์ม", values };
  }

  try {
    const headerList = await headers();
    const result = await submitContactInquiryPayload(parsed.data, {
      headers: headerList,
      userAgent: headerList.get("user-agent"),
    });
    if (result.ok) {
      // Honeypot hits return a neutral success — never alert sales for those.
      if (!("neutral" in result && result.neutral)) {
        const cfg = getLineNotifyConfig();
        if (cfg.enabled) {
          // Fire-and-forget: LINE being slow or down must not delay the buyer.
          void pushLineText(
            formatRfqNotice({
              inquiryId: result.inquiryId,
              name: parsed.data.name,
              company: parsed.data.company,
              phone: parsed.data.phone,
              email: parsed.data.email,
              summary: parsed.data.message,
              baseUrl: cfg.baseUrl,
            }),
          ).catch(() => undefined);
        }
      }
      return { ok: true, inquiryId: result.inquiryId };
    }
    const flat: Record<string, string> = {};
    for (const [k, v] of Object.entries(result.fieldErrors ?? {})) flat[k] = Array.isArray(v) ? v[0] ?? "" : String(v);
    return { ok: false, fieldErrors: flat, formError: result.formError || "ส่งคำขอไม่สำเร็จ กรุณาลองใหม่", values };
  } catch {
    return { ok: false, formError: "การเชื่อมต่อขัดข้อง กรุณาลองใหม่อีกครั้ง", values };
  }
}
