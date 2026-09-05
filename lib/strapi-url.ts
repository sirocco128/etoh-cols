/**
 * Browser-facing Strapi admin URL (ops console link).
 * STRAPI_URL is often Docker-internal (host.docker.internal) — not clickable in a browser.
 */

function withAdminPath(value: string): string {
  const trimmed = value.replace(/\/+$/, "");
  if (/\/admin$/i.test(trimmed)) return trimmed;
  return `${trimmed}/admin`;
}

function browserOrigin(raw: string): string {
  const base = raw.trim().replace(/\/+$/, "");
  try {
    const url = new URL(base);
    if (
      url.hostname === "host.docker.internal" ||
      url.hostname === "0.0.0.0" ||
      url.hostname === "::"
    ) {
      url.hostname = "localhost";
    }
    return url.origin;
  } catch {
    return base.replace(/\/admin$/i, "");
  }
}

/** Strapi admin login, for a new tab from /ops. */
export function getStrapiAdminUrl(): string {
  const explicit = (process.env.STRAPI_ADMIN_URL || "").trim();
  if (explicit) return withAdminPath(explicit);

  const api = (process.env.STRAPI_URL || "http://localhost:1337").trim();
  return withAdminPath(browserOrigin(api));
}
