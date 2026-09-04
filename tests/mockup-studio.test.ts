import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildMockupBrief,
  clampOverlay,
  cylinderColumnToU,
  getSurfacesForProduct,
  overlayCoversUv,
  wrapUnit,
} from "../lib/mockup-studio";

describe("mockup-studio geometry", () => {
  it("wraps unit intervals", () => {
    assert.equal(wrapUnit(0.5), 0.5);
    assert.ok(Math.abs(wrapUnit(1.25) - 0.25) < 1e-10);
    assert.ok(Math.abs(wrapUnit(-0.1) - 0.9) < 1e-10);
  });

  it("maps the front column to the unwrap center at 0°", () => {
    assert.ok(Math.abs(cylinderColumnToU(0, 0) - 0.5) < 1e-10);
  });

  it("rotates the front column a quarter-turn at 90°", () => {
    const u = cylinderColumnToU(0, 90);
    assert.ok(Math.abs(u - 0.25) < 1e-10);
  });

  it("keeps cylinder overlays wrapping in u and clamped in v", () => {
    const next = clampOverlay(
      {
        id: "a",
        type: "image",
        label: "logo.png",
        u: 1.2,
        v: 0.95,
        w: 0.2,
        h: 0.2,
      },
      "cylinder",
    );
    assert.ok(Math.abs(next.u - 0.2) < 1e-10);
    assert.ok(next.v + next.h <= 1 + 1e-10);
  });

  it("hit-tests wrapped cylinder overlays across the seam", () => {
    const overlay = { u: 0.9, v: 0.3, w: 0.2, h: 0.2 };
    assert.equal(overlayCoversUv(overlay, 0.95, 0.4, true), true);
    assert.equal(overlayCoversUv(overlay, 0.05, 0.4, true), true);
    assert.equal(overlayCoversUv(overlay, 0.4, 0.4, true), false);
    assert.equal(overlayCoversUv(overlay, 0.95, 0.1, true), false);
  });
});

describe("mockup-studio product surfaces", () => {
  it("enables the gift-set templates on the tumbler product", () => {
    const surfaces = getSurfacesForProduct("tumbler-notebook-pen-set");
    assert.ok(surfaces);
    assert.deepEqual(
      surfaces.map((s) => s.id),
      ["tumbler", "notebook", "pen"],
    );
  });

  it("does not attach 360 templates to unrelated products", () => {
    assert.equal(getSurfacesForProduct("eco-tote-bamboo-set"), null);
  });
});

describe("mockup-studio quote brief", () => {
  it("summarizes overlays in Thai without promising production", () => {
    const brief = buildMockupBrief({
      productName: "เซ็ตกระบอกน้ำ",
      surfaceLabel: "กระบอกน้ำ",
      colorLabel: "ดำด้าน",
      rotationDeg: 42,
      overlays: [
        { type: "image", label: "logo.png" },
        { type: "text", label: "ชื่อ", text: "ACME" },
      ],
    });
    assert.match(brief, /ยังไม่ใช่แบบผลิต/);
    assert.match(brief, /กระบอกน้ำ/);
    assert.match(brief, /logo\.png/);
    assert.match(brief, /ACME/);
    assert.ok(brief.length <= 1800);
  });
});
