import { redirect } from "next/navigation";
import { AnalyzeForm } from "@/components/app/analyze-form";
import { PageHeader } from "@/components/app/page-header";
import { getSessionUser } from "@/lib/session";

export default async function AnalyzePage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const session = await getSessionUser();
  if (!session) redirect("/");
  const { url } = await searchParams;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Conversation analysis"
        title="Analyze a tweet"
        description="Paste the tweet's text (add the URL to publish threaded). You'll get a conversation breakdown, a worth-replying score, and 3 replies + 3 quote tweets in your voice."
      />

      <AnalyzeForm initialUrl={url} />
    </div>
  );
}
