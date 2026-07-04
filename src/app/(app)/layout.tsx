import { redirect } from "next/navigation";
import { ConvexClientProvider } from "@/components/app/convex-provider";
import { AppNav } from "@/components/app/nav";
import { getSessionUser } from "@/lib/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionUser();
  if (!session) redirect("/");

  return (
    <ConvexClientProvider sessionToken={session.sessionToken}>
      <div className="flex min-h-screen flex-col md:flex-row">
        <AppNav user={session.user} />
        <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-8">
          {children}
        </main>
      </div>
    </ConvexClientProvider>
  );
}
