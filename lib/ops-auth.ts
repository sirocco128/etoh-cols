/**
 * Ops console session auth (cookie HMAC).
 * Local staff UI only — not SSO. Requires ADMIN_PASSWORD + ADMIN_SESSION_SECRET.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import {
  isSecretConfigured,
  timingSafeEqualString,
} from "@/lib/security";

export const OPS_COOKIE = "ops_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export function isOpsAuthConfigured(): boolean {
  const password = (process.env.ADMIN_PASSWORD || "").trim();
  const secret = (process.env.ADMIN_SESSION_SECRET || "").trim();
  return password.length >= 12 && isSecretConfigured(secret, 32);
}

function sessionSecret(): string {
  return (process.env.ADMIN_SESSION_SECRET || "").trim();
}

function sign(payload: string): string {
  return createHmac("sha256", sessionSecret())
    .update(payload)
    .digest("base64url");
}

export function createOpsSessionToken(now = Date.now()): string {
  const exp = now + SESSION_TTL_MS;
  const payload = `v1.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyOpsSessionToken(
  token: string | undefined | null,
  now = Date.now(),
): boolean {
  if (!token || !isOpsAuthConfigured()) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [version, expRaw, sig] = parts;
  if (version !== "v1" || !expRaw || !sig) return false;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < now) return false;
  const payload = `${version}.${expRaw}`;
  const expected = sign(payload);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function verifyOpsPassword(password: string): boolean {
  const expected = (process.env.ADMIN_PASSWORD || "").trim();
  if (!isOpsAuthConfigured()) return false;
  return timingSafeEqualString(expected, password);
}

export async function setOpsSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(OPS_COOKIE, createOpsSessionToken(), {
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

export async function requireOpsSession(): Promise<boolean> {
  const jar = await cookies();
  return verifyOpsSessionToken(jar.get(OPS_COOKIE)?.value);
}
