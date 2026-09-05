import { redirect } from "next/navigation";
import { listOpsAudit } from "@/lib/ops-audit";
import { actorMay, getOpsActor, isOpsAuthConfigured } from "@/lib/ops-auth";
import { ROLE_LABELS } from "@/lib/ops-roles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Bangkok",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default async function OpsAuditPage() {
  if (!isOpsAuthConfigured()) redirect("/ops/login");
  const actor = await getOpsActor();
  if (!actor) redirect("/ops/login");
  if (!actorMay(actor, "audit.read")) redirect("/ops/quotes");

  const rows = listOpsAudit({ limit: 200 });

  return (
    <div>
      <h1 className="text-2xl font-bold text-forest">บันทึกการใช้งาน</h1>
      <p className="mt-1 text-sm text-ink/70">
        เข้าสู่ระบบ แก้สถานะคำขอ และเรียกผู้ช่วยเซลล์ — รหัสลับถูกปิดก่อนบันทึก
      </p>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-forest/15 text-forest">
              <th className="px-2 py-2 font-semibold">เมื่อ</th>
              <th className="px-2 py-2 font-semibold">ผู้ใช้</th>
              <th className="px-2 py-2 font-semibold">การกระทำ</th>
              <th className="px-2 py-2 font-semibold">สถานะ</th>
              <th className="px-2 py-2 font-semibold">รายการ</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-2 py-8 text-center text-ink/60">
                  ยังไม่มีบันทึก
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-forest/10">
                  <td className="px-2 py-2.5 text-xs text-ink/70">
                    {formatWhen(row.createdAt)}
                  </td>
                  <td className="px-2 py-2.5">
                    <div>{row.actorName || row.actorEmail || "—"}</div>
                    <div className="text-xs text-ink/55">
                      {row.role ? ROLE_LABELS[row.role] : ""}
                    </div>
                  </td>
                  <td className="px-2 py-2.5 font-mono text-xs">{row.action}</td>
                  <td className="px-2 py-2.5">
                    {row.status === "ok" ? "สำเร็จ" : "ปฏิเสธ"}
                  </td>
                  <td className="px-2 py-2.5 text-xs text-ink/75">
                    {[row.resourceId, row.toolName, row.errorMessage]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
