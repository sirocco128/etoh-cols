/**
 * Buyer-facing FAQ assistant. Retrieval first, optional LLM polish.
 * Never invents a firm price or factory cost.
 */

import {
  FACTORY_LEAK_REFUSAL_TH,
  FIRM_QUOTE_REFUSAL_TH,
  INJECTION_REFUSAL_TH,
  detectPromptInjection,
  looksFactoryLeak,
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
import { HOW_IT_WORKS } from "@/lib/ux-copy";

export type BuyerAssistantTurn = {
  role: "user" | "assistant";
  content: string;
};

export type BuyerAssistantResult = {
  reply: string;
  sources: string[];
  refused: boolean;
};

const SYSTEM_SKILL = [
  "คุณเป็นผู้ช่วยร้านของขวัญองค์กรที่สั่งผลิตจากจีนและสกรีนโลโก้ได้",
  "ตอบภาษาไทย สุภาพ สั้น 2–6 ประโยค",
  "ใช้เฉพาะข้อมูลในคลังความรู้ที่ให้มา ห้ามแต่งราคา วันส่งของจริง หรือต้นทุนโรงงาน",
  "ห้ามใช้คำว่า 1688, MOQ, SKU, RFQ, P2",
  "ถ้าถามราคา: อธิบายว่าเป็นช่วงโดยประมาณ แล้วชวนกรอกแบบฟอร์มขอใบเสนอราคา",
  "ถ้าไม่รู้ ให้บอกตรง ๆ แล้วชี้ไปที่ /contact",
].join("\n");

function fallbackFromSnippets(snippets: KnowledgeSnippet[]): string {
  if (snippets.length === 0) {
    return [
      HOW_IT_WORKS[0]?.body,
      "หากต้องการตัวเลขที่ตรงงาน กรอกแบบฟอร์มขอใบเสนอราคาที่หน้าติดต่อ — ไม่มีการชำระเงินบนเว็บ",
    ]
      .filter(Boolean)
      .join(" ");
  }
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
  const cleaned = sanitizeUserInstruction(input.message, 500);
  if (!cleaned.ok) {
    return {
      reply:
        cleaned.reason === "injection"
          ? INJECTION_REFUSAL_TH
          : FACTORY_LEAK_REFUSAL_TH,
      sources: [],
      refused: true,
    };
  }

  const message = cleaned.text;
  if (!message) {
    return {
      reply: "พิมพ์คำถามสั้น ๆ ได้ เช่น จำนวนขั้นต่ำ วิธีใส่โลโก้ หรือขั้นตอนสั่งผลิต",
      sources: [],
      refused: false,
    };
  }

  if (detectPromptInjection(message) || looksFactoryLeak(message)) {
    return {
      reply: looksFactoryLeak(message)
        ? FACTORY_LEAK_REFUSAL_TH
        : INJECTION_REFUSAL_TH,
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

  let draft = fallbackFromSnippets(snippets);
  const llm = await completeOpenRouterChat(
    [
      { role: "system", content: SYSTEM_SKILL },
      {
        role: "user",
        content: `คลังความรู้:\n${grounded || "(ไม่มีรายการที่ตรง)"}\n\nคำถาม: ${message}`,
      },
    ],
    { maxTokens: 280, temperature: 0.15 },
  );
  if (llm) draft = llm;

  const checked = postCheckPublicAnswer(draft);
  return {
    reply: checked.text || FIRM_QUOTE_REFUSAL_TH,
    sources,
    refused: checked.refused,
  };
}
