/** Client- and server-safe feature flag helpers (NEXT_PUBLIC_* only). */

export function isP2QuoteToolsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_P2_QUOTE_TOOLS === "true";
}
