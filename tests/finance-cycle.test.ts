import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function resolveProjectRoot(): string {
  if (
    process.env.PROJECT_ROOT &&
    existsSync(join(process.env.PROJECT_ROOT, "package.json"))
  ) {
    return process.env.PROJECT_ROOT;
  }
  let dir = __dirname;
  for (let i = 0; i < 6; i += 1) {
    if (existsSync(join(dir, "package.json"))) return dir;
    dir = join(dir, "..");
  }
  return join(__dirname, "..");
}

const ROOT = resolveProjectRoot();

describe("factory PO + management accounts cycle", () => {
  let dataDir = "";
  let sqlitePath = "";

  before(() => {
    dataDir = mkdtempSync(join(tmpdir(), "giftset-finance-"));
    sqlitePath = join(dataDir, "leads.sqlite");
    process.env.SQLITE_PATH = sqlitePath;
    process.env.LEAD_STORAGE_MODE = "sqlite";
    process.env.IP_HASH_SECRET =
      "test-ip-hash-secret-at-least-32-characters-long";
    process.env.SITE_TAX_ID = "0105556003873";
    process.env.PROMPTPAY_ID = "0105556003873";
    delete process.env.QUOTE_WEBHOOK_URL;

    const migrate = spawnSync(process.execPath, ["scripts/migrate.mjs"], {
      cwd: ROOT,
      env: { ...process.env, SQLITE_PATH: sqlitePath },
      encoding: "utf8",
    });
    assert.equal(migrate.status, 0, migrate.stderr || migrate.stdout);
  });

  after(() => {
    if (dataDir) rmSync(dataDir, { recursive: true, force: true });
  });

  it("computes landed cost and gross profit per order", async () => {
    const { computePoCost, gpPercent } = await import("../lib/po-cost");
    const cost = computePoCost({
      quantity: 100,
      factoryUnitCny: 12,
      fxCnyThb: 5,
      inlandThb: 500,
      freightThb: 3_000,
      importDutyThb: 800,
      customsFeeThb: 200,
      packingThb: 400,
      lastMileThb: 600,
    });
    assert.equal(cost.factoryAmountCny, 1_200);
    assert.equal(cost.factoryThb, 6_000);
    assert.equal(cost.cogsThb, 10_500);
    assert.equal(cost.sellingExpenseThb, 1_000);
    assert.equal(cost.landedTotalThb, 11_500);
    assert.equal(gpPercent(20_000, 9_500), 47.5);
  });

  it("posts balanced journals from payment → tax invoice → factory PO", async () => {
    const { closeDb } = await import("../lib/database");
    closeDb();
    const { resetQuoteRepository, updateQuoteOps } = await import(
      "../lib/quote-repository"
    );
    resetQuoteRepository();
    const { resetOrderRepository } = await import("../lib/order-repository");
    resetOrderRepository();

    const { submitQuotePayload } = await import("../lib/quote-service");
    const {
      createOrderFromQuote,
      confirmPayment,
      updateOrderFulfillment,
      getOrderBundle,
    } = await import("../lib/order-service");
    const { saveFactoryPo } = await import("../lib/factory-po-service");
    const { listJournals } = await import("../lib/ledger-repository");
    const { buildExecutivePnl } = await import("../lib/finance-report");
    const { journalsToCsv } = await import("../lib/ledger-service");

    const headers = new Headers({ "x-forwarded-for": "203.0.113.77" });
    const quoteResult = await submitQuotePayload(
      {
        name: "Finance Cycle",
        company: "บริษัท วงจรรายได้ จำกัด",
        email: "finance-cycle@acme.example",
        phone: "0819998877",
        quantity: 80,
        consent: true,
        decorationMethod: "screen-print",
        website: "",
        startedAt: Date.now() - 5_000,
      },
      { headers },
    );
    assert.equal(quoteResult.ok, true);
    if (!quoteResult.ok) return;
    updateQuoteOps({ requestId: quoteResult.requestId, leadStatus: "won" });

    const order = createOrderFromQuote({
      quoteRequestId: quoteResult.requestId,
      amount: 30_000,
      vatMode: "exclusive",
    });

    const po = saveFactoryPo({
      orderId: order.orderId,
      factoryName: "Shenzhen Gift Factory",
      factoryPlatform: "1688",
      productName: order.productSummary,
      quantity: 80,
      color: "กรมท่า",
      decorationMethod: "screen-print",
      logoNotes: "โลโก้ 1 สี ด้านข้างแก้ว",
      fxCnyThb: 5,
      factoryUnitCny: 20,
      inlandThb: 400,
      freightThb: 2_500,
      importDutyThb: 700,
      customsFeeThb: 150,
      packingThb: 300,
      lastMileThb: 500,
      status: "confirmed",
    });
    assert.equal(po.factoryThb, 8_000);
    assert.equal(po.landedTotalThb, 12_550);

    const deposit = getOrderBundle(order.orderId)?.payments[0];
    assert.ok(deposit);
    confirmPayment({ paymentId: deposit!.paymentId });

    updateOrderFulfillment({ orderId: order.orderId, status: "warehouse" });
    const remaining = getOrderBundle(order.orderId)?.payments.find(
      (p) => p.kind === "remaining" && p.status === "pending",
    );
    assert.ok(remaining);
    confirmPayment({ paymentId: remaining!.paymentId });

    const bundle = getOrderBundle(order.orderId);
    assert.ok(bundle?.documents.some((d) => d.documentType === "tax_invoice"));

    const journals = listJournals({ orderId: order.orderId, limit: 20 });
    assert.ok(journals.some((j) => j.sourceKey.startsWith("cash:")));
    assert.ok(journals.some((j) => j.sourceKey === `revenue:${order.orderId}`));
    assert.ok(journals.some((j) => j.sourceKey === `cogs:${po.poId}`));

    for (const entry of journals) {
      const debit = entry.lines.reduce((sum, line) => sum + line.debit, 0);
      const credit = entry.lines.reduce((sum, line) => sum + line.credit, 0);
      assert.equal(Math.round(debit * 100), Math.round(credit * 100), entry.sourceKey);
    }

    const csv = journalsToCsv(journals, (code) => code);
    assert.match(csv, /รหัสบัญชี/);
    assert.match(csv, /4100/);
    assert.match(csv, /5100/);

    const pnl = buildExecutivePnl({
      fromDate: "2000-01-01",
      toDate: "2099-12-31",
    });
    const row = pnl.rows.find((r) => r.orderId === order.orderId);
    assert.ok(row);
    assert.equal(row!.revenueExVat, 30_000);
    assert.equal(row!.cogsThb, 11_750);
    assert.equal(row!.grossProfit, 18_250);
    assert.equal(row!.contribution, 17_450);
    assert.equal(row!.missingCost, false);
  });
});
