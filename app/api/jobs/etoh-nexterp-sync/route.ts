import { NextResponse } from "next/server";
import { pushOutboxToNexterp } from "@/lib/etoh/nexterp-sync";
import { timingSafeEqualString } from "@/lib/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Cron: POST with `Authorization: Bearer $CRON_SECRET` every few minutes. */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET || "";
  if (!secret || secret.length < 32) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!timingSafeEqualString(token, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let batchSize = 50;
  try {
    const body = (await request.json()) as { batchSize?: number };
    if (typeof body.batchSize === "number") {
      batchSize = Math.min(200, Math.max(1, Math.floor(body.batchSize)));
    }
  } catch {
    // empty body is fine
  }
  const result = await pushOutboxToNexterp(batchSize);
  return NextResponse.json(result);
}
