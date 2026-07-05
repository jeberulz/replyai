import { redirect } from "next/navigation";
import { DraftsList } from "@/components/app/drafts-list";
import { PageHeader } from "@/components/app/page-header";
import { getSessionUser } from "@/lib/session";

export default async function DraftsPage() {
  const session = await getSessionUser();
  if (!session) redirect("/");

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Your queue"
        title="Drafts & published"
        description="Everything you've saved, scheduled, or sent. Scheduled posts publish automatically; statuses update live."
      />
      <DraftsList />
    </div>
  );
}
