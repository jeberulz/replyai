import { redirect } from "next/navigation";
import { BriefingView } from "@/components/app/briefing-view";
import { getSessionUser } from "@/lib/session";
import { hasProAccess } from "../../../../shared/billing";

export default async function BriefingPage() {
  const session = await getSessionUser();
  if (!session) redirect("/");
  return <BriefingView hasProAccess={hasProAccess(session.user)} />;
}
