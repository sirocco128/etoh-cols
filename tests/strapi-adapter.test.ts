import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  unwrapEntity,
  adaptProduct,
  adaptProducts,
  resolveMediaUrl,
} from "../lib/strapi-adapter";

describe("strapi-adapter (§31.4)", () => {
  const allowlistOrigins = ["https://cms.example.com"];

  it("unwraps Strapi v4 attributes shape", () => {
    const entity = unwrapEntity({
      id: 1,
      attributes: { name: "Demo", slug: "demo" },
    });
    assert.ok(entity);
    assert.equal(entity!.name, "Demo");
    assert.equal(entity!.slug, "demo");
  });

  it("adapts a flattened Strapi v5 product", () => {
    const product = adaptProduct(
      {
        id: 10,
        documentId: "abc",
        name: "เซ็ตกระบอกน้ำ",
        slug: "tumbler-notebook-pen-set",
        description: "รายละเอียดสินค้าทดสอบสำหรับองค์กร",
        material: "สแตนเลส",
        minOrder: 30,
        priceMin: 350,
        priceMax: 590,
        currency: "THB",
        images: [{ url: "/uploads/tumbler.jpg" }],
        category: { slug: "tumbler-set", name: "Tumbler" },
        seo: {
          seoTitle: "เซ็ตกระบอกน้ำสแตนเลสองค์กร",
          metaDescription:
            "รับผลิตเซ็ตกระบอกน้ำสแตนเลสพร้อมสมุดและปากกา สกรีนโลโก้สำหรับองค์กร ขั้นต่ำสามสิบชุด พร้อมบรรจุภัณฑ์และจัดส่งทั่วประเทศตามกำหนด",
          canonicalPath: "/products/tumbler-notebook-pen-set",
          noIndex: false,
        },
      },
      { strapiUrl: "https://cms.example.com", allowlistOrigins },
    );
    assert.ok(product);
    assert.equal(product!.slug, "tumbler-notebook-pen-set");
    assert.ok(product!.images.length >= 1);
    assert.match(product!.images[0]!, /^https:\/\/cms\.example\.com\//);
    assert.equal(product!.categorySlug, "tumbler-set");
  });

  it("resolves relative media URLs against STRAPI_URL", () => {
    const url = resolveMediaUrl("/uploads/file.jpg", {
      strapiUrl: "https://cms.example.com",
      allowlistOrigins,
    });
    assert.equal(url, "https://cms.example.com/uploads/file.jpg");
  });

  it("maps v4 relation and media wrappers", () => {
    const products = adaptProducts(
      {
        data: [
          {
            id: 2,
            attributes: {
              name: "Eco Set",
              slug: "eco-tote-bamboo-set",
              description: "ชุดรักษ์โลกสำหรับองค์กรทดสอบเนื้อหา",
              minOrder: 50,
              priceMin: 180,
              priceMax: 320,
              currency: "THB",
              images: {
                data: [
                  {
                    id: 9,
                    attributes: { url: "/uploads/eco.jpg" },
                  },
                ],
              },
              category: {
                data: {
                  id: 3,
                  attributes: { slug: "eco-giftset", name: "Eco" },
                },
              },
              seo: {
                seoTitle: "เซ็ตรักษ์โลกองค์กร",
                metaDescription:
                  "รับผลิตเซ็ตรักษ์โลก ถุงผ้า หลอดไม้ไผ่ และสมุดรีไซเคิล สกรีนโลโก้สำหรับองค์กร ขั้นต่ำห้าสิบชุด พร้อมตัวเลือกบรรจุภัณฑ์รักษ์โลก",
                canonicalPath: "/products/eco-tote-bamboo-set",
              },
            },
          },
        ],
      },
      { strapiUrl: "https://cms.example.com", allowlistOrigins },
    );
    assert.equal(products.length, 1);
    assert.equal(products[0]!.categorySlug, "eco-giftset");
  });

  it("rejects media origins outside the allowlist", () => {
    assert.throws(() => {
      resolveMediaUrl("https://evil.example/uploads/x.jpg", {
        strapiUrl: "https://cms.example.com",
        allowlistOrigins,
      });
    });
  });
});
