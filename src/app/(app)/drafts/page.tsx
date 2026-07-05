import { redirect } from "next/navigation";
import { DraftsList } from "@/components/app/drafts-list";
import { getSessionUser } from "@/lib/session";

export default async function DraftsPage() {
  const session = await getSessionUser();
  if (!session) redirect("/");

  return <DraftsList />;
}
