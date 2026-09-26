import type { MetadataRoute } from "next";
import { etohSeoPages } from "@/lib/etoh/seo-pages";
import { getArticles } from "@/lib/strapi";
import { site } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = site.url.replace(/\/$/, "");
  const now = new Date();

  const pages: MetadataRoute.Sitemap = etohSeoPages().map((page) => ({
    url: `${base}${page.path}`,
    lastModified: now,
    changeFrequency: page.path === "/" ? "weekly" : "monthly",
    priority: page.path === "/" ? 1 : page.kind === "static" ? 0.8 : 0.7,
  }));

  const legal: MetadataRoute.Sitemap = ["/privacy", "/terms"].map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: "yearly",
    priority: 0.2,
  }));

  const articles = await getArticles();
  const posts: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${base}/blog/${article.slug}`,
    lastModified: article.updatedAt
      ? new Date(article.updatedAt)
      : article.publishedAt
        ? new Date(article.publishedAt)
        : now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...pages, ...legal, ...posts];
}
