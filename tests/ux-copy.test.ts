import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HOW_IT_WORKS,
  PRICE_DISCLAIMER_FULL,
  PRICE_DISCLAIMER_SHORT,
  RFQ_NO_PAYMENT,
} from "../lib/ux-copy.js";

const BUYER_JARGON = /\b(P2|RFQ|MOQ|SKU|Proof|Brief|Stub|SEO Landing)\b/i;

describe("ux-copy (buyer-facing strings)", () => {
  it("RFQ disclaimer avoids internal jargon and mentions no payment", () => {
    assert.doesNotMatch(RFQ_NO_PAYMENT, BUYER_JARGON);
    assert.match(RFQ_NO_PAYMENT, /ไม่มีการชำระเงิน/);
    assert.match(RFQ_NO_PAYMENT, /ยังไม่ใช่การยืนยัน/);
  });

  it("price disclaimers are non-empty and jargon-free", () => {
    for (const copy of [PRICE_DISCLAIMER_SHORT, PRICE_DISCLAIMER_FULL]) {
      assert.ok(copy.length > 20);
      assert.doesNotMatch(copy, BUYER_JARGON);
      assert.match(copy, /ประมาณ|โดยประมาณ/);
    }
  });

  it("how-it-works steps are complete", () => {
    assert.equal(HOW_IT_WORKS.length, 3);
    for (const step of HOW_IT_WORKS) {
      assert.ok(step.title.length > 0);
      assert.ok(step.body.length > 0);
      assert.doesNotMatch(step.title, BUYER_JARGON);
      assert.doesNotMatch(step.body, BUYER_JARGON);
    }
  });
});
