import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { hasXCredentials } from "@/lib/env";
import { oauthCallbackUrl } from "@/lib/oauth";
import { buildAuthorizeUrl, generatePkcePair } from "@/lib/x";

export async function GET(request: NextRequest) {
  if (!hasXCredentials()) {
    // No X app configured — use the demo login path.
    return NextResponse.redirect(new URL("/api/auth/demo", request.url));
  }

  const state = randomBytes(16).toString("base64url");
  const { verifier, challenge } = generatePkcePair();
  const redirectUri = oauthCallbackUrl(request);

  const response = NextResponse.redirect(
    buildAuthorizeUrl({ state, challenge, redirectUri })
  );
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };
  response.cookies.set("rp_oauth_state", state, cookieOptions);
  response.cookies.set("rp_oauth_verifier", verifier, cookieOptions);
  return response;
}
