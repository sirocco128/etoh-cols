/**
 * Deliver the Etoh Cols outbox to NEXTERP (group consolidation).
 *
 * Contract (NEXTERP side must implement):
 *   POST {NEXTERP_SYNC_URL}
 *   Content-Type: application/json
 *   X-Source-App: etoh-cols
 *   X-Signature: sha256=<hex HMAC-SHA256 of the raw body with NEXTERP_SYNC_SECRET>
 *   X-Timestamp: <unix seconds>   (also inside the signed body; reject if skew > 5 min)
 *   body: { sourceApp, sentAt, timestamp, events: [{ outboxId, entity, entityId, event, createdAt, data }] }
 *   → 200 { accepted: number[] }   outboxIds stored (idempotent upsert on sourceApp + outboxId)
 *
 * Events not listed in `accepted` stay pending and are retried; after 10
 * failures they park as `failed` for review on /ops/etoh/sync.
 */

import { createHmac } from "node:crypto";
import { ETOH_SOURCE_APP, listOutbox, markOutboxFailed, markOutboxSent } from "@/lib/etoh/repository";

export type NexterpSyncConfig = {
  url: string;
  secret: string;
  enabled: boolean;
};

export function getNexterpSyncConfig(): NexterpSyncConfig {
  const url = (process.env.NEXTERP_SYNC_URL || "").trim();
  const secret = (process.env.NEXTERP_SYNC_SECRET || "").trim();
  let validUrl = false;
  try {
    const u = new URL(url);
    validUrl = u.protocol === "https:" || (u.protocol === "http:" && /^(localhost|127\.0\.0\.1|10\.|192\.168\.)/.test(u.hostname));
  } catch {
    validUrl = false;
  }
  return { url, secret, enabled: validUrl && secret.length >= 32 };
}

export function signNexterpBody(body: string, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

export type NexterpSyncResult = {
  attempted: number;
  sent: number;
  failed: number;
  skipped?: string;
};

export async function pushOutboxToNexterp(
  batchSize = 50,
  fetchImpl: typeof fetch = fetch,
  config: NexterpSyncConfig = getNexterpSyncConfig(),
): Promise<NexterpSyncResult> {
  if (!config.enabled) {
    return { attempted: 0, sent: 0, failed: 0, skipped: "NEXTERP_SYNC_URL / NEXTERP_SYNC_SECRET ยังไม่ได้ตั้ง" };
  }
  const events = listOutbox("pending", Math.min(200, Math.max(1, batchSize)));
  if (events.length === 0) return { attempted: 0, sent: 0, failed: 0 };

  const timestamp = Math.floor(Date.now() / 1000);
  const body = JSON.stringify({
    sourceApp: ETOH_SOURCE_APP,
    sentAt: new Date().toISOString(),
    timestamp,
    events: events.map((e) => ({
      outboxId: e.id,
      entity: e.entity,
      entityId: e.entityId,
      event: e.event,
      createdAt: e.createdAt,
      data: e.payload,
    })),
  });

  let accepted: Set<number>;
  try {
    const res = await fetchImpl(config.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-source-app": ETOH_SOURCE_APP,
        "x-timestamp": String(timestamp),
        "x-signature": signNexterpBody(body, config.secret),
      },
      body,
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { accepted?: unknown };
    accepted = new Set(
      Array.isArray(json.accepted) ? json.accepted.map(Number).filter(Number.isInteger) : [],
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    for (const e of events) markOutboxFailed(e.id, message);
    return { attempted: events.length, sent: 0, failed: events.length };
  }

  let sent = 0;
  let failed = 0;
  for (const e of events) {
    if (accepted.has(e.id)) {
      markOutboxSent(e.id);
      sent += 1;
    } else {
      markOutboxFailed(e.id, "not accepted by NEXTERP");
      failed += 1;
    }
  }
  return { attempted: events.length, sent, failed };
}
