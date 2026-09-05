import { NextResponse } from "next/server";
import { isOpsAuthConfigured, requireOpsActor } from "@/lib/ops-auth";
import { getPaymentSlip, readSlipFile } from "@/lib/payment-slips";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = Promise<{ slipId: string }>;

export async function GET(
  _req: Request,
  { params }: { params: Params },
) {
  if (!isOpsAuthConfigured() || !(await requireOpsActor("orders.read"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { slipId } = await params;
  const slip = getPaymentSlip(slipId);
  if (!slip) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const bytes = await readSlipFile(slip.filePath);
  if (!bytes) return NextResponse.json({ error: "missing_file" }, { status: 404 });
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": slip.contentType,
      "Cache-Control": "private, max-age=60",
    },
  });
}
