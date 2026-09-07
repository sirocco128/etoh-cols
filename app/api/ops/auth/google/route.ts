import { NextResponse } from "next/server";
import {
  GOOGLE_OAUTH_COOKIE,
  GOOGLE_OAUTH_TTL_MS,
  buildGoogleAuthorizeUrl,
  createGoogleOAuthPending,
  googleAuthRedirectUri,
  googleOAuthCookieOrigin,
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

  const cookieOrigin = googleOAuthCookieOrigin(request.url);
  const requestOrigin = new URL(request.url).origin;
  if (cookieOrigin !== requestOrigin) {
    return NextResponse.redirect(new URL("/api/ops/auth/google", cookieOrigin));
  }

  const redirectUri = googleAuthRedirectUri(request.url);
  const pending = createGoogleOAuthPending(Date.now(), redirectUri);
  const response = NextResponse.redirect(
    buildGoogleAuthorizeUrl(pending.state, pending.verifier, redirectUri),
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
