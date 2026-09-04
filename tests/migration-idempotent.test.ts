import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";

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

describe("migration-idempotent (§31 required)", () => {
  it("second migrate applies 0 new files and keeps quote_requests + customers schema", () => {
    const dataDir = mkdtempSync(join(tmpdir(), "giftset-migrate-"));
    const sqlitePath = join(dataDir, "leads.sqlite");

    try {
      const first = spawnSync(process.execPath, ["scripts/migrate.mjs"], {
        cwd: ROOT,
        env: { ...process.env, SQLITE_PATH: sqlitePath },
        encoding: "utf8",
      });
      assert.equal(first.status, 0, first.stderr || first.stdout);
      assert.match(first.stdout, /Applied \d+ new file/);

      const second = spawnSync(process.execPath, ["scripts/migrate.mjs"], {
        cwd: ROOT,
        env: { ...process.env, SQLITE_PATH: sqlitePath },
        encoding: "utf8",
      });
      assert.equal(second.status, 0, second.stderr || second.stdout);
      assert.match(second.stdout, /Applied 0 new file/);
      assert.match(second.stdout, /skip\s+001_create_quote_requests\.sql/);
      assert.match(second.stdout, /skip\s+002_customers_and_lead_workflow\.sql/);

      const db = new DatabaseSync(sqlitePath);
      try {
        const columns = db
          .prepare("PRAGMA table_info(quote_requests)")
          .all() as Array<{ name: string }>;
        assert.equal(columns.length, 37);
        const names = new Set(columns.map((c) => c.name));
        assert.ok(names.has("customer_id"));
        assert.ok(names.has("sales_notes"));

        const customers = db
          .prepare("PRAGMA table_info(customers)")
          .all() as Array<{ name: string }>;
        assert.ok(customers.length >= 10);
      } finally {
        db.close();
      }
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });
});
