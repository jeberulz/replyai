import { NextRequest, NextResponse } from "next/server";
import { api } from "../../../../../convex/_generated/api";
import { env } from "@/lib/env";
import { convexServer } from "@/lib/convex";
import { ensureDefaults, postLoginPath } from "@/lib/onboarding";
import {
  formatAuthError,
  isConvexDeploymentError,
  oauthCallbackUrl,
  optionalString,
} from "@/lib/oauth";
import { newSessionToken, setSessionCookie } from "@/lib/session";
import { exchangeCodeForToken, fetchAuthenticatedUser } from "@/lib/x";

function redirectHome(request: NextRequest, error: string) {
  const base = env.appUrl || new URL(request.url).origin;
  return NextResponse.redirect(new URL(`/?error=${error}`, base));
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");
  const storedState = request.cookies.get("rp_oauth_state")?.value;
  const verifier = request.cookies.get("rp_oauth_verifier")?.value;

  if (!code || !state || !storedState || !verifier || state !== storedState) {
    return redirectHome(request, "oauth");
  }

  try {
    const redirectUri = oauthCallbackUrl(request);
    const token = await exchangeCodeForToken({ code, verifier, redirectUri });
    const xUser = await fetchAuthenticatedUser(token.accessToken);

    const sessionToken = newSessionToken();
    await convexServer().mutation(api.users.upsertAndCreateSession, {
      xUserId: xUser.id,
      username: xUser.username,
      displayName: xUser.name,
      avatar: optionalString(xUser.avatar),
      isDemo: false,
      sessionToken,
      xAuth: {
        accessToken: token.accessToken,
        refreshToken: optionalString(token.refreshToken),
        expiresAt: token.expiresAt,
        scope: token.scope,
      },
    });
    await setSessionCookie(sessionToken);

    try {
      await ensureDefaults(sessionToken);
    } catch (onboardingError) {
      console.warn(
        "Post-login onboarding failed:",
        formatAuthError(onboardingError)
      );
    }

    const destination = await postLoginPath(sessionToken);
    const response = NextResponse.redirect(
      new URL(destination, env.appUrl || request.url)
    );
    response.cookies.delete("rp_oauth_state");
    response.cookies.delete("rp_oauth_verifier");
    return response;
  } catch (error) {
    console.error("X OAuth callback failed:", formatAuthError(error), error);

    if (isConvexDeploymentError(error)) {
      return redirectHome(request, "convex");
    }

    const message = error instanceof Error ? error.message : "";
    if (message.includes("token exchange")) {
      return redirectHome(request, "oauth_token");
    }
    if (message.includes("fetch X user")) {
      return redirectHome(request, "oauth_profile");
    }

    return redirectHome(request, "oauth");
  }
}
