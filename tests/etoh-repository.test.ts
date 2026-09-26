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

describe("etoh repository (SQLite)", () => {
  let dataDir = "";

  before(async () => {
    dataDir = mkdtempSync(join(tmpdir(), "etoh-repo-"));
    const sqlitePath = join(dataDir, "leads.sqlite");
    process.env.SQLITE_PATH = sqlitePath;
    const migrate = spawnSync(process.execPath, ["scripts/migrate.mjs"], {
      cwd: ROOT,
      env: { ...process.env, SQLITE_PATH: sqlitePath },
      encoding: "utf8",
    });
    assert.equal(migrate.status, 0, migrate.stderr || migrate.stdout);
    const { closeDb } = await import("../lib/database");
    closeDb();
  });

  after(() => {
    teardownTempDir(dataDir);
  });

  it("uses the latest effective price and Ops pack / tier settings", async () => {
    const repo = await import("../lib/etoh/repository");
    repo.addPriceEntry({ gradeCode: "IND95", basePricePerLitre: 29, effectiveFrom: "2026-01-01", actor: "t" });
    repo.addPriceEntry({
      gradeCode: "IND95",
      basePricePerLitre: 31,
      landedCostPerLitre: 27.5,
      effectiveFrom: "2026-06-01",
      actor: "t",
    });
    repo.addPriceEntry({ gradeCode: "IND95", basePricePerLitre: 99, effectiveFrom: "2099-01-01", actor: "t" });
    repo.savePackSettings(
      { code: "DRUM200", containerCostThb: 0, depositThb: 900, repackCostThb: 0, smallPackMarkupPct: 0, active: true },
      "t",
    );
    repo.saveTierDiscount("volume", 3, "t");

    const book = repo.loadPriceBook("2026-09-26");
    assert.equal(book.basePricePerLitre.IND95, 31);
    assert.equal(book.landedCostPerLitre.IND95, 27.5);
    assert.equal(book.packs.DRUM200.depositThb, 900);
    assert.equal(book.tiers.volume.discountPct, 3);
    assert.equal(repo.loadPriceBook("2026-03-01").basePricePerLitre.IND95, 29);

    assert.throws(() => repo.addPriceEntry({ gradeCode: "XX", basePricePerLitre: 1, actor: "t" }), repo.EtohValidationError);
    assert.throws(() => repo.saveTierDiscount("volume", 80, "t"), repo.EtohValidationError);
  });

  it("stores customer terms with a standard default", async () => {
    const repo = await import("../lib/etoh/repository");
    assert.equal(repo.getCustomerTerms(42).priceTier, "standard");
    const saved = repo.saveCustomerTerms(
      {
        customerId: 42,
        priceTier: "contract",
        creditLimitThb: 500000,
        creditTermDays: 30,
        reorderCycleDays: 14,
        endUseSegment: "printing-coating",
      },
      "sales@etoh",
    );
    assert.equal(saved.priceTier, "contract");
    assert.equal(saved.creditTermDays, 30);
    assert.throws(
      () =>
        repo.saveCustomerTerms(
          { customerId: 42, priceTier: "contract", creditLimitThb: 0, creditTermDays: 999, reorderCycleDays: null, endUseSegment: null },
          "t",
        ),
      /เครดิตเทอม/,
    );
  });

  it("gates lot release on CoA and FDA paperwork", async () => {
    const repo = await import("../lib/etoh/repository");
    const lot = repo.createLot({
      lotNo: "l2609-food-01",
      gradeCode: "FOOD",
      containerNo: "msku1234567",
      receivedLitres: 16000,
      arrivalDate: "2026-09-20",
      actor: "wh",
    });
    assert.equal(lot.lotNo, "L2609-FOOD-01");
    assert.equal(lot.containerNo, "MSKU1234567");
    assert.equal(lot.status, "quarantine");
    assert.throws(() => repo.setLotStatus(lot.id, "released", "qa"), /CoA/);
    repo.updateLotCoa(lot.id, { coaPurityPct: 99.5 });
    assert.throws(() => repo.setLotStatus(lot.id, "released", "qa"), /อย\./);
    repo.updateLotCoa(lot.id, { fdaRef: "FDA-REF-001" });
    assert.equal(repo.setLotStatus(lot.id, "released", "qa").status, "released");
    assert.throws(
      () => repo.createLot({ lotNo: "L2609-FOOD-01", gradeCode: "FOOD", receivedLitres: 1, actor: "wh" }),
      /มีเลขล็อต/,
    );
    assert.equal(repo.listLots({ status: "released" }).length, 1);
  });

  it("tracks returnable drums and blocks over-returns", async () => {
    const repo = await import("../lib/etoh/repository");
    repo.recordDrumMovement({ customerId: 7, packCode: "DRUM200", qtyDelta: 10, depositPerUnitThb: 800, actor: "wh" });
    repo.recordDrumMovement({ customerId: 7, packCode: "DRUM200", qtyDelta: -4, depositPerUnitThb: 800, actor: "wh" });
    const [bal] = repo.drumBalances(7);
    assert.equal(bal?.outstanding, 6);
    assert.equal(bal?.depositHeldThb, 4800);
    assert.throws(
      () => repo.recordDrumMovement({ customerId: 7, packCode: "DRUM200", qtyDelta: -7, actor: "wh" }),
      /คืนถังเกิน/,
    );
    assert.throws(
      () => repo.recordDrumMovement({ customerId: 7, packCode: "GAL20", qtyDelta: 1, actor: "wh" }),
      /ถัง 200 ลิตร/,
    );
  });

  it("saves numbered quotes, enforces status flow, and fills the NEXTERP outbox", async () => {
    const repo = await import("../lib/etoh/repository");
    const { computeEtohQuote } = await import("../lib/etoh/pricing");
    const input = {
      customerTier: "standard" as const,
      lines: [{ grade: "IND95" as const, pack: "DRUM200" as const, qty: 4 }],
    };
    const result = computeEtohQuote(input, repo.loadPriceBook());
    const q1 = repo.saveQuote({ customerName: "บริษัท ทดสอบ จำกัด", input, result, actor: "sales" });
    const q2 = repo.saveQuote({ customerName: "บริษัท ทดสอบ 2 จำกัด", input, result, actor: "sales" });
    assert.match(q1.docNo, /^EQ-\d{4}-0001$/);
    assert.match(q2.docNo, /^EQ-\d{4}-0002$/);
    assert.equal(q1.status, "draft");
    assert.equal(q1.result.lines[0]!.qty, 4);

    assert.equal(repo.setQuoteStatus(q1.id, "sent", "sales").status, "sent");
    assert.equal(repo.setQuoteStatus(q1.id, "accepted", "sales").status, "accepted");
    assert.throws(() => repo.setQuoteStatus(q1.id, "draft", "sales"), repo.EtohValidationError);

    const pending = repo.listOutbox("pending");
    const events = pending.map((e) => e.event);
    assert.ok(events.includes("quote.created"));
    assert.ok(events.includes("quote.accepted"));
    assert.ok(events.includes("lot.received"));
    const priceEvent = pending.find((e) => e.event === "price.published");
    assert.ok(priceEvent);
    assert.ok(!JSON.stringify(priceEvent.payload).includes("landed"), "landed cost must not leave the app");

    const first = pending[0]!;
    repo.markOutboxFailed(first.id, "timeout");
    assert.equal(repo.listOutbox("pending").find((e) => e.id === first.id)?.attempts, 1);
    repo.markOutboxSent(first.id);
    assert.equal(repo.listOutbox("pending").some((e) => e.id === first.id), false);
  });
});

