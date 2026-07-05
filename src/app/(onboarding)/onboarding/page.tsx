import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/app/onboarding/onboarding-flow";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ rerun?: string }>;
}) {
  const session = await getSessionUser();
  if (!session) redirect("/");
  const { rerun } = await searchParams;

  // Returning users go straight to the app; ?rerun=1 re-opens the wizard
  // (linked from the dashboard checklist and Settings).
  if (session.user.onboardingCompletedAt !== undefined && rerun !== "1") {
    redirect("/dashboard");
  }

  return (
    <OnboardingFlow
      displayName={session.user.displayName}
      username={session.user.username}
      xConnected={session.user.xConnected}
      initialGoal={session.user.goal}
    />
  );
}
