import { NextRequest, NextResponse } from "next/server";
import { api } from "../../../../../convex/_generated/api";
import { convexServer } from "@/lib/convex";
import { ensureDefaults } from "@/lib/onboarding";
import { newSessionToken, setSessionCookie } from "@/lib/session";
import { exchangeCodeForToken, fetchAuthenticatedUser } from "@/lib/x";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");
  const storedState = request.cookies.get("rp_oauth_state")?.value;
  const verifier = request.cookies.get("rp_oauth_verifier")?.value;

  if (!code || !state || !storedState || !verifier || state !== storedState) {
    return NextResponse.redirect(new URL("/?error=oauth", request.url));
  }

  try {
    const redirectUri = new URL("/api/auth/callback", request.url).toString();
    const token = await exchangeCodeForToken({ code, verifier, redirectUri });
    const xUser = await fetchAuthenticatedUser(token.accessToken);

    const sessionToken = newSessionToken();
    await convexServer().mutation(api.users.upsertAndCreateSession, {
      xUserId: xUser.id,
      username: xUser.username,
      displayName: xUser.name,
      avatar: xUser.avatar,
      isDemo: false,
      sessionToken,
      xAuth: {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        expiresAt: token.expiresAt,
        scope: token.scope,
      },
    });
    await setSessionCookie(sessionToken);
    await ensureDefaults(sessionToken);

    const response = NextResponse.redirect(new URL("/dashboard", request.url));
    response.cookies.delete("rp_oauth_state");
    response.cookies.delete("rp_oauth_verifier");
    return response;
  } catch (error) {
    console.error("X OAuth callback failed:", error);
    return NextResponse.redirect(new URL("/?error=oauth", request.url));
  }
}
