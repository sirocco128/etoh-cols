import Link from "next/link";
import { redirect } from "next/navigation";
import {
  countCustomers,
  listCustomers,
} from "@/lib/customer-repository";
import type { CustomerStatus } from "@/lib/customer-types";
import { CUSTOMER_STATUSES } from "@/lib/customer-types";
import {
  isOpsAuthConfigured,
  requireOpsSession,
} from "@/lib/ops-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SearchParams = Promise<{
  q?: string;
  status?: string;
}>;

export default async function OpsCustomersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!isOpsAuthConfigured() || !(await requireOpsSession())) {
    redirect("/ops/login");
  }

  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const statusRaw = (sp.status || "all").trim();
  const status =
    statusRaw === "all" ||
    (CUSTOMER_STATUSES as readonly string[]).includes(statusRaw)
      ? (statusRaw as CustomerStatus | "all")
      : "all";

  const customers = listCustomers({ q, status, limit: 100 });
  const total = countCustomers({ q, status });

  return (
    <div>
      <h1 className="text-2xl font-bold text-forest">ลูกค้า</h1>
      <p className="mt-1 text-sm text-ink/70">
        พบ {total} รายการ — สร้างอัตโนมัติเมื่อมี RFQ ใหม่ (คีย์ = อีเมล)
      </p>

      <form className="mt-6 flex flex-wrap gap-3" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="ค้นหา บริษัท / อีเมล / ชื่อ"
          className="min-w-[220px] flex-1 rounded border border-forest/20 bg-paper px-3 py-2 text-sm"
        />
        <select
          name="status"
          defaultValue={status}
          className="rounded border border-forest/20 bg-paper px-3 py-2 text-sm"
        >
          <option value="all">ทุกสถานะ</option>
          <option value="active">ใช้งาน</option>
          <option value="inactive">ปิดใช้งาน</option>
        </select>
        <button
          type="submit"
          className="rounded bg-forest px-4 py-2 text-sm font-medium text-paper"
        >
          กรอง
        </button>
      </form>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-forest/15 text-forest">
              <th className="px-2 py-2 font-semibold">บริษัท</th>
              <th className="px-2 py-2 font-semibold">ผู้ติดต่อ</th>
              <th className="px-2 py-2 font-semibold">อีเมล</th>
              <th className="px-2 py-2 font-semibold">RFQ</th>
              <th className="px-2 py-2 font-semibold">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-2 py-8 text-center text-ink/60">
                  ยังไม่มีลูกค้า — ส่งคำขอที่ /contact เพื่อสร้างอัตโนมัติ
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-forest/10 hover:bg-paper/80"
                >
                  <td className="px-2 py-2.5">
                    <Link
                      href={`/ops/customers/${c.id}`}
                      className="font-medium text-forest underline-offset-2 hover:underline"
                    >
                      {c.company}
                    </Link>
                  </td>
                  <td className="px-2 py-2.5">{c.contactName || "—"}</td>
                  <td className="px-2 py-2.5 text-xs">{c.email}</td>
                  <td className="px-2 py-2.5">{c.quoteCount}</td>
                  <td className="px-2 py-2.5">
                    {c.status === "active" ? "ใช้งาน" : "ปิดใช้งาน"}
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
