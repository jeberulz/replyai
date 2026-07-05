import { redirect } from "next/navigation";
import { ResearchAgent } from "@/components/app/research-agent";
import { getSessionUser } from "@/lib/session";

export default async function ResearchPage() {
  const session = await getSessionUser();
  if (!session) redirect("/");
  return <ResearchAgent />;
}
