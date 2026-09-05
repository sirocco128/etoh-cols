"use server";

import { createIssueTicket } from "@/lib/ops-cycle-service";

export type IssueActionState = {
  ok: boolean;
  issueId?: string;
  error?: string;
};

const ERRORS: Record<string, string> = {
  title_required: "กรุณาระบุหัวข้อปัญหา",
  detail_required: "กรุณาเล่ารายละเอียด",
};

export async function submitPublicIssue(
  _prev: IssueActionState,
  formData: FormData,
): Promise<IssueActionState> {
  try {
    const issue = createIssueTicket({
      source: "public",
      company: String(formData.get("company") || "").trim(),
      contactName: String(formData.get("contactName") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      orderId: String(formData.get("orderId") || "").trim(),
      category: String(formData.get("category") || "other"),
      title: String(formData.get("title") || "").trim(),
      detail: String(formData.get("detail") || "").trim(),
    });
    return { ok: true, issueId: issue.issueId };
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    return { ok: false, error: ERRORS[code] || "ส่งเรื่องไม่สำเร็จ กรุณาลองใหม่" };
  }
}
