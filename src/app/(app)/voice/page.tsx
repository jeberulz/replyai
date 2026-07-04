import { redirect } from "next/navigation";
import { VoiceStudio } from "@/components/app/voice-studio";
import { getSessionUser } from "@/lib/session";

export default async function VoicePage() {
  const session = await getSessionUser();
  if (!session) redirect("/");
  return <VoiceStudio xConnected={session.user.xConnected} />;
}
