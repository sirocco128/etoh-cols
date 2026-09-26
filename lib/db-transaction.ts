/**
 * Nest-safe SQLite transactions for node:sqlite.
 * Outermost call opens BEGIN IMMEDIATE; inner calls use SAVEPOINTs, so
 * composed services (e.g. ship order → issue document → post journal) commit
 * or roll back as one unit instead of failing with "cannot start a
 * transaction within a transaction".
 */

import type { DatabaseSync } from "node:sqlite";
import { getDb } from "@/lib/database";

const depth = new WeakMap<DatabaseSync, number>();

function inTransaction(db: DatabaseSync): boolean {
  const flag = (db as unknown as { isTransaction?: boolean }).isTransaction;
  return typeof flag === "boolean" ? flag : (depth.get(db) ?? 0) > 0;
}

export function withTransaction<T>(fn: () => T, db: DatabaseSync = getDb()): T {
  const level = depth.get(db) ?? 0;
  const nested = inTransaction(db);
  const savepoint = `sp_${level + 1}`;
  db.exec(nested ? `SAVEPOINT ${savepoint}` : "BEGIN IMMEDIATE");
  depth.set(db, level + 1);
  try {
    const out = fn();
    db.exec(nested ? `RELEASE ${savepoint}` : "COMMIT");
    return out;
  } catch (error) {
    try {
      if (nested) {
        db.exec(`ROLLBACK TO ${savepoint}`);
        db.exec(`RELEASE ${savepoint}`);
      } else {
        db.exec("ROLLBACK");
      }
    } catch {
      // keep the original error
    }
    throw error;
  } finally {
    depth.set(db, level);
  }
}
