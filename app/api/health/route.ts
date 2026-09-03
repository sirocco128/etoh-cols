import { NextResponse } from "next/server";
import { pingDb } from "@/lib/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const deep = url.searchParams.get("deep") === "1";
  const storage = process.env.LEAD_STORAGE_MODE || "sqlite";
  const timestamp = new Date().toISOString();

  if (!deep) {
    return NextResponse.json(
      {
        status: "ok",
        service: "premium-giftset-web",
        storage,
        database: "not-checked",
        timestamp,
      },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  try {
    const ok = pingDb();
    if (!ok) {
      throw new Error("database ping failed");
    }
    return NextResponse.json(
      {
        status: "ok",
        service: "premium-giftset-web",
        storage,
        database: "ok",
        timestamp,
      },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        service: "premium-giftset-web",
        storage,
        database: "error",
        timestamp,
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
