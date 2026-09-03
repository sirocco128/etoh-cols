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

  it("appends quote basket link when P2 tools enabled", () => {
    const off = withOptionalBasketLink(false);
    const on = withOptionalBasketLink(true);
    assert.equal(off.some((l) => l.href === "/quote-basket"), false);
    assert.equal(on.some((l) => l.href === "/quote-basket"), true);
  });
});
