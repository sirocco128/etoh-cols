import { NextResponse } from "next/server";
import {
  GOOGLE_OAUTH_COOKIE,
  GOOGLE_OAUTH_TTL_MS,
  buildGoogleAuthorizeUrl,
  createGoogleOAuthPending,
  isOpsGoogleAuthConfigured,
} from "@/lib/ops-google-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cookieSecure(): boolean {
  return process.env.NODE_ENV === "production";
}

export async function GET(request: Request) {
  const loginUrl = new URL("/ops/login", request.url);
  if (!isOpsGoogleAuthConfigured()) {
    loginUrl.searchParams.set("error", "google_not_configured");
    return NextResponse.redirect(loginUrl);
  }

  const pending = createGoogleOAuthPending();
  const response = NextResponse.redirect(
    buildGoogleAuthorizeUrl(pending.state, pending.verifier),
  );
  response.cookies.set({
    name: GOOGLE_OAUTH_COOKIE,
    value: pending.cookieValue,
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    maxAge: GOOGLE_OAUTH_TTL_MS / 1000,
  });
  return response;
}
