import { redirect } from "next/navigation";
import { Dashboard } from "@/components/app/dashboard";
import { getSessionUser } from "@/lib/session";

export default async function DashboardPage() {
  const session = await getSessionUser();
  if (!session) redirect("/");
  return <Dashboard displayName={session.user.displayName} />;
}
