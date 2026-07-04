import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageSquareQuote, Radar, Sparkles, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { hasXCredentials } from "@/lib/env";
import { getSessionUser } from "@/lib/session";

const XLogo = () => (
  <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSessionUser();
  if (session) redirect("/dashboard");
  const { error } = await searchParams;
  const xConfigured = hasXCredentials();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6">
      <header className="flex items-center justify-between py-6">
        <div className="flex items-center gap-2 font-semibold">
          <MessageSquareQuote className="size-5 text-primary" />
          ReplyPilot AI
        </div>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center gap-8 py-16 text-center">
        <h1 className="max-w-2xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          Find the conversation. Say the thing nobody said.
        </h1>
        <p className="max-w-xl text-balance text-lg text-muted-foreground">
          Growth on X comes from replies, not original posts. ReplyPilot surfaces
          the tweets worth replying to while the window is still open, and drafts
          replies that already sound like you.
        </p>

        {error === "oauth" && (
          <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">
            Sign-in with X failed. Try again, or use demo mode.
          </p>
        )}
        {error === "convex" && (
          <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">
            Could not reach the Convex backend. Run <code>npx convex dev</code> and
            check NEXT_PUBLIC_CONVEX_URL in .env.local.
          </p>
        )}

        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/api/auth/login">
              <XLogo />
              {xConfigured ? "Sign in with X" : "Try the demo"}
            </Link>
          </Button>
          {xConfigured && (
            <Button size="lg" variant="outline" asChild>
              <Link href="/api/auth/demo">Explore in demo mode</Link>
            </Button>
          )}
        </div>
        {!xConfigured && (
          <p className="text-xs text-muted-foreground">
            X sign-in is not configured yet — demo mode uses realistic sample data
            so you can test every feature.
          </p>
        )}

        <div className="mt-8 grid w-full gap-4 sm:grid-cols-3">
          {[
            {
              icon: Radar,
              title: "Conversation discovery",
              body: "The feed scanner scores tweets by audience, velocity, and timing — so you join conversations early, not after they peak.",
            },
            {
              icon: Sparkles,
              title: "Replies in your voice",
              body: "Train a voice profile from your own tweets. Every generated reply matches your tone, length, and punctuation habits.",
            },
            {
              icon: Timer,
              title: "Beat the reply window",
              body: "The best reply window on a viral tweet is under two hours. Paste a URL, get 3 strong options, ship one.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <Card key={title} className="text-left">
              <CardContent className="space-y-2 p-6">
                <Icon className="size-5 text-primary" />
                <div className="font-medium">{title}</div>
                <p className="text-sm text-muted-foreground">{body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="py-6 text-center text-xs text-muted-foreground">
        You approve every reply before it&apos;s sent — always. No auto-posting.
      </footer>
    </main>
  );
}
