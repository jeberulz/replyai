import { NextRequest, NextResponse } from "next/server";
import { api } from "../../../../../convex/_generated/api";
import { guardAuthRoute } from "@/lib/authSecurity";
import { convexServer } from "@/lib/convex";
import { clearSessionCookie, getSessionToken } from "@/lib/session";

export async function POST(request: NextRequest) {
  const blocked = guardAuthRoute(request, "logout", { requireOrigin: true });
  if (blocked) return blocked;

  const token = await getSessionToken();
  if (token) {
    try {
      await convexServer().mutation(api.users.logout, { sessionToken: token });
    } catch {
      // Session may already be gone; clearing the cookie is what matters.
    }
  }
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/", request.url), 303);
}
