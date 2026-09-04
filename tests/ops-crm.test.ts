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

describe("ops customers + quote workflow", () => {
  let dataDir = "";
  let sqlitePath = "";

  before(() => {
    dataDir = mkdtempSync(join(tmpdir(), "giftset-ops-"));
    sqlitePath = join(dataDir, "leads.sqlite");
    process.env.SQLITE_PATH = sqlitePath;
    process.env.LEAD_STORAGE_MODE = "sqlite";
    process.env.IP_HASH_SECRET =
      "test-ip-hash-secret-at-least-32-characters-long";
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

  it("upserts customer and lists quotes by status", async () => {
    const { closeDb } = await import("../lib/database");
    closeDb();
    const { resetQuoteRepository } = await import("../lib/quote-repository");
    resetQuoteRepository();

    const { submitQuotePayload } = await import("../lib/quote-service");
    const { listCustomers, getCustomerByEmail } = await import(
      "../lib/customer-repository"
    );
    const { listQuoteRequests, updateQuoteOps, getQuoteByRequestId } =
      await import("../lib/quote-repository");

    const headers = new Headers({ "x-forwarded-for": "203.0.113.10" });
    const result = await submitQuotePayload(
      {
        name: "Somchai Test",
        company: "Acme Co",
        email: "somchai@acme.example",
        phone: "0812345678",
        quantity: 50,
        consent: true,
        decorationMethod: "laser",
        website: "",
        startedAt: Date.now() - 5_000,
      },
      { headers },
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;

    const customer = getCustomerByEmail("somchai@acme.example");
    assert.ok(customer);
    assert.equal(customer?.company, "Acme Co");
    assert.equal(customer?.quoteCount, 1);

    const quote = getQuoteByRequestId(result.requestId);
    assert.ok(quote);
    assert.equal(quote?.customerId, customer?.id);
    assert.equal(quote?.leadStatus, "new");

    const updated = updateQuoteOps({
      requestId: result.requestId,
      leadStatus: "contacted",
      salesNotes: "โทรแล้ว นัดส่งแบบ",
    });
    assert.equal(updated?.leadStatus, "contacted");
    assert.equal(updated?.salesNotes, "โทรแล้ว นัดส่งแบบ");

    const contacted = listQuoteRequests({ leadStatus: "contacted" });
    assert.equal(contacted.length, 1);

    const customers = listCustomers({ q: "Acme" });
    assert.equal(customers.length, 1);
  });

  it("signs and verifies ops session tokens", async () => {
    process.env.ADMIN_PASSWORD = "test-admin-pass-12";
    process.env.ADMIN_SESSION_SECRET =
      "test-ops-session-secret-at-least-32-chars";
    const {
      createOpsSessionToken,
      verifyOpsSessionToken,
      verifyOpsPassword,
      isOpsAuthConfigured,
    } = await import("../lib/ops-auth");

    assert.equal(isOpsAuthConfigured(), true);
    assert.equal(verifyOpsPassword("test-admin-pass-12"), true);
    assert.equal(verifyOpsPassword("wrong"), false);

    const token = createOpsSessionToken();
    assert.equal(verifyOpsSessionToken(token), true);
    assert.equal(verifyOpsSessionToken("v1.1.bad"), false);
  });
});
