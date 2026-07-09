import { redirect } from "next/navigation";
import { ChatHome } from "@/components/app/chat/chat-home";
import { getSessionUser } from "@/lib/session";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; auto?: string }>;
}) {
  const session = await getSessionUser();
  if (!session) redirect("/");
  const { url, auto } = await searchParams;

  return (
    <ChatHome
      displayName={session.user.displayName}
      isDemo={session.user.isDemo}
      initialUrl={url}
      autoStart={auto === "1" || auto === "true"}
    />
  );
}
