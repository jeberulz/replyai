import { NextRequest, NextResponse } from "next/server";
import { api } from "../../../../../convex/_generated/api";
import { authProvisioningSecret } from "@/lib/authProvisioning";
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
  if (!env.publicDemoEnabled) {
    return NextResponse.redirect(new URL("/?error=private_beta", request.url));
  }

  try {
    const sessionToken = newSessionToken();
    const demoId = `demo-${sessionToken.slice(0, 12).toLowerCase()}`;
    await convexServer().mutation(api.users.upsertAndCreateSession, {
      xUserId: demoId,
      username: demoId.replace(/-/g, "_").slice(0, 15),
      displayName: "Demo Builder",
      isDemo: true,
      sessionToken,
      provisioningSecret: authProvisioningSecret(),
    });
    await setSessionCookie(sessionToken);
    await ensureDefaults(sessionToken);
    await convexServer().mutation(api.users.completeOnboarding, {
      sessionToken,
    });
    const destination = await postLoginPath(sessionToken);
    return NextResponse.redirect(new URL(destination, request.url));
  } catch (error) {
    console.error("Demo login failed:", error);
    return NextResponse.redirect(new URL("/?error=convex", request.url));
  }
}
