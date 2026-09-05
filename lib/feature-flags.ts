/** Client- and server-safe feature flag helpers (NEXT_PUBLIC_* only). */

export function isP2QuoteToolsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_P2_QUOTE_TOOLS === "true";
}

export function isBuyerAssistantEnabled(): boolean {
  const raw = (process.env.NEXT_PUBLIC_ENABLE_BUYER_ASSISTANT || "true")
    .trim()
    .toLowerCase();
  return raw !== "0" && raw !== "false" && raw !== "off";
}
