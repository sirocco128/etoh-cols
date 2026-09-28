import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ETOH_GRADES,
  ETOH_PACKS,
  listSkus,
  parseSkuCode,
  perKgFromPerLitre,
  perLitreFromPerKg,
  skuCode,
} from "../lib/etoh/catalog";
import {
  computeEtohQuote,
  defaultPriceBook,
  EtohPricingError,
  planContainers,
  resolveTier,
  stripEtohCost,
} from "../lib/etoh/pricing";
import { ETOH_END_USES, findEndUse } from "../lib/etoh/brand";

function book() {
  const b = defaultPriceBook({ IND95: 30, IND999: 34, DEN: 28, TBA: 29, FOOD: 40 });
  b.packs.DRUM200.depositThb = 800;
  b.packs.IBC1000.depositThb = 3500;
  b.packs.GAL20.containerCostThb = 45;
  b.packs.GAL20.repackCostThb = 15;
  return b;
}

describe("etoh catalog", () => {
  it("builds grade × pack SKUs and parses them back", () => {
    const skus = listSkus();
    assert.equal(skus.length, ETOH_GRADES.length * ETOH_PACKS.length);
    assert.equal(skuCode("IND95", "DRUM200"), "ETH-IND95-DRUM200");
    assert.deepEqual(parseSkuCode("ETH-FOOD-GAL5"), { grade: "FOOD", pack: "GAL5" });
    assert.equal(parseSkuCode("ETH-XXX-GAL5"), null);
    assert.equal(parseSkuCode("SG-001"), null);
  });

  it("keeps the nine end-use segments from the poster", () => {
    assert.equal(ETOH_END_USES.length, 9);
    assert.equal(findEndUse("printing-coating")?.no, 5);
  });
});

