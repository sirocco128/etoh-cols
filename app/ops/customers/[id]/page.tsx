import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CustomerOpsForm } from "@/components/CustomerOpsForm";
import { getCustomerById } from "@/lib/customer-repository";
import {
  isOpsAuthConfigured,
  requireOpsSession,
} from "@/lib/ops-auth";
import { listQuoteRequests } from "@/lib/quote-repository";
import {
  LEAD_STATUS_LABELS,
  type LeadStatus,
} from "@/lib/quote-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

export default async function OpsCustomerDetailPage({
  params,
}: {
  params: Params;
}) {
  if (!isOpsAuthConfigured() || !(await requireOpsSession())) {
    redirect("/ops/login");
  }

  const { id: idRaw } = await params;
  const id = Number(idRaw);
  if (!Number.isFinite(id)) notFound();

  const customer = getCustomerById(id);
  if (!customer) notFound();

  const quotes = listQuoteRequests({ customerId: id, limit: 50 });

  return (
    <div>
      <p className="text-sm">
        <Link
          href="/ops/customers"
          className="text-forest underline-offset-2 hover:underline"
        >
          ← รายการลูกค้า
        </Link>
      </p>
      <h1 className="mt-3 text-2xl font-bold text-forest">{customer.company}</h1>
      <p className="mt-1 text-sm text-ink/70">
        {customer.email} · RFQ {customer.quoteCount} ครั้ง
      </p>

      <CustomerOpsForm customer={customer} />

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-forest">ประวัติใบเสนอราคา</h2>
        <ul className="mt-3 divide-y divide-forest/10 border-t border-forest/10">
          {quotes.length === 0 ? (
            <li className="py-4 text-sm text-ink/60">ยังไม่มีคำขอที่ผูกกับลูกค้านี้</li>
          ) : (
            quotes.map((q) => (
              <li key={q.requestId} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <Link
                  href={`/ops/quotes/${q.requestId}`}
                  className="font-mono text-xs text-forest underline-offset-2 hover:underline"
                >
                  {q.requestId}
                </Link>
                <span>
                  {LEAD_STATUS_LABELS[q.leadStatus as LeadStatus] || q.leadStatus}
                </span>
                <span className="text-ink/65">{q.quantity} ชุด</span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
