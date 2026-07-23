import { redirect } from "next/navigation";
import { AstryxThemeProvider } from "@/components/app/astryx-theme-provider";
import { ConvexClientProvider } from "@/components/app/convex-provider";
import { getSessionToken, getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Onboarding shell: chrome-black AI-moment tier (design.md), no app nav.
 * Convex provider is needed for the live opportunity count on the ready step.
 * Astryx Theme is app/onboarding-only — landing stays off Astryx (WP24).
 */
export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionUser();
  if (!session) {
    // Layouts cannot mutate cookies — clear via Route Handler.
    if (await getSessionToken()) {
      redirect("/api/auth/clear-session?next=/");
    }
    redirect("/");
  }

  return (
    <ConvexClientProvider sessionToken={session.sessionToken}>
      <AstryxThemeProvider>{children}</AstryxThemeProvider>
    </ConvexClientProvider>
  );
}
