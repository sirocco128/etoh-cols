import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isNavActive, withOptionalBasketLink } from "../lib/nav";

describe("nav helpers (UX)", () => {
  it("marks nested product paths as active for /products", () => {
    assert.equal(isNavActive("/products", "/products"), true);
    assert.equal(isNavActive("/products/eco-tote-bamboo-set", "/products"), true);
    assert.equal(isNavActive("/blog", "/products"), false);
  });

  it("only treats / as active for home", () => {
    assert.equal(isNavActive("/", "/"), true);
    assert.equal(isNavActive("/products", "/"), false);
  });

  it("includes ideas and about in the primary nav", () => {
    const links = withOptionalBasketLink(false);
    assert.equal(links.some((l) => l.href === "/about"), true);
    assert.equal(
      links.find((l) => l.href === "/about")?.label,
      "เกี่ยวกับเรา",
    );
    assert.equal(links.some((l) => l.href === "/ideas"), true);
    assert.equal(
      links.find((l) => l.href === "/ideas")?.label,
      "ไอเดียชุดของขวัญ",
    );
    assert.equal(
      links.find((l) => l.href === "/premium-giftset")?.label,
      "ชุดของขวัญองค์กร",
    );
  });

  it("appends quote basket link when P2 tools enabled", () => {
    const off = withOptionalBasketLink(false);
    const on = withOptionalBasketLink(true);
    assert.equal(off.some((l) => l.href === "/quote-basket"), false);
    assert.equal(on.some((l) => l.href === "/quote-basket"), true);
  });
});
