/**
 * Buyer-facing FAQ assistant. Retrieval first, optional LLM polish.
 * Never invents a firm price or factory cost.
 */

import {
  detectPromptInjection,
  looksFactoryLeak,
  looksPublicScopeOverreach,
  postCheckPublicAnswer,
  sanitizeUserInstruction,
} from "@/lib/ai-safety";
import {
  knowledgeFromFaqs,
  retrieveKnowledge,
  type KnowledgeSnippet,
} from "@/lib/assistant-knowledge";
import type { Faq } from "@/lib/data";
import { completeOpenRouterChat } from "@/lib/openrouter-chat";
import {
  buyerCopy,
  buyerLanguageInstruction,
  detectReplyLang,
  snippetFallback,
} from "@/lib/reply-lang";

export type BuyerAssistantTurn = {
  role: "user" | "assistant";
  content: string;
};

export type BuyerAssistantResult = {
  reply: string;
  sources: string[];
  refused: boolean;
};

function fallbackFromSnippets(snippets: KnowledgeSnippet[], lang: ReturnType<typeof detectReplyLang>): string {
  const translated = snippets
    .map((item) => snippetFallback(item.id, lang))
    .filter((row): row is string => Boolean(row));
  if (translated.length > 0) return translated.slice(0, 2).join(" ");
  if (snippets.length === 0) return buyerCopy(lang, "empty");
  return snippets
    .slice(0, 2)
    .map((item) => item.body)
    .join(" ");
}

export async function runBuyerAssistant(input: {
  message: string;
  faqs: Faq[];
  history?: BuyerAssistantTurn[];
}): Promise<BuyerAssistantResult> {
  const lang = detectReplyLang(input.message);
  const cleaned = sanitizeUserInstruction(input.message, 500);
  if (!cleaned.ok) {
    return {
      reply: cleaned.reason === "injection" ? buyerCopy(lang, "inject") : buyerCopy(lang, "factory"),
      sources: [],
      refused: true,
    };
  }

  const message = cleaned.text;
  if (!message) {
    return {
      reply: buyerCopy(lang, "empty"),
      sources: [],
      refused: false,
    };
  }

  if (
    detectPromptInjection(message) ||
    looksFactoryLeak(message) ||
    looksPublicScopeOverreach(message)
  ) {
    return {
      reply: looksFactoryLeak(message)
        ? buyerCopy(lang, "factory")
        : looksPublicScopeOverreach(message)
          ? buyerCopy(lang, "scope")
          : buyerCopy(lang, "inject"),
      sources: [],
      refused: true,
    };
  }

  const extra = knowledgeFromFaqs(input.faqs);
  const snippets = retrieveKnowledge(message, extra, 4);
  const sources = snippets.map((item) => item.title);
  const grounded = snippets
    .map((item) => `${item.title}: ${item.body}`)
    .join("\n");

  let draft = fallbackFromSnippets(snippets, lang);
  const llm = await completeOpenRouterChat(
    [
      { role: "system", content: buyerLanguageInstruction(lang) },
      {
        role: "user",
        content: `Knowledge (canonical Thai facts; translate to the asker's language):\n${grounded || "(none)"}\n\nQuestion: ${message}`,
      },
    ],
    { maxTokens: 280, temperature: 0.15 },
  );
  if (llm) draft = llm;

  const checked = postCheckPublicAnswer(draft);
  return {
    reply: checked.text || buyerCopy(lang, "quote"),
    sources,
    refused: checked.refused,
  };
}
