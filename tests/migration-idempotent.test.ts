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
      assert.match(second.stdout, /skip\s+004_page_seo_overrides\.sql/);
      assert.match(second.stdout, /skip\s+003_ops_roles_and_audit\.sql/);
      assert.match(second.stdout, /skip\s+005_orders_payments_billing\.sql/);
      assert.match(second.stdout, /skip\s+006_customer_crm_depth\.sql/);
      assert.match(second.stdout, /skip\s+007_customer_contacts_merge\.sql/);
      assert.match(second.stdout, /skip\s+008_customer_line_oa\.sql/);
      assert.match(second.stdout, /skip\s+009_factory_po_and_ledger\.sql/);
      assert.match(second.stdout, /skip\s+010_goods_receipts_claims_assets\.sql/);
      assert.match(second.stdout, /skip\s+011_catalog_source_images\.sql/);
      assert.match(second.stdout, /skip\s+012_payment_slips\.sql/);
      assert.match(second.stdout, /skip\s+013_payment_reject_reason\.sql/);
      assert.match(second.stdout, /skip\s+014_ops_entity_tags\.sql/);
      assert.match(second.stdout, /skip\s+015_ops_staff\.sql/);

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

        const seoCols = db
          .prepare("PRAGMA table_info(page_seo_overrides)")
          .all() as Array<{ name: string }>;
        const seoNames = new Set(seoCols.map((c) => c.name));
        assert.ok(seoNames.has("path"));
        assert.ok(seoNames.has("seo_title"));
        assert.ok(seoNames.has("meta_description"));

        const audit = db
          .prepare("PRAGMA table_info(ops_audit_log)")
          .all() as Array<{ name: string }>;
        assert.ok(audit.length >= 10);

        const orders = db
          .prepare("PRAGMA table_info(orders)")
          .all() as Array<{ name: string }>;
        assert.ok(orders.length >= 20);
        const orderNames = new Set(orders.map((c) => c.name));
        assert.ok(orderNames.has("vat_amount"));
        assert.ok(orderNames.has("deposit_amount"));
        assert.ok(orderNames.has("ship_to_province"));
        assert.ok(orderNames.has("tags"));

        const customerNames = new Set(
          customers.map((c: { name: string }) => c.name),
        );
        assert.ok(customerNames.has("tax_id"));
        assert.ok(customerNames.has("line_id"));
        assert.ok(customerNames.has("merged_into_id"));

        const contacts = db
          .prepare("PRAGMA table_info(customer_contacts)")
          .all() as Array<{ name: string }>;
        const contactNames = new Set(contacts.map((c) => c.name));
        assert.ok(contactNames.has("email"));
        assert.ok(contactNames.has("line_user_id"));

        const payments = db
          .prepare("PRAGMA table_info(payments)")
          .all() as Array<{ name: string }>;
        assert.ok(payments.length >= 10);

        const factoryPos = db
          .prepare("PRAGMA table_info(factory_pos)")
          .all() as Array<{ name: string }>;
        const poNames = new Set(factoryPos.map((c) => c.name));
        assert.ok(poNames.has("landed_total_thb"));
        assert.ok(poNames.has("last_mile_thb"));
        assert.ok(poNames.has("destination_mode"));
        assert.ok(poNames.has("received_qty"));

        const goodsReceipts = db
          .prepare("PRAGMA table_info(goods_receipts)")
          .all() as Array<{ name: string }>;
        const grNames = new Set(goodsReceipts.map((c) => c.name));
        assert.ok(grNames.has("destination"));
        assert.ok(grNames.has("amount_thb"));

        const journals = db
          .prepare("PRAGMA table_info(journal_entries)")
          .all() as Array<{ name: string }>;
        const jeNames = new Set(journals.map((c) => c.name));
        assert.ok(jeNames.has("source_key"));

        const catalogImages = db
          .prepare("PRAGMA table_info(catalog_source_images)")
          .all() as Array<{ name: string }>;
        const catalogNames = new Set(catalogImages.map((c) => c.name));
        assert.ok(catalogNames.has("image_id"));
        assert.ok(catalogNames.has("source_page_url"));
        assert.ok(catalogNames.has("source_image_url"));
        assert.ok(catalogNames.has("local_path"));

        const slips = db
          .prepare("PRAGMA table_info(payment_slips)")
          .all() as Array<{ name: string }>;
        const slipNames = new Set(slips.map((c) => c.name));
        assert.ok(slipNames.has("slip_id"));
        assert.ok(slipNames.has("check_status"));
        const cashCols = db
          .prepare("PRAGMA table_info(cash_receipts)")
          .all() as Array<{ name: string }>;
        assert.ok(cashCols.some((c) => c.name === "access_token"));
        assert.ok(cashCols.some((c) => c.name === "tags"));
        const tagLinks = db
          .prepare("PRAGMA table_info(ops_tag_links)")
          .all() as Array<{ name: string }>;
        const tagLinkNames = new Set(tagLinks.map((c) => c.name));
        assert.ok(tagLinkNames.has("tag"));
        assert.ok(tagLinkNames.has("entity_type"));
        assert.ok(tagLinkNames.has("entity_id"));

        const staff = db
          .prepare("PRAGMA table_info(ops_staff)")
          .all() as Array<{ name: string }>;
        const staffNames = new Set(staff.map((c) => c.name));
        assert.ok(staffNames.has("email"));
        assert.ok(staffNames.has("password_hash"));
        assert.ok(staffNames.has("extra_grants"));
        assert.ok(staffNames.has("extra_denies"));
      } finally {
        db.close();
      }
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });
});
