import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { QuoteOpsForm } from "@/components/QuoteOpsForm";
import { getCustomerById } from "@/lib/customer-repository";
import {
  isOpsAuthConfigured,
  requireOpsSession,
} from "@/lib/ops-auth";
import { getQuoteByRequestId } from "@/lib/quote-repository";
import {
  LEAD_STATUS_LABELS,
  type LeadStatus,
} from "@/lib/quote-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = Promise<{ requestId: string }>;

export default async function OpsQuoteDetailPage({
  params,
}: {
  params: Params;
}) {
  if (!isOpsAuthConfigured() || !(await requireOpsSession())) {
    redirect("/ops/login");
  }

  const { requestId } = await params;
  const quote = getQuoteByRequestId(requestId);
  if (!quote) notFound();

  const customer = quote.customerId
    ? getCustomerById(quote.customerId)
    : null;

  return (
    <div>
      <p className="text-sm">
        <Link href="/ops/quotes" className="text-forest underline-offset-2 hover:underline">
          ← รายการใบเสนอราคา
        </Link>
      </p>
      <h1 className="mt-3 font-mono text-xl font-bold text-forest sm:text-2xl">
        {quote.requestId}
      </h1>
      <p className="mt-1 text-sm text-ink/70">
        สถานะ: {LEAD_STATUS_LABELS[quote.leadStatus as LeadStatus] || quote.leadStatus}
        {" · "}Webhook: {quote.webhookStatus}
      </p>

      <dl className="mt-6 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-ink/55">บริษัท</dt>
          <dd className="font-medium">{quote.company}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink/55">ผู้ติดต่อ</dt>
          <dd>{quote.name}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink/55">อีเมล</dt>
          <dd>
            <a className="text-forest underline" href={`mailto:${quote.email}`}>
              {quote.email}
            </a>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink/55">โทร</dt>
          <dd>
            <a className="text-forest underline" href={`tel:${quote.phone}`}>
              {quote.phone}
            </a>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink/55">จำนวน</dt>
          <dd>{quote.quantity} ชุด</dd>
        </div>
        <div>
          <dt className="text-xs text-ink/55">งบต่อชุด</dt>
          <dd>{quote.budgetPerSet ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink/55">สินค้าสนใจ</dt>
          <dd>{quote.productInterest || quote.productSlug || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink/55">เทคนิคตกแต่ง</dt>
          <dd>{quote.decorationMethod}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-ink/55">รายละเอียด</dt>
          <dd className="whitespace-pre-wrap text-ink/85">
            {quote.detail || "—"}
          </dd>
        </div>
      </dl>

      {customer ? (
        <p className="mt-4 text-sm">
          ลูกค้า:{" "}
          <Link
            href={`/ops/customers/${customer.id}`}
            className="font-medium text-forest underline-offset-2 hover:underline"
          >
            {customer.company}
          </Link>
        </p>
      ) : null}

      <QuoteOpsForm
        requestId={quote.requestId}
        leadStatus={quote.leadStatus as LeadStatus}
        salesNotes={quote.salesNotes}
      />
    </div>
  );
}
