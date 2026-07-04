import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageSquareQuote } from "lucide-react";
import { hasXCredentials } from "@/lib/env";
import { getSessionUser } from "@/lib/session";

const XLogo = () => (
  <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const steps = [
  {
    step: "01",
    eyebrow: "DISCOVER",
    body: "ReplyPilot scans your feed, lists, and saved creators, then ranks the live tweets worth a reply — by audience fit and how much time is left before the thread hardens.",
  },
  {
    step: "02",
    eyebrow: "DRAFT IN YOUR VOICE",
    body: "Get three replies — never ten — each with a short reason it's worth sending. Rewrite any of them shorter, sharper, or more contrarian in a single click.",
  },
  {
    step: "03",
    eyebrow: "APPROVE & SEND",
    body: "Nothing posts on its own. Read the draft, edit if you want, and click send on that exact text — or schedule it for later.",
  },
];

const wedge = [
  {
    eyebrow: "CONVERSATION DISCOVERY",
    body: "ReplyPilot ranks live tweets by audience fit, growth velocity, and how much time is left before the window closes. You stop scrolling and start choosing.",
  },
  {
    eyebrow: "TIMING SCORE",
    body: "Every tweet gets a 0–100 “worth replying” score with a plain-language reason — audience size, topic fit, reply timing, velocity. No fake “92% engagement” numbers.",
  },
  {
    eyebrow: "VOICE MATCH",
    body: "Your profile learns sentence length, punctuation, hooks, favorite moves, and the lines you never cross — so drafts read written, not generated.",
  },
];

const features: [string, string][] = [
  ["Analyze any tweet", "Thread context, author stance, and the angles nobody has taken yet."],
  ["Conversation score", "A 0–100 read on whether it's worth your reply — and the reason why."],
  ["3 replies + 3 quotes", "Distinct options, each with a reason. Generate more only if you want them."],
  ["Voice training", "Measured from your recent tweets, switchable per account."],
  ["Rewrite", "Shorter, funnier, more contrarian, stronger hook — one click."],
  ["Feed scanner", "A background scan surfaces scored opportunities every 30 minutes."],
];

const trustPoints = [
  "No auto-posting. Every reply needs a click on that exact text.",
  "Scheduling counts as your approval of that specific reply, at that time.",
  "The scanner only suggests — it never takes the wheel.",
];

const footerLinks = [
  { label: "how it works", href: "#how" },
  { label: "features", href: "#features" },
  { label: "voice", href: "#voice" },
  { label: "trust", href: "#trust" },
  { label: "demo", href: "/api/auth/demo" },
];

function PillLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-chrome transition-colors hover:bg-oatmeal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {children}
    </Link>
  );
}

function StripeDivider() {
  return <div className="h-10 border-y border-border/70 ghostbase-stripe" />;
}

