import { redirect } from "next/navigation";
import { FeedScanner } from "@/components/app/feed-scanner";
import { getSessionUser } from "@/lib/session";

export default async function FeedPage() {
  const session = await getSessionUser();
  if (!session) redirect("/");
  return <FeedScanner />;
}