describe("etoh pricing engine", () => {
  it("prices standard drums with deposit outside the VAT base", () => {
    const r = computeEtohQuote(
      { customerTier: "standard", lines: [{ grade: "IND95", pack: "DRUM200", qty: 2 }] },
      book(),
    );
    const line = r.lines[0]!;
    assert.equal(r.appliedTier, "standard");
    assert.equal(line.unitPriceThb, 6000); // 30 × 200
    assert.equal(line.lineTotalThb, 12000);
    assert.equal(line.litres, 400);
    assert.equal(line.kg, 324); // 400 × 0.81
    assert.equal(r.depositThb, 1600);
    assert.equal(r.vatBaseThb, 12000);
    assert.equal(r.vatThb, 840);
    assert.equal(r.grandTotalThb, 12000 + 840 + 1600);
  });

  it("upgrades to the volume tier from 1,000 litres", () => {
    const r = computeEtohQuote(
      { customerTier: "standard", lines: [{ grade: "IND95", pack: "DRUM200", qty: 5 }] },
      book(),
    );
    assert.equal(r.appliedTier, "volume");
    assert.equal(r.appliedDiscountPct, 2.5);
    assert.equal(r.lines[0]!.unitPriceThb, 5850); // 6000 × 0.975
  });

  it("keeps a better CRM tier when volume is small", () => {
    const b = book();
    const r = resolveTier("dealer", 200, b);
    assert.equal(r.tier, "dealer");
  });

  it("adds markup, container and repack on one-way jerrycans", () => {
    const r = computeEtohQuote(
      { customerTier: "retail", lines: [{ grade: "IND95", pack: "GAL20", qty: 3 }] },
      book(),
    );
    // 30 × 20 × 1.20 + 45 + 15 = 780
    assert.equal(r.lines[0]!.unitPriceThb, 780);
    assert.equal(r.depositThb, 0);
    assert.equal(r.lines[0]!.pricePerLitreThb, 39);
  });

  it("applies delivery and header discount before VAT", () => {
    const r = computeEtohQuote(
      {
        customerTier: "standard",
        deliveryFeeThb: 500,
        extraDiscountThb: 100,
        lines: [{ grade: "IND95", pack: "DRUM200", qty: 1, chargeDeposit: false }],
      },
      book(),
    );
    assert.equal(r.vatBaseThb, 6400);
    assert.equal(r.vatThb, 448);
    assert.equal(r.depositThb, 0);
    assert.equal(r.grandTotalThb, 6848);
  });

  it("computes margin when landed cost is known and strips it for sales", () => {
    const b = book();
    b.landedCostPerLitre.IND95 = 27;
    const r = computeEtohQuote(
      { customerTier: "standard", lines: [{ grade: "IND95", pack: "DRUM200", qty: 1 }] },
      b,
    );
    assert.equal(r.costTotalThb, 5400);
    assert.equal(r.marginThb, 600);
    assert.equal(r.marginPct, 10);
    const s = stripEtohCost(r);
    assert.equal(s.marginThb, null);
    assert.equal(s.lines[0]!.costTotalThb, null);
  });

  it("warns when selling below landed cost", () => {
    const b = book();
    b.landedCostPerLitre.IND95 = 31;
    const r = computeEtohQuote(
      { customerTier: "standard", lines: [{ grade: "IND95", pack: "DRUM200", qty: 1 }] },
      b,
    );
    assert.ok(r.warnings.some((w) => w.includes("ต่ำกว่าต้นทุน")));
    assert.ok(!stripEtohCost(r).warnings.some((w) => w.includes("ต้นทุน")));
  });

  it("flags FDA paperwork for food grade and honours overrides", () => {
    const r = computeEtohQuote(
      {
        customerTier: "standard",
        lines: [{ grade: "FOOD", pack: "DRUM200", qty: 1, unitPriceOverrideThb: 7777.77 }],
      },
      book(),
    );
    assert.equal(r.lines[0]!.overridden, true);
    assert.equal(r.lines[0]!.unitPriceThb, 7777.77);
    assert.ok(r.warnings.some((w) => w.includes("อย.")));
  });

  it("rejects bad input", () => {
    assert.throws(
      () => computeEtohQuote({ customerTier: "standard", lines: [] }, book()),
      EtohPricingError,
    );
    assert.throws(
      () =>
        computeEtohQuote(
          { customerTier: "standard", lines: [{ grade: "IND95", pack: "DRUM200", qty: 1.5 }] },
          book(),
        ),
      EtohPricingError,
    );
    assert.throws(
      () =>
        computeEtohQuote(
          { customerTier: "standard", lines: [{ grade: "IND95", pack: "DRUM200", qty: 1 }] },
          defaultPriceBook({}),
        ),
      /ยังไม่ได้ตั้งราคาฐาน/,
    );
  });

  it("keeps unit × qty equal to line total with fractional prices", () => {
    const b = defaultPriceBook({ IND95: 29.333 });
    const r = computeEtohQuote(
      { customerTier: "standard", lines: [{ grade: "IND95", pack: "DRUM200", qty: 3 }] },
      b,
    );
    const line = r.lines[0]!;
    assert.equal(Math.round(line.unitPriceThb * 100) * 3, Math.round(line.lineTotalThb * 100));
  });
});

describe("container planning", () => {
  it("plans ISO tanks by litres and rounds up", () => {
    assert.deepEqual(planContainers(200000, 25000), {
      containers: 8,
      drums: 1000,
      litres: 200000,
      fillPct: 100,
    });
    const p = planContainers(25100);
    assert.equal(p.containers, 2);
    assert.equal(p.drums, 126);
    assert.equal(p.fillPct, 50.2);
  });

  it("converts THB/kg ↔ THB/L at the trade factor 0.80 kg/L", () => {
    assert.equal(perLitreFromPerKg(34), 27.2);
    assert.equal(perLitreFromPerKg(38.5), 30.8);
    assert.equal(perKgFromPerLitre(27.2), 34);
    // 20,000 kg ISO tank = 25,000 L; same money either way.
    assert.equal(Math.round(perLitreFromPerKg(34) * 25000), 34 * 20000);
  });
});
