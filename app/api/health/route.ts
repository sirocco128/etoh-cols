import { NextResponse } from "next/server";
import { pingDb } from "@/lib/database";
import { isMinioConfigured, pingMinio } from "@/lib/object-storage";

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
    let objects: "minio" | "local" | "minio-error" = "local";
    if (isMinioConfigured()) {
      objects = (await pingMinio()) ? "minio" : "minio-error";
    }
    return NextResponse.json(
      {
        status: "ok",
        service: "premium-giftset-web",
        storage,
        database: "ok",
        objects,
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
