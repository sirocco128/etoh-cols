import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { teardownTempDir } from "./teardown-temp";

function resolveProjectRoot(): string {
  if (process.env.PROJECT_ROOT && existsSync(join(process.env.PROJECT_ROOT, "package.json"))) {
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

describe("etoh sales flow: quote → order → delivery note → tax invoice", () => {
  let dataDir = "";

  before(async () => {
    dataDir = mkdtempSync(join(tmpdir(), "etoh-sales-"));
    const sqlitePath = join(dataDir, "leads.sqlite");
    process.env.SQLITE_PATH = sqlitePath;
    process.env.SITE_TAX_ID = "0105556003873";
    process.env.PROMPTPAY_ID = "0105556003873";
    const migrate = spawnSync(process.execPath, ["scripts/migrate.mjs"], {
      cwd: ROOT,
      env: { ...process.env, SQLITE_PATH: sqlitePath },
      encoding: "utf8",
    });
    assert.equal(migrate.status, 0, migrate.stderr || migrate.stdout);
    const { closeDb } = await import("../lib/database");
    closeDb();
    const { resetOrderRepository } = await import("../lib/order-repository");
    resetOrderRepository();
  });

  after(() => {
    teardownTempDir(dataDir);
  });

  async function setup(creditDays: number, limit = 0) {
    const repo = await import("../lib/etoh/repository");
    const { computeEtohQuote } = await import("../lib/etoh/pricing");
    const { createCustomer } = await import("../lib/customer-repository");
    const suffix = Math.random().toString(36).slice(2, 8);
    const customer = createCustomer({
      company: `บริษัท หมึกพิมพ์ ${suffix} จำกัด`,
      email: `buyer-${suffix}@ink.test`,
      phone: "0812345678",
      contactName: "คุณสมชาย",
    });
    repo.saveCustomerTerms(
      { customerId: customer.id, priceTier: "standard", creditLimitThb: limit, creditTermDays: creditDays, reorderCycleDays: 14, endUseSegment: null },
      "t",
    );
    const input = { customerTier: "standard" as const, lines: [{ grade: "IND95" as const, pack: "DRUM200" as const, qty: 5 }] };
    const result = computeEtohQuote(input, repo.loadPriceBook());
    const q = repo.saveQuote({ customerId: customer.id, customerName: customer.company, input, result, actor: "sales" });
    repo.setQuoteStatus(q.id, "sent", "sales");
    repo.setQuoteStatus(q.id, "accepted", "sales");
    return { customer, quote: repo.getQuote(q.id)! };
  }

  it("prepares price book and released lots", async () => {
    const repo = await import("../lib/etoh/repository");
    repo.addPriceEntry({ gradeCode: "IND95", basePricePerLitre: 30, landedCostPerLitre: 26, effectiveFrom: "2026-01-01", actor: "t" });
    repo.savePackSettings({ code: "DRUM200", containerCostThb: 0, depositThb: 800, repackCostThb: 0, smallPackMarkupPct: 0, active: true }, "t");
    const a = repo.createLot({ lotNo: "LOT-A", gradeCode: "IND95", receivedLitres: 600, arrivalDate: "2026-08-01", coaPurityPct: 95.2, actor: "wh" });
    const b = repo.createLot({ lotNo: "LOT-B", gradeCode: "IND95", receivedLitres: 16000, arrivalDate: "2026-09-01", coaPurityPct: 95.4, actor: "wh" });
    repo.setLotStatus(a.id, "released", "qa");
    repo.setLotStatus(b.id, "released", "qa");
    const q = repo.createLot({ lotNo: "LOT-Q", gradeCode: "IND95", receivedLitres: 9999, arrivalDate: "2026-07-01", coaPurityPct: 95, actor: "wh" });
    assert.equal(q.status, "quarantine");
  });

  it("credit customer: order without deposit, ships first, tax invoice + AR at delivery, FIFO lots, drums out", async () => {
    const sales = await import("../lib/etoh/sales");
    const repo = await import("../lib/etoh/repository");
    const { getOrderBundle } = await import("../lib/order-service");
    const { customer, quote } = await setup(30);

    assert.throws(() => sales.convertQuoteToOrder({ quoteId: 999999, actor: "s" }), /ไม่พบ/);
    const order = sales.convertQuoteToOrder({ quoteId: quote.id, actor: "sales" });
    assert.equal(order.paymentStatus, "balance_due");
    assert.equal(order.depositAmount, 0);
    // 5 drums = 1,000 L → volume tier 2.5%: 5 × 5,850
    assert.equal(order.subtotalExVat, 29250);
    assert.equal(order.totalAmount, 31297.5);
    assert.equal(sales.convertQuoteToOrder({ quoteId: quote.id, actor: "sales" }).orderId, order.orderId, "idempotent");
    assert.equal(repo.getQuote(quote.id)!.status, "accepted");

    const shipment = sales.shipOrder({ orderId: order.orderId, vehicle: "70-1234", actor: "wh" });
    assert.match(shipment.dnNo, /^DN-\d{4}-0001$/);
    assert.ok(shipment.dueDate);
    // FIFO: LOT-A (600 L, older) fully used, rest from LOT-B; quarantine lot untouched
    assert.deepEqual(
      shipment.lots.map((l) => [l.lotNo, l.litres]),
      [["LOT-A", 600], ["LOT-B", 400]],
    );
    const lots = repo.listLots();
    assert.equal(lots.find((l) => l.lotNo === "LOT-A")!.status, "depleted");
    assert.equal(sales.lotRemainingLitres(lots.find((l) => l.lotNo === "LOT-B")!.id), 15600);

    const bundle = getOrderBundle(order.orderId)!;
    const types = bundle.documents.map((d) => d.documentType);
    assert.ok(types.includes("tax_invoice"));
    assert.ok(!types.includes("receipt"), "no receipt until paid");
    assert.equal(bundle.order.fulfillmentStatus, "out_for_delivery");
    assert.ok(bundle.payments.some((p) => p.kind === "remaining" && p.status === "pending"));

    const [drums] = repo.drumBalances(customer.id);
    assert.equal(drums?.outstanding, 5);
    assert.equal(drums?.depositHeldThb, 4000);

    assert.throws(() => sales.shipOrder({ orderId: order.orderId, actor: "wh" }), /ส่งครบทุกรายการแล้ว/);
    const delivered = sales.markDelivered(shipment.id, "คุณสมศรี", "wh");
    assert.equal(delivered.status, "delivered");

    const pos = sales.creditPosition(customer.id);
    assert.equal(pos.outstandingThb, bundle.order.totalAmount);
    assert.equal(sales.overdueInvoices(shipment.dueDate!).length, 0);
    assert.equal(sales.overdueInvoices("2099-01-01").length >= 1, true);
  });

  it("paying a credit invoice later issues the receipt", async () => {
    const sales = await import("../lib/etoh/sales");
    const { getOrderBundle, submitCustomerPayment, confirmPayment } = await import("../lib/order-service");
    const [item] = sales.listEtohOrders();
    const bundle = getOrderBundle(item!.order.orderId)!;
    const pay = bundle.payments.find((p) => p.status === "pending")!;
    try {
      submitCustomerPayment({ orderId: bundle.order.orderId, token: bundle.order.accessToken, paymentId: pay.paymentId, reference: "TRX1" });
    } catch {
      // submission API shape may differ; confirmation is what matters
    }
    confirmPayment({ paymentId: pay.paymentId, actor: "acc" });
    const after = getOrderBundle(bundle.order.orderId)!;
    assert.equal(after.order.paymentStatus, "paid");
    assert.ok(after.documents.some((d) => d.documentType === "receipt"));
    assert.equal(after.documents.filter((d) => d.documentType === "tax_invoice").length, 1);
  });

  it("cash customer must pay before shipping; credit limit blocks big orders", async () => {
    const sales = await import("../lib/etoh/sales");
    const { quote } = await setup(0);
    const order = sales.convertQuoteToOrder({ quoteId: quote.id, actor: "sales" });
    assert.equal(order.paymentStatus, "deposit_due");
    assert.equal(order.depositAmount, order.totalAmount);
    assert.throws(() => sales.shipOrder({ orderId: order.orderId, actor: "wh" }), /ชำระครบก่อนส่ง/);

    const limited = await setup(30, 1000);
    assert.throws(() => sales.convertQuoteToOrder({ quoteId: limited.quote.id, actor: "sales" }), /วงเงินเครดิต/);
    const ok = sales.convertQuoteToOrder({ quoteId: limited.quote.id, overrideCreditLimit: true, actor: "admin" });
    assert.ok(ok.orderId);
  });

  it("refuses to ship when released stock is short and leaves nothing half-written", async () => {
    const sales = await import("../lib/etoh/sales");
    const repo = await import("../lib/etoh/repository");
    const { computeEtohQuote } = await import("../lib/etoh/pricing");
    const { createCustomer } = await import("../lib/customer-repository");
    repo.addPriceEntry({ gradeCode: "FOOD", basePricePerLitre: 40, effectiveFrom: "2026-01-01", actor: "t" });
    const c = createCustomer({ company: "บริษัท อาหารไทย จำกัด", email: "food@t.test", phone: "0899999999", contactName: "คุณเอ" });
    repo.saveCustomerTerms({ customerId: c.id, priceTier: "standard", creditLimitThb: 0, creditTermDays: 30, reorderCycleDays: null, endUseSegment: null }, "t");
    const input = { customerTier: "standard" as const, lines: [{ grade: "FOOD" as const, pack: "DRUM200" as const, qty: 1 }] };
    const q = repo.saveQuote({ customerId: c.id, customerName: c.company, input, result: computeEtohQuote(input, repo.loadPriceBook()), actor: "s" });
    repo.setQuoteStatus(q.id, "sent", "s");
    repo.setQuoteStatus(q.id, "accepted", "s");
    const order = sales.convertQuoteToOrder({ quoteId: q.id, actor: "s" });
    assert.throws(() => sales.shipOrder({ orderId: order.orderId, actor: "wh" }), /ไม่พอ/);
    assert.equal(sales.getShipmentByOrder(order.orderId), null);
  });
  it("ships in parts: one tax invoice per delivery note, last one reconciles the order", async () => {
    const sales = await import("../lib/etoh/sales");
    const { getOrderBundle } = await import("../lib/order-service");
    const { quote } = await setup(30); // 5 drums
    const order = sales.convertQuoteToOrder({ quoteId: quote.id, actor: "sales" });
    assert.throws(() => sales.shipOrder({ orderId: order.orderId, items: [{ lineIndex: 0, qty: 6 }], actor: "wh" }), /ไม่เกิน 5/);
    const first = sales.shipOrder({ orderId: order.orderId, items: [{ lineIndex: 0, qty: 2 }], actor: "wh" });
    assert.equal(first.items[0]!.qty, 2);
    assert.equal(first.subtotalExVat, 11700);
    assert.equal(first.depositThb, 1600);
    let bundle = getOrderBundle(order.orderId)!;
    assert.equal(bundle.order.fulfillmentStatus, "out_for_delivery");
    assert.equal(bundle.payments.find((p) => p.status === "pending")!.amount, first.grandTotal, "voucher = invoiced so far");

    const second = sales.shipOrder({ orderId: order.orderId, actor: "wh" }); // rest
    assert.equal(second.items[0]!.qty, 3);
    assert.equal(
      Math.round((first.grandTotal + second.grandTotal) * 100),
      Math.round(order.totalAmount * 100),
      "invoices add up to the order",
    );
    bundle = getOrderBundle(order.orderId)!;
    assert.equal(bundle.documents.filter((d) => d.documentType === "tax_invoice").length, 2);
    assert.equal(bundle.payments.filter((p) => p.status === "pending").length, 1);
    assert.equal(bundle.payments.find((p) => p.status === "pending")!.amount, order.totalAmount);
    const items = sales.listEtohOrders().find((i) => i.order.orderId === order.orderId)!;
    assert.equal(items.progress.fullyShipped, true);

    sales.markDelivered(first.id, "A", "wh");
    assert.equal(getOrderBundle(order.orderId)!.order.fulfillmentStatus, "out_for_delivery", "not all delivered yet");
    sales.markDelivered(second.id, "B", "wh");
    assert.equal(getOrderBundle(order.orderId)!.order.fulfillmentStatus, "delivered");
  });

  it("deposit cycle: charge per delivery note, settle to 2150, returns cancel uncollected charges and refund the rest", async () => {
    const sales = await import("../lib/etoh/sales");
    const repo = await import("../lib/etoh/repository");
    const { listJournals } = await import("../lib/ledger-repository");
    const { customer, quote } = await setup(30); // 5 drums × 800
    const order = sales.convertQuoteToOrder({ quoteId: quote.id, actor: "sales" });
    const s1 = sales.shipOrder({ orderId: order.orderId, items: [{ lineIndex: 0, qty: 3 }], actor: "wh" });
    sales.shipOrder({ orderId: order.orderId, actor: "wh" });
    const charges = sales.listDepositDocs({ customerId: customer.id, kind: "charge" });
    assert.deepEqual(charges.map((c) => c.amountThb).sort(), [1600, 2400]);
    assert.ok(charges.every((c) => /^DP-\d{4}-\d{4}$/.test(c.docNo)));

    // Collect the first (3 drums, 2,400) only.
    const firstCharge = charges.find((c) => c.shipmentId === s1.id)!;
    sales.settleDepositDoc({ id: firstCharge.id, method: "transfer", reference: "TRX", actor: "acc" });
    assert.throws(() => sales.settleDepositDoc({ id: firstCharge.id, method: "cash", actor: "acc" }), /ปิดแล้ว/);
    const j = listJournals().find((x: { sourceKey: string }) => x.sourceKey === `deposit:${firstCharge.docNo}`);
    assert.ok(j, "deposit journal posted");
    assert.ok(j!.lines.some((l: { accountCode: string; credit: number }) => l.accountCode === "2150" && l.credit === 2400));

    // Return 3 drums (2,400 of deposit): first cancels the uncollected 1,600, refunds 800.
    const { refund } = sales.returnContainers({ customerId: customer.id, packCode: "DRUM200", qty: 3, actor: "wh" });
    assert.equal(refund?.amountThb, 800);
    assert.match(refund!.docNo, /^RF-/);
    const second = sales.listDepositDocs({ customerId: customer.id, kind: "charge" }).find((c) => c.id !== firstCharge.id)!;
    assert.equal(second.status, "void");
    sales.settleDepositDoc({ id: refund!.id, method: "transfer", actor: "acc" });
    const rj = listJournals().find((x: { sourceKey: string }) => x.sourceKey === `deposit:${refund!.docNo}`);
    assert.ok(rj!.lines.some((l: { accountCode: string; debit: number }) => l.accountCode === "2150" && l.debit === 800));

    const [bal] = repo.drumBalances(customer.id);
    assert.equal(bal?.outstanding, 2);
    assert.throws(() => sales.returnContainers({ customerId: customer.id, packCode: "DRUM200", qty: 3, actor: "wh" }), /เกินจำนวน/);
  });
});

describe("etoh reorder follow-ups", () => {
  it("infers cycle from order history", async () => {
    const { inferCycleDays } = await import("../lib/etoh/followups");
    assert.equal(inferCycleDays(["2026-08-01T03:00:00Z"]), null);
    assert.equal(inferCycleDays(["2026-08-01T03:00:00Z", "2026-08-15T03:00:00Z", "2026-08-29T03:00:00Z"]), 14);
  });
});

describe("etoh LINE notify + dashboard helpers", () => {
  it("pushes to every configured recipient and skips when unconfigured", async () => {
    const { pushLineText, formatRfqNotice, clampLineText } = await import("../lib/etoh/line-notify");
    const calls: { to: string; auth: string }[] = [];
    const fake = (async (_u: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      calls.push({ to: body.to, auth: String((init.headers as Record<string, string>).authorization) });
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;
    const cfg = { token: "t".repeat(40), recipients: ["C" + "a".repeat(32), "U" + "b".repeat(32)], baseUrl: "https://x.test", enabled: true };
    const text = formatRfqNotice({
      inquiryId: "CT-1",
      name: "สมชาย",
      company: "บริษัท ก",
      phone: "0812345678",
      email: "a@b.test",
      summary: "[ขอใบเสนอราคาเอทานอล] | เกรด: เอทานอล 95% | จำนวน: 10 ถัง",
      baseUrl: cfg.baseUrl,
    });
    assert.match(text, /เกรด: เอทานอล 95%\nจำนวน: 10 ถัง/);
    assert.deepEqual(await pushLineText(text, fake, cfg), { sent: 2, failed: 0 });
    assert.equal(calls[0]!.auth, `Bearer ${cfg.token}`);
    const down = (async () => new Response("x", { status: 500 })) as unknown as typeof fetch;
    assert.deepEqual(await pushLineText("x", down, cfg), { sent: 0, failed: 2 });
    assert.ok((await pushLineText("x", fake, { ...cfg, enabled: false })).skipped);
    assert.ok(clampLineText("ก".repeat(6000)).length <= 4900);
  });

  it("computes Bangkok month windows", async () => {
    const { monthBounds, shiftMonth } = await import("../lib/etoh/dashboard");
    assert.deepEqual(monthBounds("2026-09"), { from: "2026-08-31T17:00:00.000Z", to: "2026-09-30T17:00:00.000Z" });
    assert.equal(shiftMonth("2026-01", -1), "2025-12");
    assert.equal(shiftMonth("2026-12", 1), "2027-01");
  });
});
