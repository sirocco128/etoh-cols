/**
 * SQLite customer repository for local CRM / ops console.
 * When NEXTERP_MYSQL_ENABLED=true, also mirrors customers into MySQL staging.
 */

import { getDb } from "@/lib/database";
import type {
  CustomerRecord,
  CustomerStatus,
  ListCustomersOptions,
  UpdateCustomerParams,
  UpsertCustomerFromQuoteParams,
} from "@/lib/customer-types";
import { isNexterpMysqlEnabled } from "@/lib/nexterp-mysql";
import {
  getMysqlCustomerByEmail,
  getMysqlCustomerById,
  listMysqlCustomers,
  updateMysqlCustomer,
  upsertMysqlCustomerFromQuote,
} from "@/lib/nexterp-customers";

type CustomerRow = {
  id: number;
  company: string;
  email: string;
  phone: string | null;
  contact_name: string | null;
  notes: string | null;
  status: string;
  quote_count: number;
  last_quote_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: CustomerRow): CustomerRecord {
  return {
    id: row.id,
    company: row.company,
    email: row.email,
    phone: row.phone,
    contactName: row.contact_name,
    notes: row.notes,
    status: row.status as CustomerStatus,
    quoteCount: row.quote_count,
    lastQuoteAt: row.last_quote_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mirrorMysqlUpsert(params: UpsertCustomerFromQuoteParams): void {
  if (!isNexterpMysqlEnabled()) return;
  void upsertMysqlCustomerFromQuote(params).catch((error) => {
    console.error("[nexterp] customer mirror failed", error);
  });
}

export function upsertCustomerFromQuote(
  params: UpsertCustomerFromQuoteParams,
): CustomerRecord {
  const db = getDb();
  const email = params.email.trim().toLowerCase();
  const now = params.quoteSubmittedAt;
  const existing = db
    .prepare(`SELECT * FROM customers WHERE email = ? COLLATE NOCASE`)
    .get(email) as CustomerRow | undefined;

  if (!existing) {
    const result = db
      .prepare(
        `INSERT INTO customers (
          company, email, phone, contact_name, notes, status,
          quote_count, last_quote_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, NULL, 'active', 1, ?, ?, ?)`,
      )
      .run(
        params.company.trim(),
        email,
        params.phone.trim(),
        params.contactName.trim(),
        now,
        now,
        now,
      ) as { lastInsertRowid: number | bigint };

    const row = db
      .prepare(`SELECT * FROM customers WHERE id = ?`)
      .get(Number(result.lastInsertRowid)) as CustomerRow;
    mirrorMysqlUpsert(params);
    return mapRow(row);
  }

  db.prepare(
    `UPDATE customers SET
      company = ?,
      phone = COALESCE(?, phone),
      contact_name = COALESCE(?, contact_name),
      quote_count = quote_count + 1,
      last_quote_at = ?,
      updated_at = ?
     WHERE id = ?`,
  ).run(
    params.company.trim() || existing.company,
    params.phone.trim() || null,
    params.contactName.trim() || null,
    now,
    now,
    existing.id,
  );

  const row = db
    .prepare(`SELECT * FROM customers WHERE id = ?`)
    .get(existing.id) as CustomerRow;
  mirrorMysqlUpsert(params);
  return mapRow(row);
}

export function getCustomerById(id: number): CustomerRecord | null {
  const row = getDb()
    .prepare(`SELECT * FROM customers WHERE id = ?`)
    .get(id) as CustomerRow | undefined;
  return row ? mapRow(row) : null;
}

export function getCustomerByEmail(email: string): CustomerRecord | null {
  const row = getDb()
    .prepare(`SELECT * FROM customers WHERE email = ? COLLATE NOCASE`)
    .get(email.trim()) as CustomerRow | undefined;
  return row ? mapRow(row) : null;
}

export function listCustomers(
  options: ListCustomersOptions = {},
): CustomerRecord[] {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);
  const status = options.status ?? "all";
  const q = (options.q || "").trim();

  const where: string[] = [];
  const params: (string | number)[] = [];

  if (status !== "all") {
    where.push("status = ?");
    params.push(status);
  }
  if (q) {
    where.push(
      `(company LIKE ? OR email LIKE ? OR contact_name LIKE ? OR phone LIKE ?)`,
    );
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }

  const sql = `SELECT * FROM customers
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY updated_at DESC, id DESC
    LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const rows = getDb().prepare(sql).all(...params) as CustomerRow[];
  return rows.map(mapRow);
}

export function updateCustomer(
  params: UpdateCustomerParams,
): CustomerRecord | null {
  const existing = getCustomerById(params.id);
  if (!existing) return null;

  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE customers SET
        company = ?,
        phone = ?,
        contact_name = ?,
        notes = ?,
        status = ?,
        updated_at = ?
       WHERE id = ?`,
    )
    .run(
      params.company?.trim() || existing.company,
      params.phone !== undefined ? params.phone : existing.phone,
      params.contactName !== undefined
        ? params.contactName
        : existing.contactName,
      params.notes !== undefined ? params.notes : existing.notes,
      params.status || existing.status,
      now,
      params.id,
    );

  return getCustomerById(params.id);
}

export function countCustomers(
  options: Pick<ListCustomersOptions, "q" | "status"> = {},
): number {
  const status = options.status ?? "all";
  const q = (options.q || "").trim();
  const where: string[] = [];
  const params: string[] = [];

  if (status !== "all") {
    where.push("status = ?");
    params.push(status);
  }
  if (q) {
    where.push(
      `(company LIKE ? OR email LIKE ? OR contact_name LIKE ? OR phone LIKE ?)`,
    );
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }

  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS c FROM customers
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}`,
    )
    .get(...params) as { c: number };
  return row.c;
}
