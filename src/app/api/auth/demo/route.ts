import { NextRequest, NextResponse } from "next/server";
import { api } from "../../../../../convex/_generated/api";
import { guardAuthRoute } from "@/lib/authSecurity";
import { convexServer } from "@/lib/convex";
import { env } from "@/lib/env";
import { ensureDefaults, postLoginPath } from "@/lib/onboarding";
import { newSessionToken, setSessionCookie } from "@/lib/session";

/**
 * Demo login: a local account with deterministic sample data. Lets the whole
 * product be exercised before X API credentials are configured.
 */
export async function GET(request: NextRequest) {
  const blocked = guardAuthRoute(request, "demo");
  if (blocked) return blocked;

  try {
    const sessionToken = newSessionToken();
    await convexServer().mutation(api.users.upsertAndCreateSession, {
      provisioningSecret: env.authProvisionSecret,
      xUserId: "demo-user",
      username: "demo_builder",
      displayName: "Demo Builder",
      isDemo: true,
      sessionToken,
    });
    await setSessionCookie(sessionToken);
    await ensureDefaults(sessionToken);
    const destination = await postLoginPath(sessionToken);
    return NextResponse.redirect(new URL(destination, request.url));
  } catch (error) {
    console.error("Demo login failed:", error);
    return NextResponse.redirect(new URL("/?error=convex", request.url));
  }
}
