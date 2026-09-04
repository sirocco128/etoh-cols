import type { Metadata } from "next";
import type { Article, Faq, Product, SeoFields } from "@/lib/data";
import { getSiteConfig, type SiteConfig } from "@/lib/site";

export type BreadcrumbItem = {
  name: string;
  path: string;
};

const DEFAULT_OG = "/images/og-default.jpg";

/**
 * Serialize JSON-LD safely for embedding in <script type="application/ld+json">.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function absoluteUrl(site: SiteConfig, pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${site.url}${path}`;
}

function absoluteAsset(pathOrUrl: string, baseUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${baseUrl}${path}`;
}

export function buildOrganizationJsonLd(site: SiteConfig = getSiteConfig()) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    ...(site.legalName ? { legalName: site.legalName } : {}),
    url: site.url,
    logo: absoluteUrl(site, "/images/logo.svg"),
    image: absoluteUrl(site, DEFAULT_OG),
    description: site.description,
    ...(site.taxId ? { taxID: site.taxId } : {}),
    sameAs: [site.lineUrl],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: site.phoneHref.replace(/^tel:/i, ""),
      email: site.email,
      contactType: "sales",
      availableLanguage: ["Thai", "English"],
    },
  };
}

export function buildLocalBusinessJsonLd(
  site: SiteConfig = getSiteConfig(),
): Record<string, unknown> | null {
  const lb = site.localBusiness;
  if (
    !lb.enabled ||
    !lb.streetAddress ||
    !lb.locality ||
    !lb.postalCode
  ) {
    return null;
  }

  const payload: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": lb.type,
    "@id": `${site.url}/#localbusiness`,
    name: site.name,
    ...(site.legalName ? { legalName: site.legalName } : {}),
    url: site.url,
    telephone: site.phoneHref.replace(/^tel:/i, ""),
    email: site.email,
    priceRange: "$$",
    openingHours: lb.openingHours,
    address: {
      "@type": "PostalAddress",
      streetAddress: lb.streetAddress,
      addressLocality: lb.locality,
      ...(lb.region ? { addressRegion: lb.region } : {}),
      postalCode: lb.postalCode,
      addressCountry: lb.countryCode || "TH",
    },
  };

  if (lb.latitude !== null && lb.longitude !== null) {
    payload.geo = {
      "@type": "GeoCoordinates",
      latitude: lb.latitude,
      longitude: lb.longitude,
    };
  }

  return payload;
}

export function buildProductJsonLd(
  product: Product,
  site: SiteConfig = getSiteConfig(),
) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.map((src) => absoluteUrl(site, src)),
    sku: product.slug,
    brand: {
      "@type": "Brand",
      name: site.name,
    },
    offers: {
      "@type": "AggregateOffer",
      lowPrice: String(product.priceMin),
      highPrice: String(product.priceMax),
      priceCurrency: product.currency,
      availability: "https://schema.org/InStock",
      url: absoluteUrl(site, `/products/${product.slug}`),
    },
  };
}

export function buildFaqPageJsonLd(faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function buildBreadcrumbJsonLd(
  items: BreadcrumbItem[],
  site: SiteConfig = getSiteConfig(),
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(site, item.path),
    })),
  };
}

export function buildBlogPostingJsonLd(
  article: Article,
  site: SiteConfig = getSiteConfig(),
) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.excerpt,
    image: absoluteUrl(site, article.cover),
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    author: {
      "@type": "Person",
      name: article.author,
    },
    publisher: {
      "@type": "Organization",
      name: site.name,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl(site, "/images/logo.svg"),
      },
    },
    mainEntityOfPage: absoluteUrl(
      site,
      article.seo.canonicalPath || `/blog/${article.slug}`,
    ),
  };
}

export type MetadataFromSeoOptions = {
  openGraphType?: "website" | "article";
  ogType?: "website" | "article";
  fallbackImage?: string;
  fallbackTitle?: string;
  fallbackDescription?: string;
};

/**
 * Build Next.js Metadata from CMS/demo SEO fields.
 * Global allowIndexing=false forces noindex on every page.
 */
export function metadataFromSeo(
  seo: SeoFields,
  options?: MetadataFromSeoOptions,
): Metadata {
  const site = getSiteConfig();
  const noIndex = !site.allowIndexing || Boolean(seo.noIndex);
  const title = seo.seoTitle || options?.fallbackTitle || site.name;
  const description =
    seo.metaDescription || options?.fallbackDescription || site.description;
  const image = absoluteAsset(
    seo.ogImage || options?.fallbackImage || DEFAULT_OG,
    site.url,
  );
  const canonical = (seo.canonicalPath || "/").startsWith("/")
    ? seo.canonicalPath || "/"
    : `/${seo.canonicalPath}`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      type: options?.ogType ?? options?.openGraphType ?? "website",
      locale: "th_TH",
      url: `${site.url}${canonical}`,
      siteName: site.name,
      title,
      description,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

/**
 * Root layout metadata builder.
 */
export function buildRootMetadata(): Metadata {
  const site = getSiteConfig();
  const ogImage = absoluteAsset(DEFAULT_OG, site.url);

  return {
    metadataBase: new URL(site.url),
    title: {
      default: site.name,
      template: `%s | ${site.name}`,
    },
    description: site.description,
    robots: site.allowIndexing
      ? { index: true, follow: true }
      : { index: false, follow: false },
    openGraph: {
      type: "website",
      locale: "th_TH",
      url: site.url,
      siteName: site.name,
      title: site.name,
      description: site.description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: site.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: site.name,
      description: site.description,
      images: [ogImage],
    },
  };
}

/** @deprecated Prefer buildRootMetadata */
export const buildMetadata = buildRootMetadata;
