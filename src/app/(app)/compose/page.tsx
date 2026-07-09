import { redirect } from "next/navigation";
import { ComposeLadder } from "@/components/app/compose-ladder";
import { getSessionUser } from "@/lib/session";

export default async function ComposePage() {
  const session = await getSessionUser();
  if (!session) redirect("/");
  return <ComposeLadder />;
}
