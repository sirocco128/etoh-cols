import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const sitemap = `${site.url.replace(/\/$/, "")}/sitemap.xml`;

  if (!site.allowIndexing) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
      sitemap,
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/ops/"],
    },
    sitemap,
    host: site.url.replace(/\/$/, ""),
  };
}
