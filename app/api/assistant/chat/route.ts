import { NextResponse } from "next/server";
import { runBuyerAssistant } from "@/lib/assistant-public";
import { isBuyerAssistantEnabled } from "@/lib/feature-flags";
import { consumeRateLimit } from "@/lib/quote-repository";
import { hashIp, resolveClientIp } from "@/lib/quote-service";
import { getFaqs } from "@/lib/strapi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readIntEnv(key: string, fallback: number): number {
  const raw = Number(process.env[key]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

export async function POST(request: Request) {
  if (!isBuyerAssistantEnabled()) {
    return NextResponse.json({ ok: false, error: "ปิดใช้งาน" }, { status: 404 });
  }

  let body: { message?: string };
  try {
    body = (await request.json()) as { message?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const ip = resolveClientIp(request.headers);
  const ipHash = hashIp(`assistant:${ip}`);
  const windowMinutes = readIntEnv("QUOTE_RATE_LIMIT_WINDOW_MINUTES", 15);
  const maxAttempts = readIntEnv("ASSISTANT_RATE_LIMIT_MAX", 12);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const bucketStart = nowSeconds - (nowSeconds % (windowMinutes * 60));
  const allowed = consumeRateLimit({
    keyHash: ipHash,
    bucketStart,
    maxAttempts,
    nowSeconds,
  });
  if (!allowed) {
    return NextResponse.json(
      { ok: false, error: "ถามบ่อยเกินไป ลองใหม่ในอีกสักครู่" },
      { status: 429 },
    );
  }

  const faqs = await getFaqs();
  const result = await runBuyerAssistant({
    message: String(body.message || ""),
    faqs,
  });

  return NextResponse.json({
    ok: true,
    reply: result.reply,
    sources: result.sources,
    refused: result.refused,
  });
}
