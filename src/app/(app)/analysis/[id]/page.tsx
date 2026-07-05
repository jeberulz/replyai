import { notFound, redirect } from "next/navigation";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { ChatHome } from "@/components/app/chat/chat-home";
import { convexServer } from "@/lib/convex";
import { getSessionUser } from "@/lib/session";

// An analysis IS a chat thread: this route renders the same chat surface as
// the dashboard, opened on an existing analysis. All follow-ups (generate
// more, rewrite, publish) happen inside the thread.
export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSessionUser();
  if (!session) redirect("/");
  const { id } = await params;

  let analysis;
  try {
    analysis = await convexServer().query(api.analyses.get, {
      sessionToken: session.sessionToken,
      analysisId: id as Id<"tweetAnalyses">,
    });
  } catch {
    notFound();
  }
  if (!analysis) notFound();

  return (
    <ChatHome
      displayName={session.user.displayName}
      isDemo={session.user.isDemo}
      initialAnalysisId={id}
    />
  );
}
