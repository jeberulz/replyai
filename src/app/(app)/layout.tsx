import { redirect } from "next/navigation";
import { AnalyticsProvider } from "@/components/app/analytics-provider";
import { AstryxThemeProvider } from "@/components/app/astryx-theme-provider";
import { ConvexClientProvider } from "@/components/app/convex-provider";
import { CommandMenu } from "@/components/app/command-menu";
import { OfflineDraftSync } from "@/components/app/offline-draft-sync";
import { AppNav } from "@/components/app/nav";
import { SidebarProvider } from "@/components/app/sidebar/sidebar-provider";
import {
  clearSessionCookie,
  getSessionToken,
  getSessionUser,
} from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionUser();
  if (!session) {
    // Cookie can outlive a Convex dev deployment reset — clear it so demo
    // login doesn't keep sending a token the current deployment doesn't know.
    if (await getSessionToken()) await clearSessionCookie();
    redirect("/");
  }

  return (
    <ConvexClientProvider sessionToken={session.sessionToken}>
      <AstryxThemeProvider>
        <AnalyticsProvider userId={session.user._id} />
        <SidebarProvider>
          <div className="flex min-h-screen flex-col md:flex-row">
            <AppNav user={session.user} />
            <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-8">
              {children}
            </main>
          </div>
          <CommandMenu evalOperator={session.user.evalOperator} />
          <OfflineDraftSync />
        </SidebarProvider>
      </AstryxThemeProvider>
    </ConvexClientProvider>
  );
}
