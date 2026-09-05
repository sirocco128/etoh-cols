import { randomBytes } from "node:crypto";
import {
  deleteJournalBySourceKey,
  getJournalBySourceKey,
  insertJournal,
} from "@/lib/ledger-repository";
import { ACCOUNT_CODES, type JournalLineInput } from "@/lib/ledger-types";
import type { FactoryPoRecord } from "@/lib/factory-po-types";
import { costFromPo } from "@/lib/po-cost";
import { bangkokDateYmd } from "@/lib/quote-service";
import { roundSatang } from "@/lib/th-billing";

function createPrefixedId(prefix: string, now = new Date()): string {
  const suffix = randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}-${bangkokDateYmd(now)}-${suffix}`;
}

function bangkokDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
  }).format(new Date(iso));
}

function assertBalanced(lines: JournalLineInput[]): void {
  const debit = roundSatang(lines.reduce((sum, line) => sum + line.debit, 0));
  const credit = roundSatang(lines.reduce((sum, line) => sum + line.credit, 0));
  if (Math.abs(debit - credit) > 0.009) {
    throw new Error("unbalanced_journal");
  }
}

function compactLines(lines: JournalLineInput[]): JournalLineInput[] {
  return lines.filter((line) => line.debit > 0.0001 || line.credit > 0.0001);
}

export function upsertJournal(params: {
  sourceKey: string;
  memo: string;
  orderId?: string | null;
  poId?: string | null;
  postedBy?: string | null;
  at?: string;
  lines: JournalLineInput[];
}): void {
  const lines = compactLines(params.lines);
  if (lines.length === 0) {
    deleteJournalBySourceKey(params.sourceKey);
    return;
  }
  assertBalanced(lines);
  const existing = getJournalBySourceKey(params.sourceKey);
  const now = params.at ?? new Date().toISOString();
  if (existing) {
    const same =
      existing.memo === params.memo &&
      existing.lines.length === lines.length &&
      existing.lines.every((line, index) => {
        const next = lines[index];
        return (
          next &&
          line.accountCode === next.accountCode &&
          Math.abs(line.debit - next.debit) < 0.001 &&
          Math.abs(line.credit - next.credit) < 0.001
        );
      });
    if (same) return;
    deleteJournalBySourceKey(params.sourceKey);
  }
  insertJournal({
    entryId: createPrefixedId("JE", new Date(now)),
    sourceKey: params.sourceKey,
    entryDate: bangkokDate(now),
    memo: params.memo,
    orderId: params.orderId,
    poId: params.poId,
    postedBy: params.postedBy,
    createdAt: now,
    lines,
  });
}

export function postCashReceived(params: {
  paymentId: string;
  orderId: string;
  amount: number;
  kind: string;
  at: string;
  actor?: string | null;
}): void {
  const amount = roundSatang(params.amount);
  if (amount <= 0) return;
  upsertJournal({
    sourceKey: `cash:${params.paymentId}`,
    memo: `รับชำระ${params.kind} ${amount.toFixed(2)} บาท · ${params.orderId}`,
    orderId: params.orderId,
    postedBy: params.actor,
    at: params.at,
    lines: [
      { accountCode: ACCOUNT_CODES.cash, debit: amount, credit: 0, memo: "พร้อมเพย์" },
      {
        accountCode: ACCOUNT_CODES.unearnedDeposit,
        debit: 0,
        credit: amount,
        memo: "เงินรับล่วงหน้า",
      },
    ],
  });
}

export function postRevenueRecognition(params: {
  orderId: string;
  subtotalExVat: number;
  vatAmount: number;
  grandTotal: number;
  at: string;
  actor?: string | null;
}): void {
  const subtotal = roundSatang(params.subtotalExVat);
  const vat = roundSatang(params.vatAmount);
  const grand = roundSatang(params.grandTotal);
  if (grand <= 0) return;
  upsertJournal({
    sourceKey: `revenue:${params.orderId}`,
    memo: `รับรู้รายได้และ VAT ขาออก · ${params.orderId}`,
    orderId: params.orderId,
    postedBy: params.actor,
    at: params.at,
    lines: [
      {
        accountCode: ACCOUNT_CODES.unearnedDeposit,
        debit: grand,
        credit: 0,
        memo: "โอนเงินมัดจำเป็นรายได้",
      },
      { accountCode: ACCOUNT_CODES.sales, debit: 0, credit: subtotal, memo: "รายได้ขาย" },
      { accountCode: ACCOUNT_CODES.outputVat, debit: 0, credit: vat, memo: "VAT 7%" },
    ],
  });
}

export function postPoLandedCost(params: {
  po: FactoryPoRecord;
  actor?: string | null;
  at?: string;
}): void {
  const po = params.po;
  const sourceKey = `cogs:${po.poId}`;
  if (po.status === "cancelled" || po.status === "draft" || po.status === "sent") {
    deleteJournalBySourceKey(sourceKey);
    return;
  }
  const cost = costFromPo(po);
  const factoryPayable = cost.productCostThb;
  const freightPayable = roundSatang(
    cost.freightThb +
      cost.importDutyThb +
      cost.customsFeeThb +
      cost.packingThb +
      cost.lastMileThb,
  );
  upsertJournal({
    sourceKey,
    memo: `ต้นทุนลงเรือ · ${po.poId} · ${po.productName}`,
    orderId: po.orderId,
    poId: po.poId,
    postedBy: params.actor,
    at: params.at ?? po.updatedAt,
    lines: [
      {
        accountCode: ACCOUNT_CODES.factoryCogs,
        debit: cost.productCostThb,
        credit: 0,
        memo: "โรงงาน + ขนส่งในจีน",
      },
      {
        accountCode: ACCOUNT_CODES.freightCogs,
        debit: cost.freightThb,
        credit: 0,
        memo: "ขนส่งจีน–ไทย",
      },
      {
        accountCode: ACCOUNT_CODES.importCogs,
        debit: roundSatang(cost.importDutyThb + cost.customsFeeThb),
        credit: 0,
        memo: "ภาษีนำเข้า / พิธีการ",
      },
      {
        accountCode: ACCOUNT_CODES.lastMileExpense,
        debit: cost.lastMileThb,
        credit: 0,
        memo: "จัดส่งถึงลูกค้า",
      },
      {
        accountCode: ACCOUNT_CODES.packingExpense,
        debit: cost.packingThb,
        credit: 0,
        memo: "แพ็กในไทย",
      },
      {
        accountCode: ACCOUNT_CODES.factoryPayable,
        debit: 0,
        credit: factoryPayable,
        memo: "เจ้าหนี้โรงงาน",
      },
      {
        accountCode: ACCOUNT_CODES.freightPayable,
        debit: 0,
        credit: freightPayable,
        memo: "เจ้าหนี้ขนส่งและนำเข้า",
      },
    ],
  });
}

export function postSupplierPayment(params: {
  payId: string;
  poId: string;
  orderId?: string | null;
  amount: number;
  at: string;
  actor?: string | null;
}): void {
  const amount = roundSatang(params.amount);
  if (amount <= 0) return;
  upsertJournal({
    sourceKey: `spay:${params.payId}`,
    memo: `จ่ายโรงงานตามของที่รับ ${amount.toFixed(2)} บาท · ${params.poId}`,
    orderId: params.orderId,
    poId: params.poId,
    postedBy: params.actor,
    at: params.at,
    lines: [
      {
        accountCode: ACCOUNT_CODES.factoryPayable,
        debit: amount,
        credit: 0,
        memo: "ลดเจ้าหนี้โรงงาน",
      },
      {
        accountCode: ACCOUNT_CODES.cash,
        debit: 0,
        credit: amount,
        memo: "จ่ายโรงงาน",
      },
    ],
  });
}

export function csvEscape(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function journalsToCsv(
  entries: Array<{
    entryDate: string;
    entryId: string;
    memo: string;
    orderId: string | null;
    poId: string | null;
    lines: Array<{
      accountCode: string;
      debit: number;
      credit: number;
      memo?: string | null;
    }>;
  }>,
  accountName: (code: string) => string,
): string {
  const header = [
    "วันที่",
    "เลขที่เอกสาร",
    "รหัสบัญชี",
    "ชื่อบัญชี",
    "เดบิต",
    "เครดิต",
    "คำอธิบาย",
    "ออเดอร์",
    "ใบสั่งโรงงาน",
  ].join(",");
  const rows = [header];
  for (const entry of entries) {
    for (const line of entry.lines) {
      rows.push(
        [
          csvEscape(entry.entryDate),
          csvEscape(entry.entryId),
          csvEscape(line.accountCode),
          csvEscape(accountName(line.accountCode)),
          csvEscape(line.debit.toFixed(2)),
          csvEscape(line.credit.toFixed(2)),
          csvEscape(line.memo || entry.memo),
          csvEscape(entry.orderId),
          csvEscape(entry.poId),
        ].join(","),
      );
    }
  }
  return `${rows.join("\n")}\n`;
}
