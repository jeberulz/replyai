import { NextRequest, NextResponse } from "next/server";
import { api } from "../../../../../convex/_generated/api";
import { guardAuthRoute } from "@/lib/authSecurity";
import { convexServer } from "@/lib/convex";
import { SESSION_COOKIE, getSessionToken } from "@/lib/session";

/**
 * Clears a stale session cookie. Layouts cannot mutate cookies (Server
 * Components), so unauthenticated app shells redirect here instead of calling
 * clearSessionCookie() directly.
 */
export async function GET(request: NextRequest) {
  const blocked = guardAuthRoute(request, "clear-session");
  if (blocked) return blocked;

  const token = await getSessionToken();
  if (token) {
    try {
      await convexServer().mutation(api.users.logout, { sessionToken: token });
    } catch {
      // Deployment may be down or session already gone — cookie clear is enough.
    }
  }

  const nextParam = request.nextUrl.searchParams.get("next");
  const next =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/";

  const response = NextResponse.redirect(new URL(next, request.url), 303);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
