import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildOpsNavLinks, isOpsNavActive } from "../lib/ops-nav";
import { OPS_PERMISSIONS, PERMISSION_GROUPS } from "../lib/ops-roles";

describe("ops nav", () => {
  it("keeps overview exact so nested ops pages are not all marked active", () => {
    assert.equal(isOpsNavActive("/ops", "/ops"), true);
    assert.equal(isOpsNavActive("/ops/quotes", "/ops"), false);
    assert.equal(isOpsNavActive("/ops/quotes/RFQ-1", "/ops/quotes"), true);
  });

  it("puts core work in primary and staff tools in more", () => {
    const admin = buildOpsNavLinks({
      email: "admin",
      name: "ผู้ดูแล",
      role: "admin",
    });
    assert.equal(admin.some((link) => link.href === "/ops" && link.group === "primary"), true);
    assert.equal(admin.some((link) => link.href === "/ops/users" && link.group === "more"), true);
    const strapi = admin.find((link) => link.label === "เข้า Strapi");
    assert.equal(strapi?.external, true);
    assert.equal(strapi?.group, "more");
    assert.match(strapi?.href ?? "", /\/admin$/);
    assert.equal(admin.find((link) => link.href === "/ops/orders")?.label, "ออเดอร์");
    assert.equal(admin.find((link) => link.href === "/ops/approvals")?.group, "more");
    assert.equal(admin.find((link) => link.href === "/ops/cycle")?.group, "more");
    const viewer = buildOpsNavLinks({
      email: "view@local",
      name: "ดู",
      role: "viewer",
    });
    assert.equal(viewer.some((link) => link.href === "/ops/users"), false);
    assert.equal(viewer.some((link) => link.label === "เข้า Strapi"), false);
    const sales = buildOpsNavLinks({
      email: "sales@local",
      name: "เซลล์",
      role: "sales",
    });
    assert.equal(sales.some((link) => link.label === "เข้า Strapi" && link.external), true);
    assert.equal(isOpsNavActive("/ops", "http://localhost:1337/admin"), false);
  });
});

describe("permission groups", () => {
  it("covers every ops permission exactly once", () => {
    const grouped = PERMISSION_GROUPS.flatMap((group) => group.items);
    assert.deepEqual([...grouped].sort(), [...OPS_PERMISSIONS].sort());
  });
});
