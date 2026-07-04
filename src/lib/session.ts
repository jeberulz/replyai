import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { api } from "../../convex/_generated/api";
import { convexServer } from "./convex";

export const SESSION_COOKIE = "rp_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days, matches Convex TTL

export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export type SessionUser = {
  _id: string;
  username: string;
  displayName: string;
  avatar?: string;
  plan: string;
  isDemo: boolean;
  createdAt: number;
  xConnected: boolean;
};

/** Resolve the current user from the session cookie, or null. */
export async function getSessionUser(): Promise<
  { user: SessionUser; sessionToken: string } | null
> {
  const token = await getSessionToken();
  if (!token) return null;
  try {
    const user = await convexServer().query(api.users.me, {
      sessionToken: token,
    });
    if (!user) return null;
    return { user: user as SessionUser, sessionToken: token };
  } catch {
    return null;
  }
}
