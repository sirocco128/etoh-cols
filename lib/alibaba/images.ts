const ALICD_HOSTS = new Set([
  "cbu01.alicdn.com",
  "cbu02.alicdn.com",
  "img.alicdn.com",
  "sc01.alicdn.com",
  "sc02.alicdn.com",
  "sc04.alicdn.com",
  "ae01.alicdn.com",
]);

const MAX_IMAGES = 8;

export function isAllowlistedAlicdnHost(hostname: string): boolean {
  return ALICD_HOSTS.has(hostname.toLowerCase());
}

export function alicdnAllowlistOrigins(): string[] {
  return [...ALICD_HOSTS].map((host) => `https://${host}`);
}

/** Extract https alicdn URLs; drop javascript/data and unknown hosts. */
export function extractOfferImages(input: unknown, cap = MAX_IMAGES): string[] {
  const found: string[] = [];
  const seen = new Set<string>();

  const visit = (value: unknown): void => {
    if (found.length >= cap) return;
    if (!value) return;
    if (typeof value === "string") {
      const url = normalizeImageUrl(value);
      if (url && !seen.has(url)) {
        seen.add(url);
        found.push(url);
      }
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (typeof value === "object") {
      const record = value as Record<string, unknown>;
      visit(record.imageUrls);
      visit(record.images);
      visit(record.image);
      visit(record.mainImage);
      visit(record.url);
      visit(record.imageUrl);
    }
  };

  visit(input);
  return found.slice(0, cap);
}

function normalizeImageUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:")) {
    return null;
  }

  let href = trimmed;
  if (href.startsWith("//")) href = `https:${href}`;
  if (href.startsWith("http://")) {
    href = `https://${href.slice("http://".length)}`;
  }

  try {
    const parsed = new URL(href);
    if (parsed.protocol !== "https:") return null;
    if (!isAllowlistedAlicdnHost(parsed.hostname)) return null;
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}