describe("etoh → NEXTERP outbox delivery", () => {
  let dataDir = "";

  before(async () => {
    dataDir = mkdtempSync(join(tmpdir(), "etoh-sync-"));
    const sqlitePath = join(dataDir, "leads.sqlite");
    process.env.SQLITE_PATH = sqlitePath;
    const migrate = spawnSync(process.execPath, ["scripts/migrate.mjs"], {
      cwd: ROOT,
      env: { ...process.env, SQLITE_PATH: sqlitePath },
      encoding: "utf8",
    });
    assert.equal(migrate.status, 0, migrate.stderr || migrate.stdout);
    const { closeDb } = await import("../lib/database");
    closeDb();
  });

  after(() => {
    teardownTempDir(dataDir);
  });

  it("signs the batch, marks accepted events sent and retries the rest", async () => {
    const repo = await import("../lib/etoh/repository");
    const { pushOutboxToNexterp, signNexterpBody } = await import("../lib/etoh/nexterp-sync");
    repo.addPriceEntry({ gradeCode: "DEN", basePricePerLitre: 28, actor: "t" });
    repo.addPriceEntry({ gradeCode: "TBA", basePricePerLitre: 29, actor: "t" });
    const [first, second] = repo.listOutbox("pending");
    assert.ok(first && second);

    const secret = "s".repeat(40);
    let seenSignature = "";
    let seenBody = "";
    const fakeFetch = (async (_url: string, init: RequestInit) => {
      seenBody = String(init.body);
      seenSignature = String((init.headers as Record<string, string>)["x-signature"]);
      return new Response(JSON.stringify({ accepted: [first.id] }), { status: 200 });
    }) as unknown as typeof fetch;

    const r = await pushOutboxToNexterp(50, fakeFetch, { url: "https://erp.example.test/ingest", secret, enabled: true });
    assert.deepEqual(r, { attempted: 2, sent: 1, failed: 1 });
    assert.equal(seenSignature, signNexterpBody(seenBody, secret));
    assert.equal(JSON.parse(seenBody).sourceApp, "etoh-cols");
    const pending = repo.listOutbox("pending");
    assert.deepEqual(pending.map((e) => e.id), [second.id]);
    assert.equal(pending[0]!.attempts, 1);

    const down = (async () => new Response("no", { status: 502 })) as unknown as typeof fetch;
    const r2 = await pushOutboxToNexterp(50, down, { url: "https://erp.example.test/ingest", secret, enabled: true });
    assert.equal(r2.failed, 1);
    assert.match(repo.listOutbox("pending")[0]!.lastError || "", /HTTP 502/);

    const skipped = await pushOutboxToNexterp(50, down, { url: "", secret: "", enabled: false });
    assert.ok(skipped.skipped);
  });
});
