/**
 * Append-only ops audit log (login, lead edits, AI calls).
 * Prompts and payloads are redacted before insert.
 */

import { getDb } from "@/lib/database";
import { redactSecrets } from "@/lib/ai-safety";
import type { OpsActor, OpsRole } from "@/lib/ops-roles";

export type OpsAuditStatus = "ok" | "denied";

export type WriteOpsAuditParams = {
  actor?: OpsActor | null;
  action: string;
  status: OpsAuditStatus;
  resourceType?: string | null;
  resourceId?: string | null;
  toolName?: string | null;
  prompt?: string | null;
  detail?: unknown;
  ipHash?: string | null;
  userAgent?: string | null;
  errorMessage?: string | null;
};

export type OpsAuditRow = {
  id: number;
  createdAt: string;
  actorEmail: string | null;
  actorName: string | null;
  role: OpsRole | null;
  action: string;
  status: OpsAuditStatus;
  resourceType: string | null;
  resourceId: string | null;
  toolName: string | null;
  prompt: string | null;
  detail: string | null;
  ipHash: string | null;
  userAgent: string | null;
  errorMessage: string | null;
};

function truncate(value: string, max = 1_000): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function isRole(value: string | null): value is OpsRole {
  return value === "admin" || value === "sales" || value === "viewer";
}

export function writeOpsAudit(params: WriteOpsAuditParams): void {
  try {
    const now = new Date().toISOString();
    const redactedDetail =
      params.detail === undefined
        ? null
        : JSON.stringify(redactSecrets(params.detail));
    const prompt =
      typeof params.prompt === "string" && params.prompt.trim()
        ? truncate(String(redactSecrets(params.prompt)))
        : null;

    getDb()
      .prepare(
        `INSERT INTO ops_audit_log (
          created_at, actor_email, actor_name, role, action, status,
          resource_type, resource_id, tool_name, prompt, detail, ip_hash,
          user_agent, error_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        now,
        params.actor?.email ?? null,
        params.actor?.name ?? null,
        params.actor?.role ?? null,
        params.action,
        params.status,
        params.resourceType ?? null,
        params.resourceId ?? null,
        params.toolName ?? null,
        prompt,
        redactedDetail,
        params.ipHash ?? null,
        params.userAgent ?? null,
        params.errorMessage ?? null,
      );
  } catch (error) {
    console.error(
      "[ops-audit] write failed",
      error instanceof Error ? error.message : error,
    );
  }
}

export function listOpsAudit(options?: {
  limit?: number;
  action?: string;
}): OpsAuditRow[] {
  try {
    const limit = Math.min(Math.max(options?.limit ?? 100, 1), 500);
    const action = options?.action?.trim();
    const rows = (
      action
        ? getDb()
            .prepare(
              `SELECT * FROM ops_audit_log WHERE action = ? ORDER BY id DESC LIMIT ?`,
            )
            .all(action, limit)
        : getDb()
            .prepare(`SELECT * FROM ops_audit_log ORDER BY id DESC LIMIT ?`)
            .all(limit)
    ) as Array<{
      id: number;
      created_at: string;
      actor_email: string | null;
      actor_name: string | null;
      role: string | null;
      action: string;
      status: string;
      resource_type: string | null;
      resource_id: string | null;
      tool_name: string | null;
      prompt: string | null;
      detail: string | null;
      ip_hash: string | null;
      user_agent: string | null;
      error_message: string | null;
    }>;

    return rows.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      actorEmail: row.actor_email,
      actorName: row.actor_name,
      role: isRole(row.role) ? row.role : null,
      action: row.action,
      status: row.status === "denied" ? "denied" : "ok",
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      toolName: row.tool_name,
      prompt: row.prompt,
      detail: row.detail,
      ipHash: row.ip_hash,
      userAgent: row.user_agent,
      errorMessage: row.error_message,
    }));
  } catch {
    return [];
  }
}
