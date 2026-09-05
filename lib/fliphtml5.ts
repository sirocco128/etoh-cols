/**
 * Optional FlipHTML5 embed. Their conversion API is Enterprise-only;
 * we only allow a public book URL in an iframe.
 */

const ALLOWED_HOSTS = new Set(["fliphtml5.com", "online.fliphtml5.com"]);

export function flipHtml5EmbedUrl(raw: string | null | undefined): string | null {
  const value = String(raw || "").trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (!ALLOWED_HOSTS.has(host) && !host.endsWith(".fliphtml5.com")) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}
