import { EtohForm } from "@/components/etoh/EtohForm";
import { EtohSubnav } from "@/components/etoh/EtohSubnav";
import { pushNexterpNowAction } from "@/app/actions/ops-etoh";
import { isPlatformAdmin, requireOpsPage } from "@/lib/ops-auth";
import { listOutbox } from "@/lib/etoh/repository";
import { getNexterpSyncConfig } from "@/lib/etoh/nexterp-sync";
import { formatThaiDate } from "@/lib/etoh/ops-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUS_LABEL = { pending: "รอส่ง", sent: "ส่งแล้ว", failed: "ล้มเหลว" } as const;

export default async function EtohSyncPage() {
  const actor = await requireOpsPage("reports.read");
  const config = getNexterpSyncConfig();
  const pending = listOutbox("pending", 500);
  const failed = listOutbox("failed", 100);
  const recent = listOutbox(undefined, 50);

  return (
    <div>
      <h1 className="text-2xl font-bold text-forest">ส่งข้อมูลเข้า NEXTERP</h1>
      <p className="mt-1 max-w-3xl text-sm text-ink/70">
        ทุกการตั้งราคา ใบเสนอราคา ล็อตนำเข้า เงื่อนไขลูกค้า และถังหมุนเวียน ถูกบันทึกเป็นเหตุการณ์รอส่งไปรวมที่ NEXTERP
        (ส่งแบบลงลายเซ็น HMAC ทุกรอบ cron หรือกดส่งเอง) ต้นทุนถึงคลังไม่ถูกส่งออกจากระบบนี้
      </p>
      <EtohSubnav current="sync" />

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="ปลายทาง" value={config.enabled ? "ตั้งค่าแล้ว" : "ยังไม่ตั้งค่า"} hint={config.enabled ? new URL(config.url).host : "NEXTERP_SYNC_URL / NEXTERP_SYNC_SECRET"} />
        <Stat label="รอส่ง" value={pending.length.toLocaleString("th-TH")} />
        <Stat label="ล้มเหลว (ต้องตรวจ)" value={failed.length.toLocaleString("th-TH")} />
      </div>

      {isPlatformAdmin(actor.role) ? (
        <div className="mt-4 max-w-md">
          <EtohForm action={pushNexterpNowAction} submitLabel="ส่งตอนนี้" successLabel="ส่งครบแล้ว">
            <span className="sr-only">ส่งเหตุการณ์ที่รอส่ง</span>
          </EtohForm>
        </div>
      ) : null}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-forest/15 text-left text-forest">
              <th className="px-2 py-2 font-semibold">#</th>
              <th className="px-2 py-2 font-semibold">เหตุการณ์</th>
              <th className="px-2 py-2 font-semibold">อ้างอิง</th>
              <th className="px-2 py-2 font-semibold">สถานะ</th>
              <th className="px-2 py-2 text-right font-semibold">ครั้งที่ลอง</th>
              <th className="px-2 py-2 font-semibold">เวลา</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-2 py-8 text-center text-ink/60">ยังไม่มีเหตุการณ์</td>
              </tr>
            ) : (
              recent.map((e) => (
                <tr key={e.id} className="border-b border-forest/10 align-top">
                  <td className="px-2 py-2 tabular-nums">{e.id}</td>
                  <td className="px-2 py-2 font-mono text-xs">{e.event}</td>
                  <td className="px-2 py-2">{e.entity} · {e.entityId}</td>
                  <td className="px-2 py-2">
                    {STATUS_LABEL[e.status]}
                    {e.lastError ? <p className="text-xs text-red-700">{e.lastError}</p> : null}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{e.attempts}</td>
                  <td className="px-2 py-2 text-xs text-ink/60">{formatThaiDate(e.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-forest/15 bg-paper p-4">
      <p className="text-sm text-ink/70">{label}</p>
      <p className="text-xl font-bold text-forest">{value}</p>
      {hint ? <p className="truncate text-xs text-ink/55">{hint}</p> : null}
    </div>
  );
}
