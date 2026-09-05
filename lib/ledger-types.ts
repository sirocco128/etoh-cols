export const LEDGER_ACCOUNT_TYPES = [
  "asset",
  "liability",
  "revenue",
  "cogs",
  "expense",
] as const;

export type LedgerAccountType = (typeof LEDGER_ACCOUNT_TYPES)[number];

export type LedgerAccount = {
  code: string;
  nameTh: string;
  nameEn: string;
  type: LedgerAccountType;
  sortOrder: number;
};

export type JournalLineInput = {
  accountCode: string;
  debit: number;
  credit: number;
  memo?: string | null;
};

export type JournalLineRecord = JournalLineInput & {
  id: number;
  entryId: string;
  lineNo: number;
};

export type JournalEntryRecord = {
  id: number;
  entryId: string;
  sourceKey: string;
  entryDate: string;
  memo: string;
  orderId: string | null;
  poId: string | null;
  postedBy: string | null;
  createdAt: string;
  lines: JournalLineRecord[];
};

export const ACCOUNT_CODES = {
  cash: "1110",
  ar: "1120",
  inTransit: "1130",
  unearnedDeposit: "2110",
  outputVat: "2120",
  factoryPayable: "2130",
  freightPayable: "2140",
  sales: "4100",
  factoryCogs: "5100",
  freightCogs: "5200",
  importCogs: "5300",
  lastMileExpense: "5400",
  packingExpense: "5500",
} as const;
