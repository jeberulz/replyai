import { NextRequest, NextResponse } from "next/server";
import { api } from "../../../../../convex/_generated/api";
import { convexServer } from "@/lib/convex";
import { clearSessionCookie, getSessionToken } from "@/lib/session";

export async function POST(request: NextRequest) {
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
