import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapRevalidateTargets } from "../lib/revalidate-targets";

describe("revalidate-targets (§31 required)", () => {
  it("maps product model + slug/category to paths and tags", () => {
    const targets = mapRevalidateTargets("product", {
      slug: "tumbler-set",
      category: "eco-giftset",
    });
    assert.deepEqual(targets.paths, [
      "/",
      "/products",
      "/sitemap.xml",
      "/products/tumbler-set",
      "/giftset/eco-giftset",
    ]);
    assert.deepEqual(targets.tags, [
      "products",
      "product:tumbler-set",
      "category:eco-giftset",
    ]);
  });

  it("uses entry.slug as category fallback for product", () => {
    const targets = mapRevalidateTargets("product", { slug: "eco-giftset" });
    assert.ok(targets.paths.includes("/giftset/eco-giftset"));
    assert.ok(targets.tags.includes("category:eco-giftset"));
  });

  it("maps gift-set-category, article, faq, and portfolio", () => {
    assert.deepEqual(
      mapRevalidateTargets("gift-set-category", { slug: "eco-giftset" }),
      {
        paths: ["/", "/premium-giftset", "/sitemap.xml", "/giftset/eco-giftset"],
        tags: ["categories", "category:eco-giftset"],
      },
    );

    assert.deepEqual(mapRevalidateTargets("article", { slug: "moq-guide" }), {
      paths: ["/blog", "/sitemap.xml", "/blog/moq-guide"],
      tags: ["articles", "article:moq-guide"],
    });

    assert.deepEqual(mapRevalidateTargets("faq"), {
      paths: ["/premium-giftset"],
      tags: ["faqs"],
    });

    assert.deepEqual(mapRevalidateTargets("portfolio"), {
      paths: ["/portfolio"],
      tags: ["portfolios"],
    });
  });
});
