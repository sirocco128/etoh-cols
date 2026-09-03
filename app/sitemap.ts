import type { MetadataRoute } from "next";
import {
  getArticles,
  getCategories,
  getProducts,
} from "@/lib/strapi";
import { site } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = site.url.replace(/\/$/, "");
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    "/",
    "/premium-giftset",
    "/products",
    "/customize-gift-set",
    "/portfolio",
    "/blog",
    "/contact",
    "/privacy",
    "/terms",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency:
      path === "/" || path === "/premium-giftset" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path === "/premium-giftset" ? 0.9 : 0.7,
  }));

  const [categories, products, articles] = await Promise.all([
    getCategories(),
    getProducts(),
    getArticles(),
  ]);

  const dynamicEntries: MetadataRoute.Sitemap = [
    ...categories.map((category) => ({
      url: `${base}/giftset/${category.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...products.map((product) => ({
      url: `${base}/products/${product.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...articles.map((article) => ({
      url: `${base}/blog/${article.slug}`,
      lastModified: article.updatedAt
        ? new Date(article.updatedAt)
        : article.publishedAt
          ? new Date(article.publishedAt)
          : now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];

  return [...staticEntries, ...dynamicEntries];
}
