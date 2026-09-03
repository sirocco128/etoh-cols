import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { bangkokTodayYmd, quoteSchema } from "../lib/quote-schema";

function bangkokYesterdayYmd(): string {
  const today = bangkokTodayYmd();
  const [yRaw, mRaw, dRaw] = today.split("-");
  const y = Number(yRaw);
  const m = Number(mRaw);
  const d = Number(dRaw);
  const dt = new Date(Date.UTC(y, m - 1, d - 1));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

const basePayload = {
  name: "สมชาย ใจดี",
  company: "บริษัท ตัวอย่าง จำกัด",
  email: "somchai@acme.co.th",
  phone: "02-123-4567",
  quantity: 100,
  consent: true,
  decorationMethod: "uv-print" as const,
  website: "",
  startedAt: Date.now() - 5_000,
};

describe("date-boundary Asia/Bangkok (§31 required)", () => {
  it("accepts neededDate equal to today in Asia/Bangkok", () => {
    const parsed = quoteSchema.safeParse({
      ...basePayload,
      neededDate: bangkokTodayYmd(),
    });
    assert.equal(parsed.success, true);
  });

  it("rejects neededDate earlier than today in Asia/Bangkok", () => {
    const parsed = quoteSchema.safeParse({
      ...basePayload,
      neededDate: bangkokYesterdayYmd(),
    });
    assert.equal(parsed.success, false);
    if (parsed.success) return;
    assert.ok(
      parsed.error.issues.some((issue) => issue.path[0] === "neededDate"),
    );
  });

  it("rejects an impossible calendar date", () => {
    const parsed = quoteSchema.safeParse({
      ...basePayload,
      neededDate: "2026-02-31",
    });
    assert.equal(parsed.success, false);
    if (parsed.success) return;
    assert.ok(
      parsed.error.issues.some((issue) => issue.path[0] === "neededDate"),
    );
  });
});
