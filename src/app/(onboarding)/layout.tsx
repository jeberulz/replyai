import { redirect } from "next/navigation";
import { ConvexClientProvider } from "@/components/app/convex-provider";
import {
  clearSessionCookie,
  getSessionToken,
  getSessionUser,
} from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Onboarding shell: chrome-black AI-moment tier (design.md), no app nav.
 * Convex provider is needed for the live opportunity count on the ready step.
 */
export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionUser();
  if (!session) {
    if (await getSessionToken()) await clearSessionCookie();
    redirect("/");
  }

  return (
    <ConvexClientProvider sessionToken={session.sessionToken}>
      {children}
    </ConvexClientProvider>
  );
}
