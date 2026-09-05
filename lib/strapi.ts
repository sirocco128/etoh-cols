/**
 * CMS data access — mock mode or Strapi fetch.
 * Server-side modules only (RSC / Route Handlers). Do not import from client components.
 */

import {
  articles as mockArticles,
  categories as mockCategories,
  faqs as mockFaqs,
  portfolios as mockPortfolios,
  products as mockProducts,
  type Article,
  type Category,
  type Faq,
  type Portfolio,
  type Product,
} from "@/lib/data";
import {
  STRAPI_MAX_PAGES,
  STRAPI_PAGE_SIZE,
  adaptArticles,
  adaptCategories,
  adaptFaqs,
  adaptPortfolios,
  adaptProducts,
  type MediaResolveOptions,
} from "@/lib/strapi-adapter";
import { alibabaEstimatesEnabled, overlayOffersOnProducts } from "@/lib/alibaba/overlay";
import { loadOffersFromFile } from "@/lib/alibaba/offers";
import type { AlibabaOffer } from "@/lib/alibaba/types";
import { isNexterpMysqlEnabled } from "@/lib/nexterp-mysql";
import { getStrapiApiUrl } from "@/lib/strapi-url";
import {
  getNexterpProductBySlug,
  listNexterpCategories,
  listNexterpProducts,
} from "@/lib/nexterp-products";

type CmsMode = "mock" | "strapi" | "mysql";

const REVALIDATE = {
  categories: 3600,
  products: 300,
  articles: 3600,
  faqs: 86_400,
  portfolios: 3600,
} as const;

function getCmsMode(): CmsMode {
  const mode = (process.env.CMS_MODE || "mock").trim().toLowerCase();
  if (mode === "strapi") return "strapi";
  if (mode === "mysql" || mode === "nexterp") return "mysql";
  // Auto-use MySQL when explicitly enabled even if CMS_MODE left as mock
  if (isNexterpMysqlEnabled() && (process.env.CMS_MODE || "").trim() === "") {
    return "mysql";
  }
  return "mock";
}

function fallbackEnabled(): boolean {
  return (process.env.STRAPI_FALLBACK_TO_MOCK || "").toLowerCase() === "true";
}

function getStrapiUrl(): string {
  return getStrapiApiUrl();
}

function getTimeoutMs(): number {
  const raw = Number(process.env.STRAPI_FETCH_TIMEOUT_MS || 8000);
  return Number.isFinite(raw) && raw > 0 ? raw : 8000;
}

function mediaOptions(): MediaResolveOptions {
  return {
    strapiUrl: getStrapiUrl(),
    remoteImageUrls: process.env.NEXT_IMAGE_REMOTE_URLS ?? "",
  };
}

let cachedOffers: AlibabaOffer[] | null = null;

function offersForOverlay(): AlibabaOffer[] {
  if (!alibabaEstimatesEnabled()) return [];
  if (cachedOffers) return cachedOffers;
  try {
    cachedOffers = loadOffersFromFile();
  } catch {
    cachedOffers = [];
  }
  return cachedOffers;
}

function withAlibabaEstimates(products: Product[]): Product[] {
  return overlayOffersOnProducts(products, offersForOverlay(), {
    remoteImageUrls: process.env.NEXT_IMAGE_REMOTE_URLS ?? "",
  });
}

function authHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  const token = (process.env.STRAPI_API_TOKEN || "").trim();
  const publicRead =
    (process.env.STRAPI_PUBLIC_READ || "").toLowerCase() === "true";
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (!publicRead) {
    throw new Error("STRAPI_API_TOKEN is required unless STRAPI_PUBLIC_READ=true");
  }
  return headers;
}

