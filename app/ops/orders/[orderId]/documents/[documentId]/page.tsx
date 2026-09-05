import { notFound, redirect } from "next/navigation";
import { BillingDocumentView } from "@/components/BillingDocumentView";
import { DocumentPreviewShell } from "@/components/DocumentPreviewShell";
import { isOpsAuthConfigured, requireOpsActor } from "@/lib/ops-auth";
import { getOrderBundle } from "@/lib/order-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = Promise<{ orderId: string; documentId: string }>;

export default async function OpsBillingDocumentPage({
  params,
}: {
  params: Params;
}) {
  if (!isOpsAuthConfigured() || !(await requireOpsActor("orders.read"))) {
    redirect("/ops/login");
  }
  const { orderId, documentId } = await params;
  const bundle = getOrderBundle(orderId);
  const document = bundle?.documents.find((d) => d.documentId === documentId);
  if (!document) notFound();

  return (
    <DocumentPreviewShell
      backHref={`/ops/orders/${orderId}`}
      backLabel="← กลับออเดอร์"
      fileName={document.documentId}
    >
      <BillingDocumentView document={document} />
    </DocumentPreviewShell>
  );
}
