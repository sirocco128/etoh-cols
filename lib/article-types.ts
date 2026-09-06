export const ARTICLE_STATUSES = ["draft", "review", "live", "archived"] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export const ARTICLE_SOURCES = ["human", "ai"] as const;
export type ArticleSource = (typeof ARTICLE_SOURCES)[number];

export const ARTICLE_STATUS_LABELS: Record<ArticleStatus, string> = {
  draft: "ร่าง",
  review: "รอตรวจ",
  live: "เผยแพร่แล้ว",
  archived: "เก็บแล้ว",
};

export type ArticleRow = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  coverUrl: string;
  author: string;
  status: ArticleStatus;
  source: ArticleSource;
  brief: string;
  seoTitle: string;
  metaDescription: string;
  keywords: string;
  submittedBy: string;
  reviewedBy: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function isArticleStatus(value: string | null | undefined): value is ArticleStatus {
  return (ARTICLE_STATUSES as readonly string[]).includes(String(value || ""));
}

export function isArticleSource(value: string | null | undefined): value is ArticleSource {
  return (ARTICLE_SOURCES as readonly string[]).includes(String(value || ""));
}

export const ARTICLE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugifyArticle(input: string, fallback = "bai-khwam"): string {
  const ascii = String(input || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  if (ARTICLE_SLUG_PATTERN.test(ascii)) return ascii;
  const seed = fallback
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return ARTICLE_SLUG_PATTERN.test(seed) ? seed : "bai-khwam";
}

export function nextUniqueSlug(base: string, taken: Set<string>): string {
  const root = slugifyArticle(base);
  if (!taken.has(root)) return root;
  for (let i = 2; i < 80; i += 1) {
    const candidate = `${root}-${i}`.slice(0, 160);
    if (ARTICLE_SLUG_PATTERN.test(candidate) && !taken.has(candidate)) {
      return candidate;
    }
  }
  return `${root}-${Date.now().toString(36)}`.slice(0, 160);
}

/** Convert markdown-ish AI output (or existing HTML) into the storefront subset. */
export function toArticleHtml(input: string): string {
  const raw = String(input || "").replace(/\r\n/g, "\n").trim();
  if (!raw) return "";
  if (/<(h2|h3|p|blockquote|li)\b/i.test(raw)) {
    return raw;
  }

  const chunks: string[] = [];
  const lines = raw.split("\n");
  let paragraph: string[] = [];
  const flushParagraph = () => {
    const text = paragraph.join(" ").replace(/\s+/g, " ").trim();
    paragraph = [];
    if (text) chunks.push(`<p>${escapeHtml(text)}</p>`);
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      continue;
    }
    const h2 = trimmed.match(/^##\s+(.+)$/);
    if (h2) {
      flushParagraph();
      chunks.push(`<h2>${escapeHtml(h2[1] || "")}</h2>`);
      continue;
    }
    const h3 = trimmed.match(/^###\s+(.+)$/);
    if (h3) {
      flushParagraph();
      chunks.push(`<h3>${escapeHtml(h3[1] || "")}</h3>`);
      continue;
    }
    const quote = trimmed.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      chunks.push(`<blockquote>${escapeHtml(quote[1] || "")}</blockquote>`);
      continue;
    }
    const li = trimmed.match(/^[-*]\s+(.+)$/);
    if (li) {
      flushParagraph();
      chunks.push(`<li>${escapeHtml(li[1] || "")}</li>`);
      continue;
    }
    paragraph.push(trimmed);
  }
  flushParagraph();
  return chunks.join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type ArticleTransition = {
  from: ArticleStatus;
  to: ArticleStatus;
  isAdmin: boolean;
};

export function articleTransitionError(input: ArticleTransition): string | null {
  const { from, to, isAdmin } = input;
  if (from === to) return null;
  if (from === "draft" && to === "review") return null;
  if (from === "review" && to === "draft") return null;
  if (from === "review" && to === "live") {
    return isAdmin ? null : "เฉพาะผู้ดูแลจึงจะเผยแพร่ได้";
  }
  if (from === "live" && to === "archived") return null;
  if (from === "archived" && to === "draft") return null;
  return "เปลี่ยนสถานะนี้ไม่ได้";
}
