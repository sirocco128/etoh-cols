import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { quoteSchema, parseQuoteFormData } from "../lib/quote-schema";

function bangkokTomorrowISODate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const dt = new Date(Date.UTC(get("year"), get("month") - 1, get("day") + 1));
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const basePayload = {
  name: "สมชาย ใจดี",
  company: "บริษัท ตัวอย่าง จำกัด",
  email: "somchai@acme.co.th",
  phone: "02-123-4567",
  quantity: 100,
  budgetPerSet: 500,
  neededDate: bangkokTomorrowISODate(),
  province: "กรุงเทพมหานคร",
  productInterest: "Welcome Kit",
  productSlug: "tumbler-notebook-pen-set",
  decorationMethod: "uv-print" as const,
  detail: "ต้องการสกรีนโลโก้สองตำแหน่ง",
  consent: true,
  website: "",
  startedAt: Date.now() - 5_000,
  landingPath: "/premium-giftset",
  referrer: "https://www.google.com/",
  utmSource: "google",
  utmMedium: "cpc",
  utmCampaign: "giftset",
  utmTerm: "",
  utmContent: "",
};

describe("quote-schema (§31.1)", () => {
  it("accepts a complete valid request", () => {
    const parsed = quoteSchema.safeParse(basePayload);
    assert.equal(parsed.success, true);
  });

  it("rejects an invalid email", () => {
    const parsed = quoteSchema.safeParse({
      ...basePayload,
      email: "not-an-email",
    });
    assert.equal(parsed.success, false);
  });

  it("rejects missing consent", () => {
    const parsed = quoteSchema.safeParse({
      ...basePayload,
      consent: false,
    });
    assert.equal(parsed.success, false);
  });

  it("rejects an impossible calendar date", () => {
    const parsed = quoteSchema.safeParse({
      ...basePayload,
      neededDate: "2026-02-31",
    });
    assert.equal(parsed.success, false);
  });

  it("rejects a malformed product slug", () => {
    const parsed = quoteSchema.safeParse({
      ...basePayload,
      productSlug: "Bad_Slug!!",
    });
    assert.equal(parsed.success, false);
  });

  it("parseQuoteFormData maps FormData fields", () => {
    const fd = new FormData();
    fd.set("name", basePayload.name);
    fd.set("company", basePayload.company);
    fd.set("email", basePayload.email);
    fd.set("phone", basePayload.phone);
    fd.set("quantity", String(basePayload.quantity));
    fd.set("consent", "on");
    fd.set("decorationMethod", basePayload.decorationMethod);
    fd.set("startedAt", String(basePayload.startedAt));
    fd.set("website", "");
    fd.set("neededDate", basePayload.neededDate);
    const result = parseQuoteFormData(fd);
    assert.equal(result.success, true);
  });
});