async function strapiFetchJson(
  pathWithQuery: string,
  tags: string[],
  revalidate: number,
): Promise<unknown> {
  const url = `${getStrapiUrl()}${pathWithQuery.startsWith("/") ? "" : "/"}${pathWithQuery}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), getTimeoutMs());

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: authHeaders(),
      signal: controller.signal,
      next: {
        revalidate,
        tags,
      },
    });

    if (!response.ok) {
      throw new Error(`Strapi HTTP ${response.status} for ${pathWithQuery}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchAllPages(
  collectionPath: string,
  populate: string,
  tags: string[],
  revalidate: number,
): Promise<unknown[]> {
  const records: unknown[] = [];

  for (let page = 1; page <= STRAPI_MAX_PAGES; page += 1) {
    const query = new URLSearchParams({
      "pagination[page]": String(page),
      "pagination[pageSize]": String(STRAPI_PAGE_SIZE),
      publicationState: "live",
    });

    // Support both qs-style populate and simple populate=*
    if (populate.includes("=")) {
      for (const part of populate.split("&")) {
        const [key, value] = part.split("=");
        if (key && value) query.set(key, value);
      }
    } else {
      query.set("populate", populate);
    }

    const payload = await strapiFetchJson(
      `${collectionPath}?${query.toString()}`,
      tags,
      revalidate,
    );

    const pageData =
      payload &&
      typeof payload === "object" &&
      "data" in payload &&
      Array.isArray((payload as { data: unknown }).data)
        ? ((payload as { data: unknown[] }).data ?? [])
        : Array.isArray(payload)
          ? payload
          : [];

    records.push(...pageData);

    const pagination: { pageCount?: number } | undefined =
      payload &&
      typeof payload === "object" &&
      "meta" in payload
        ? (payload as { meta?: { pagination?: { pageCount?: number } } }).meta
            ?.pagination
        : undefined;

    const pageCount = pagination?.pageCount ?? 1;
    if (page >= pageCount) {
      return records;
    }
  }

  throw new Error(
    `Strapi pagination exceeded MAX_PAGES (${STRAPI_MAX_PAGES}) for ${collectionPath}`,
  );
}

async function withFallback<T>(
  label: string,
  loader: () => Promise<T>,
  mockValue: T,
): Promise<T> {
  if (getCmsMode() === "mock") {
    return mockValue;
  }

  try {
    const result = await loader();
    if (
      fallbackEnabled() &&
      Array.isArray(result) &&
      result.length === 0 &&
      Array.isArray(mockValue) &&
      mockValue.length > 0
    ) {
      console.warn(
        `[strapi] ${label} returned empty; falling back to mock (STRAPI_FALLBACK_TO_MOCK)`,
      );
      return mockValue;
    }
    return result;
  } catch (error) {
    console.error(`[strapi] ${label} failed`, error);
    if (fallbackEnabled()) {
      console.warn(`[strapi] falling back to mock for ${label}`);
      return mockValue;
    }
    throw error;
  }
}

export async function getCategories(): Promise<Category[]> {
  if (getCmsMode() === "mysql") {
    try {
      return await listNexterpCategories();
    } catch (error) {
      console.error("[nexterp] categories failed", error);
      if (fallbackEnabled()) return mockCategories;
      throw error;
    }
  }

  return withFallback(
    "categories",
    async () => {
      const records = await fetchAllPages(
        "/api/gift-set-categories",
        "*",
        ["categories"],
        REVALIDATE.categories,
      );
      return adaptCategories(records, mediaOptions());
    },
    mockCategories,
  );
}

export async function getCategoryBySlug(
  slug: string,
): Promise<Category | null> {
  const all = await getCategories();
  return all.find((item) => item.slug === slug) ?? null;
}

export async function getProducts(): Promise<Product[]> {
  if (getCmsMode() === "mysql") {
    try {
      const products = await listNexterpProducts({ limit: 240 });
      return withAlibabaEstimates(products);
    } catch (error) {
      console.error("[nexterp] products failed", error);
      if (fallbackEnabled()) return withAlibabaEstimates(mockProducts);
      throw error;
    }
  }

  const products = await withFallback(
    "products",
    async () => {
      const records = await fetchAllPages(
        "/api/products",
        "*",
        ["products"],
        REVALIDATE.products,
      );
      return adaptProducts(records, mediaOptions());
    },
    mockProducts,
  );
  return withAlibabaEstimates(products);
}

export async function getProductBySlug(
  slug: string,
): Promise<Product | null> {
  if (getCmsMode() === "mysql") {
    try {
      const product = await getNexterpProductBySlug(slug);
      if (product) return withAlibabaEstimates([product])[0] ?? null;
      // Keep demo SKUs available while browsing MySQL catalog
      const demo = mockProducts.find((item) => item.slug === slug) ?? null;
      return demo ? withAlibabaEstimates([demo])[0] ?? null : null;
    } catch (error) {
      console.error("[nexterp] product failed", error);
      if (fallbackEnabled()) {
        const demo = mockProducts.find((item) => item.slug === slug) ?? null;
        return demo ? withAlibabaEstimates([demo])[0] ?? null : null;
      }
      throw error;
    }
  }

  if (getCmsMode() === "mock") {
    const product = mockProducts.find((item) => item.slug === slug) ?? null;
    return product ? withAlibabaEstimates([product])[0] ?? null : null;
  }

  const product = await withFallback(
    `product:${slug}`,
    async () => {
      const query = new URLSearchParams({
        "filters[slug][$eq]": slug,
        "pagination[pageSize]": "1",
        populate: "*",
        publicationState: "live",
      });
      const payload = await strapiFetchJson(
        `/api/products?${query.toString()}`,
        ["products", `product:${slug}`],
        REVALIDATE.products,
      );
      const adapted = adaptProducts(payload, mediaOptions());
      return adapted[0] ?? null;
    },
    mockProducts.find((item) => item.slug === slug) ?? null,
  );
  return product ? withAlibabaEstimates([product])[0] ?? null : null;
}

export async function getArticles(): Promise<Article[]> {
  return withFallback(
    "articles",
    async () => {
      const records = await fetchAllPages(
        "/api/articles",
        "*",
        ["articles"],
        REVALIDATE.articles,
      );
      return adaptArticles(records, mediaOptions());
    },
    mockArticles,
  );
}

export async function getArticleBySlug(
  slug: string,
): Promise<Article | null> {
  if (getCmsMode() === "mock") {
    return mockArticles.find((item) => item.slug === slug) ?? null;
  }

  return withFallback(
    `article:${slug}`,
    async () => {
      const query = new URLSearchParams({
        "filters[slug][$eq]": slug,
        "pagination[pageSize]": "1",
        populate: "*",
        publicationState: "live",
      });
      const payload = await strapiFetchJson(
        `/api/articles?${query.toString()}`,
        ["articles", `article:${slug}`],
        REVALIDATE.articles,
      );
      const adapted = adaptArticles(payload, mediaOptions());
      return adapted[0] ?? null;
    },
    mockArticles.find((item) => item.slug === slug) ?? null,
  );
}

export async function getFaqs(): Promise<Faq[]> {
  return withFallback(
    "faqs",
    async () => {
      const records = await fetchAllPages(
        "/api/faqs",
        "*",
        ["faqs"],
        REVALIDATE.faqs,
      );
      return adaptFaqs(records).sort((a, b) => a.order - b.order);
    },
    [...mockFaqs].sort((a, b) => a.order - b.order),
  );
}

export async function getPortfolios(): Promise<Portfolio[]> {
  return withFallback(
    "portfolios",
    async () => {
      const records = await fetchAllPages(
        "/api/portfolios",
        "*",
        ["portfolios"],
        REVALIDATE.portfolios,
      );
      return adaptPortfolios(records, mediaOptions());
    },
    mockPortfolios,
  );
}