function HeroPanel() {
  const rows = [
    ["@foundermode", "87", "42m"],
    ["@designfounder", "79", "1h"],
    ["@operatornotes", "74", "1h 18m"],
    ["@buildpublic", "71", "1h 44m"],
  ];

  return (
    <div className="rounded-lg border border-border bg-panel p-4 shadow-[0_1px_2px_#00000026]">
      <div className="mb-4 flex items-center justify-between border-b border-border/70 pb-3 font-mono text-xs text-muted-foreground">
        <span>live queue</span>
        <span>score · window</span>
      </div>
      <div className="space-y-2">
        {rows.map(([handle, score, time], i) => (
          <div
            key={handle}
            className="grid grid-cols-[10px_1fr_auto_auto] items-center gap-3 rounded-md border border-border/55 bg-card px-3 py-3 font-mono text-xs"
          >
            <span
              className={`size-1.5 rounded-full ${
                i === 0 ? "bg-primary" : "bg-muted-foreground"
              }`}
            />
            <span className="truncate text-foreground">{handle}</span>
            <span className="tabular-nums text-primary">{score}</span>
            <span className="tabular-nums text-muted-foreground">{time}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-md border border-border bg-background p-4">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">
          drafted reply
        </p>
        <p className="mt-2 text-base leading-7 text-foreground">
          Most teams don&apos;t have a discovery problem — they have a timing
          problem. The insight was right; it just showed up an hour late.
        </p>
        <div className="mt-4 flex items-center gap-3 border-t border-border/70 pt-3 font-mono text-[11px] text-muted-foreground">
          <span className="text-primary">voice match 96</span>
          <span>contrarian</span>
          <span className="tabular-nums">211 chars</span>
        </div>
      </div>
    </div>
  );
}

function RadarPanel() {
  return (
    <div className="relative mx-auto aspect-4/3 w-full max-w-[480px] rounded-lg border border-border bg-panel p-8">
      <div className="absolute left-1/2 top-1/2 size-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/35" />
      <div className="absolute left-1/2 top-1/2 size-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/25" />
      <div className="absolute left-[58%] top-[24%] h-32 w-px origin-bottom rotate-38 bg-primary" />
      <div className="absolute bottom-10 left-10 rounded-md border border-border bg-card px-4 py-3 font-mono text-xs">
        <div className="text-primary">score 94</div>
        <div className="text-muted-foreground">reply now</div>
      </div>
      <div className="absolute right-10 top-10 rounded-md border border-border bg-card px-4 py-3 font-mono text-xs">
        <div className="text-foreground">@foundermode</div>
        <div className="text-muted-foreground">42m left</div>
      </div>
    </div>
  );
}

function FeaturePanel() {
  return (
    <div className="mx-auto grid w-full max-w-[860px] gap-3 sm:grid-cols-2">
      {features.map(([title, body]) => (
        <div
          key={title}
          className="rounded-md border border-border bg-card px-5 py-5 text-left"
        >
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-primary">
            {title}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
        </div>
      ))}
    </div>
  );
}

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
    <main className="min-h-svh bg-chrome px-4 text-foreground">
      <div className="mx-auto min-h-svh w-full max-w-[1180px] bg-background">
        <header className="mx-auto flex h-16 w-full max-w-[1080px] items-center justify-between px-6 font-mono text-xs text-muted-foreground">
          <Link href="/" className="flex items-center gap-1.5 text-foreground">
            <MessageSquareQuote className="size-3.5 text-primary" />
            <span>ReplyPilot</span>
          </Link>
          <nav className="hidden items-center gap-5 sm:flex">
            <Link href="#how" className="hover:text-foreground">
              how it works
            </Link>
            <Link href="#features" className="hover:text-foreground">
              features
            </Link>
            <Link href="#trust" className="hover:text-foreground">
              trust
            </Link>
          </nav>
          <PillLink href="/api/auth/login">
            {xConfigured ? "get started" : "try demo"}
          </PillLink>
        </header>

        <section className="mx-auto grid w-full max-w-[1080px] items-center gap-12 px-6 pb-14 pt-10 md:grid-cols-[0.9fr_1fr]">
          <div className="space-y-5">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">
              Conversation discovery for X
            </p>
            <h1 className="max-w-[13ch] font-serif text-[56px] leading-[0.9] tracking-[-0.04em] text-foreground sm:text-[68px] lg:text-[76px]">
              Find the conversation before the window closes.
            </h1>
            <p className="max-w-[46ch] text-base leading-7 text-muted-foreground">
              Growth on X comes from replies, not posts — and the best window is
              under two hours. ReplyPilot ranks the tweets worth your reply and
              drafts three responses that already sound like you. You approve
              every send.
            </p>
            {error === "oauth" && (
              <p className="max-w-[44ch] rounded-md border border-destructive/50 px-4 py-3 text-sm text-destructive">
                Sign-in with X failed. Try again, or use demo mode.
              </p>
            )}
            {error === "oauth_token" && (
              <p className="max-w-[44ch] rounded-md border border-destructive/50 px-4 py-3 text-sm text-destructive">
                X rejected the token exchange. Check{" "}
                <code className="font-mono">X_CLIENT_ID</code> /{" "}
                <code className="font-mono">X_CLIENT_SECRET</code> and that your
                callback URL matches{" "}
                <code className="font-mono">NEXT_PUBLIC_APP_URL/api/auth/callback</code>.
              </p>
            )}
            {error === "oauth_profile" && (
              <p className="max-w-[44ch] rounded-md border border-destructive/50 px-4 py-3 text-sm text-destructive">
                Signed in with X but could not load your profile. Confirm{" "}
                <code className="font-mono">users.read</code> scope is enabled
                on your X app.
              </p>
            )}
            {error === "convex" && (
              <p className="max-w-[44ch] rounded-md border border-destructive/50 px-4 py-3 text-sm text-destructive">
                Backend not ready. Run{" "}
                <code className="font-mono">npx convex dev</code> in a second
                terminal (keep it running), then try again.
              </p>
            )}
            <div className="space-y-3 pt-1">
              <PillLink href="/api/auth/login">
                <XLogo />
                {xConfigured ? "sign in with x" : "try it free"}
              </PillLink>
              <p className="font-mono text-[11px] text-muted-foreground">
                Works in demo mode — no X account or API keys required.
              </p>
            </div>
          </div>
          <HeroPanel />
        </section>

        <StripeDivider />

        <section id="how" className="mx-auto w-full max-w-[1080px] px-6 py-24">
          <div className="max-w-[46ch]">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">
              How it works
            </p>
            <h2 className="mt-3 font-serif text-[40px] leading-[0.95] tracking-[-0.04em] sm:text-[52px]">
              Show up where it counts, in minutes.
            </h2>
          </div>
          <div className="mt-14 grid gap-10 sm:grid-cols-3">
            {steps.map((item) => (
              <div key={item.step} className="border-t border-border pt-5">
                <p className="font-mono text-xs text-muted-foreground">
                  {item.step}
                </p>
                <p className="mt-3 font-mono text-xs uppercase tracking-[0.14em] text-primary">
                  {item.eyebrow}
                </p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <StripeDivider />

        <section
          id="method"
          className="mx-auto grid w-full max-w-[1080px] gap-14 px-6 py-24 md:grid-cols-[0.9fr_1.1fr]"
        >
          <div className="space-y-8">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">
              The wedge: discovery + timing
            </p>
            <h2 className="max-w-[16ch] font-serif text-[44px] leading-[0.95] tracking-[-0.04em] sm:text-[58px]">
              Anyone can write a tweet. The hard part is what to reply to — and
              when.
            </h2>
            <div className="space-y-6">
              {wedge.map((item) => (
                <div key={item.eyebrow} className="max-w-[46ch]">
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-primary">
                    {item.eyebrow}
                  </p>
                  <p className="mt-2 text-base leading-7 text-muted-foreground">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <RadarPanel />
        </section>

        <StripeDivider />

        <section
          id="features"
          className="mx-auto w-full max-w-[1080px] px-6 py-24 text-center"
        >
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">
            For founders, indie hackers &amp; AI builders
          </p>
          <h2 className="mx-auto mt-3 max-w-[20ch] font-serif text-[44px] leading-[0.95] tracking-[-0.04em] sm:text-[58px]">
            You grow by replying. You just don&apos;t have all day to hunt.
          </h2>
          <p className="mx-auto mt-5 max-w-[60ch] text-base leading-7 text-muted-foreground">
            ReplyPilot does the scanning so you can post daily without living in
            the timeline. Everything you need to find the right conversation and
            answer it well — nothing you don&apos;t.
          </p>
          <div className="mt-12">
            <FeaturePanel />
          </div>
        </section>

        <StripeDivider />

        <section id="voice" className="mx-auto w-full max-w-[1080px] px-6 py-24">
          <article className="mx-auto max-w-[640px] rounded-md border border-border bg-card px-10 py-12">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">
              On voice
            </p>
            <h2 className="mt-4 font-serif text-[40px] leading-[0.95] tracking-[-0.04em] sm:text-[52px]">
              Generation is a commodity. Sounding like you isn&apos;t.
            </h2>
            <p className="mt-6 text-base leading-8 text-muted-foreground">
              ReplyPilot keeps a profile of the things that make your writing
              recognizable: sentence length, hooks, punctuation, favorite
              arguments, and the topics you refuse to touch — measured from your
              recent tweets, not guessed.
            </p>
            <p className="mt-5 text-base leading-8 text-muted-foreground">
              The result isn&apos;t a pile of “engaging replies.” It&apos;s a
              short list of specific responses that sound like they came from
              your desk — so you delete less and send more.
            </p>
          </article>
        </section>

        <StripeDivider />

        <section
          id="trust"
          className="mx-auto w-full max-w-[1080px] px-6 py-24 text-center"
        >
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">
            Trust &amp; safety
          </p>
          <h2 className="mx-auto mt-3 max-w-[16ch] font-serif text-[44px] leading-[0.95] tracking-[-0.04em] sm:text-[58px]">
            You click send. Always.
          </h2>
          <p className="mx-auto mt-5 max-w-[60ch] text-base leading-7 text-muted-foreground">
            Automated engagement gets accounts suspended — so ReplyPilot has no
            auto-publish path, anywhere in the product. The scanner suggests.
            Drafts wait. Nothing leaves your account without your click.
          </p>
          <div className="mx-auto mt-12 grid max-w-[860px] gap-3 sm:grid-cols-3">
            {trustPoints.map((point) => (
              <div
                key={point}
                className="rounded-md border border-border bg-card px-5 py-5 text-left text-sm leading-6 text-muted-foreground"
              >
                {point}
              </div>
            ))}
          </div>
        </section>

        <StripeDivider />

        <section className="mx-auto w-full max-w-[1080px] px-6 py-24 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">
            Start replying smarter
          </p>
          <h2 className="mx-auto mt-3 max-w-[18ch] font-serif text-[48px] leading-[0.95] tracking-[-0.04em] sm:text-[62px]">
            Your next reply is already in the queue.
          </h2>
          <p className="mx-auto mt-5 max-w-[54ch] text-base leading-7 text-muted-foreground">
            Try it in demo mode — no X account or API keys needed. Connect X
            when you&apos;re ready to scan your real feed and publish.
          </p>
          <div className="mt-8 flex justify-center">
            <PillLink href="/api/auth/login">
              <XLogo />
              {xConfigured ? "sign in with x" : "try demo mode"}
            </PillLink>
          </div>
        </section>

        <footer className="border-t border-border bg-card">
          <div className="mx-auto grid w-full max-w-[1080px] gap-8 px-6 py-12 font-mono text-xs text-muted-foreground sm:grid-cols-[1fr_auto_auto_auto_auto_auto]">
            <div>
              <MessageSquareQuote className="mb-2 size-3.5 text-foreground" />
              <p>ReplyPilot AI</p>
              <p className="mt-1 max-w-[18ch] leading-4">
                You approve every reply. No auto-posting.
              </p>
            </div>
            {footerLinks.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </footer>
      </div>
    </main>
  );
}
