import { getDb } from "@/lib/database";
import type {
  JournalEntryRecord,
  JournalLineInput,
  JournalLineRecord,
  LedgerAccount,
  LedgerAccountType,
} from "@/lib/ledger-types";

type AccountRow = {
  code: string;
  name_th: string;
  name_en: string;
  type: string;
  sort_order: number;
};

type EntryRow = {
  id: number;
  entry_id: string;
  source_key: string;
  entry_date: string;
  memo: string;
  order_id: string | null;
  po_id: string | null;
  posted_by: string | null;
  created_at: string;
};

type LineRow = {
  id: number;
  entry_id: string;
  line_no: number;
  account_code: string;
  debit: number;
  credit: number;
  memo: string | null;
};

function mapAccount(row: AccountRow): LedgerAccount {
  return {
    code: row.code,
    nameTh: row.name_th,
    nameEn: row.name_en,
    type: row.type as LedgerAccountType,
    sortOrder: row.sort_order,
  };
}

function mapLine(row: LineRow): JournalLineRecord {
  return {
    id: row.id,
    entryId: row.entry_id,
    lineNo: row.line_no,
    accountCode: row.account_code,
    debit: row.debit,
    credit: row.credit,
    memo: row.memo,
  };
}

export function listLedgerAccounts(): LedgerAccount[] {
  const rows = getDb()
    .prepare(`SELECT * FROM ledger_accounts ORDER BY sort_order ASC, code ASC`)
    .all() as AccountRow[];
  return rows.map(mapAccount);
}

export function getAccount(code: string): LedgerAccount | null {
  const row = getDb()
    .prepare(`SELECT * FROM ledger_accounts WHERE code = ?`)
    .get(code) as AccountRow | undefined;
  return row ? mapAccount(row) : null;
}

export function getJournalBySourceKey(sourceKey: string): JournalEntryRecord | null {
  const row = getDb()
    .prepare(`SELECT * FROM journal_entries WHERE source_key = ?`)
    .get(sourceKey) as EntryRow | undefined;
  if (!row) return null;
  return attachLines(row);
}

export function getJournalByEntryId(entryId: string): JournalEntryRecord | null {
  const row = getDb()
    .prepare(`SELECT * FROM journal_entries WHERE entry_id = ?`)
    .get(entryId) as EntryRow | undefined;
  if (!row) return null;
  return attachLines(row);
}

function attachLines(row: EntryRow): JournalEntryRecord {
  const lines = getDb()
    .prepare(
      `SELECT * FROM journal_lines WHERE entry_id = ? ORDER BY line_no ASC, id ASC`,
    )
    .all(row.entry_id) as LineRow[];
  return {
    id: row.id,
    entryId: row.entry_id,
    sourceKey: row.source_key,
    entryDate: row.entry_date,
    memo: row.memo,
    orderId: row.order_id,
    poId: row.po_id,
    postedBy: row.posted_by,
    createdAt: row.created_at,
    lines: lines.map(mapLine),
  };
}

export function deleteJournalBySourceKey(sourceKey: string): void {
  const existing = getJournalBySourceKey(sourceKey);
  if (!existing) return;
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(`DELETE FROM journal_lines WHERE entry_id = ?`).run(existing.entryId);
    db.prepare(`DELETE FROM journal_entries WHERE entry_id = ?`).run(existing.entryId);
    db.exec("COMMIT");
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // ignore
    }
    throw error;
  }
}

export function insertJournal(params: {
  entryId: string;
  sourceKey: string;
  entryDate: string;
  memo: string;
  orderId?: string | null;
  poId?: string | null;
  postedBy?: string | null;
  createdAt: string;
  lines: JournalLineInput[];
}): JournalEntryRecord {
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(
      `INSERT INTO journal_entries (
        entry_id, source_key, entry_date, memo, order_id, po_id, posted_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      params.entryId,
      params.sourceKey,
      params.entryDate,
      params.memo,
      params.orderId ?? null,
      params.poId ?? null,
      params.postedBy ?? null,
      params.createdAt,
    );
    const insertLine = db.prepare(
      `INSERT INTO journal_lines (entry_id, line_no, account_code, debit, credit, memo)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    params.lines.forEach((line, index) => {
      insertLine.run(
        params.entryId,
        index + 1,
        line.accountCode,
        line.debit,
        line.credit,
        line.memo ?? null,
      );
    });
    db.exec("COMMIT");
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // ignore
    }
    throw error;
  }
  const row = getJournalByEntryId(params.entryId);
  if (!row) throw new Error("journal_insert_failed");
  return row;
}

export function listJournals(params?: {
  fromDate?: string;
  toDate?: string;
  orderId?: string;
  limit?: number;
}): JournalEntryRecord[] {
  const clauses: string[] = [];
  const binds: (string | number)[] = [];
  if (params?.fromDate) {
    clauses.push("entry_date >= ?");
    binds.push(params.fromDate);
  }
  if (params?.toDate) {
    clauses.push("entry_date <= ?");
    binds.push(params.toDate);
  }
  if (params?.orderId) {
    clauses.push("order_id = ?");
    binds.push(params.orderId);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = Math.min(500, Math.max(1, params?.limit ?? 200));
  const rows = getDb()
    .prepare(
      `SELECT * FROM journal_entries ${where} ORDER BY entry_date DESC, id DESC LIMIT ?`,
    )
    .all(...binds, limit) as EntryRow[];
  return rows.map(attachLines);
}

export type TrialBalanceRow = {
  accountCode: string;
  nameTh: string;
  type: LedgerAccountType;
  debit: number;
  credit: number;
};

export function trialBalance(params?: {
  fromDate?: string;
  toDate?: string;
}): TrialBalanceRow[] {
  const clauses: string[] = [];
  const binds: (string | number)[] = [];
  if (params?.fromDate) {
    clauses.push("e.entry_date >= ?");
    binds.push(params.fromDate);
  }
  if (params?.toDate) {
    clauses.push("e.entry_date <= ?");
    binds.push(params.toDate);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = getDb()
    .prepare(
      `SELECT a.code AS account_code, a.name_th AS name_th, a.type AS type,
              COALESCE(SUM(l.debit), 0) AS debit,
              COALESCE(SUM(l.credit), 0) AS credit
       FROM ledger_accounts a
       LEFT JOIN journal_lines l ON l.account_code = a.code
       LEFT JOIN journal_entries e ON e.entry_id = l.entry_id
       ${where}
       GROUP BY a.code
       ORDER BY a.sort_order ASC, a.code ASC`,
    )
    .all(...binds) as Array<{
    account_code: string;
    name_th: string;
    type: string;
    debit: number;
    credit: number;
  }>;
  return rows.map((row) => ({
    accountCode: row.account_code,
    nameTh: row.name_th,
    type: row.type as LedgerAccountType,
    debit: row.debit,
    credit: row.credit,
  }));
}
