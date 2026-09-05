/**
 * Ops console session auth (cookie HMAC).
 * Local staff UI only — not SSO.
 * Requires ADMIN_SESSION_SECRET plus ADMIN_PASSWORD and/or OPS_USERS.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  actorMay,
  findOpsUserByEmail,
  isOpsRole,
  listOpsUserSeeds,
  type OpsActor,
  type OpsPermission,
} from "@/lib/ops-roles";
import {
  authenticateOpsStaff,
  countActiveOpsStaff,
  getOpsStaffByEmail,
  hydrateOpsActor,
} from "@/lib/ops-staff";
import {
  isSecretConfigured,
  timingSafeEqualString,
} from "@/lib/security";

export const OPS_COOKIE = "ops_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export type { OpsActor, OpsPermission };
export { actorMay };

export function isOpsAuthConfigured(): boolean {
  const secret = (process.env.ADMIN_SESSION_SECRET || "").trim();
  if (!isSecretConfigured(secret, 32)) return false;
  if (listOpsUserSeeds().length > 0) return true;
  return countActiveOpsStaff() > 0;
}

function sessionSecret(): string {
  return (process.env.ADMIN_SESSION_SECRET || "").trim();
}

function sign(payload: string): string {
  return createHmac("sha256", sessionSecret())
    .update(payload)
    .digest("base64url");
}

function signaturesMatch(sig: string, expected: string): boolean {
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function defaultAdminActor(): OpsActor {
  return {
    email: (process.env.ADMIN_EMAIL || "admin").trim().toLowerCase(),
    name: (process.env.ADMIN_NAME || "").trim() || "ผู้ดูแล",
    role: "admin",
  };
}

type SessionPayloadV2 = {
  v: 2;
  email: string;
  name: string;
  role: string;
  exp: number;
};

export function createOpsSessionToken(
  now = Date.now(),
  actor: OpsActor = defaultAdminActor(),
): string {
  const exp = now + SESSION_TTL_MS;
  const body: SessionPayloadV2 = {
    v: 2,
    email: actor.email,
    name: actor.name,
    role: actor.role,
    exp,
  };
  const encoded = Buffer.from(JSON.stringify(body), "utf8").toString(
    "base64url",
  );
  const payload = `v2.${encoded}`;
  return `${payload}.${sign(payload)}`;
}

export function parseOpsSessionToken(
  token: string | undefined | null,
  now = Date.now(),
): OpsActor | null {
  if (!token || !isOpsAuthConfigured()) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [version, body, sig] = parts;
  if (!version || !body || !sig) return null;

  if (version === "v1") {
    const exp = Number(body);
    if (!Number.isFinite(exp) || exp < now) return null;
    const payload = `${version}.${body}`;
    if (!signaturesMatch(sig, sign(payload))) return null;
    return defaultAdminActor();
  }

  if (version !== "v2") return null;
  const payload = `${version}.${body}`;
  if (!signaturesMatch(sig, sign(payload))) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as SessionPayloadV2;
    if (parsed.v !== 2 || !Number.isFinite(parsed.exp) || parsed.exp < now) {
      return null;
    }
    if (!isOpsRole(parsed.role)) return null;
    const email = String(parsed.email || "").trim().toLowerCase();
    const name = String(parsed.name || "").trim() || email || "staff";
    if (!email) return null;
    return { email, name, role: parsed.role };
  } catch {
    return null;
  }
}

export function verifyOpsSessionToken(
  token: string | undefined | null,
  now = Date.now(),
): boolean {
  return parseOpsSessionToken(token, now) !== null;
}

export function verifyOpsPassword(password: string): boolean {
  const expected = (process.env.ADMIN_PASSWORD || "").trim();
  if (!isOpsAuthConfigured() || expected.length < 12) return false;
  return timingSafeEqualString(expected, password);
}

export function authenticateOpsUser(
  email: string,
  password: string,
): OpsActor | null {
  if (!isOpsAuthConfigured()) return null;
  const trimmedEmail = email.trim().toLowerCase();
  if (trimmedEmail) {
    const dbUser = getOpsStaffByEmail(trimmedEmail);
    if (dbUser) {
      if (!dbUser.active) return null;
      return authenticateOpsStaff(trimmedEmail, password);
    }
    const user = findOpsUserByEmail(trimmedEmail);
    if (user && timingSafeEqualString(user.password, password)) {
      return { email: user.email, name: user.name, role: user.role };
    }
    return null;
  }
  if (verifyOpsPassword(password)) {
    return defaultAdminActor();
  }
  return null;
}

export async function setOpsSessionCookie(
  actor: OpsActor = defaultAdminActor(),
): Promise<void> {
  const jar = await cookies();
  jar.set(OPS_COOKIE, createOpsSessionToken(Date.now(), actor), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function clearOpsSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(OPS_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getOpsActor(): Promise<OpsActor | null> {
  const jar = await cookies();
  const parsed = parseOpsSessionToken(jar.get(OPS_COOKIE)?.value);
  if (!parsed) return null;
  return hydrateOpsActor(parsed);
}

export async function requireOpsSession(): Promise<boolean> {
  return (await getOpsActor()) !== null;
}

export async function requireOpsActor(
  permission?: OpsPermission,
): Promise<OpsActor | null> {
  const actor = await getOpsActor();
  if (!actor) return null;
  if (permission && !actorMay(actor, permission)) return null;
  return actor;
}

/** Login if unsigned-in; dedicated page if signed-in without the permission. */
export async function requireOpsPage(
  permission?: OpsPermission,
): Promise<OpsActor> {
  if (!isOpsAuthConfigured()) redirect("/ops/login");
  const actor = await getOpsActor();
  if (!actor) redirect("/ops/login");
  if (permission && !actorMay(actor, permission)) redirect("/ops/forbidden");
  return actor;
}
