import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquareQuote } from "lucide-react";
import {
  CHANGE_TYPE_LABELS,
  CHANGELOG,
  formatChangelogDate,
  LATEST_RELEASE,
  type ChangeType,
} from "@/lib/changelog";

export const metadata: Metadata = {
  title: "Changelog — ReplyPilot AI",
  description:
    "What's new in ReplyPilot AI — the features we've shipped and the improvements we've made, newest first.",
};

const TAG_STYLES: Record<ChangeType, string> = {
  new: "border-primary/40 text-primary",
  improved: "border-border text-foreground",
  fixed: "border-border text-muted-foreground",
};

function ChangeTag({ type }: { type: ChangeType }) {
  return (
    <span
      className={`inline-flex h-5 shrink-0 items-center rounded-md border px-2 font-mono text-[10px] uppercase tracking-[0.12em] ${TAG_STYLES[type]}`}
    >
      {CHANGE_TYPE_LABELS[type]}
    </span>
  );
}

export default function ChangelogPage() {
  return (
    <main className="min-h-svh bg-chrome px-4 text-foreground">
      <div className="mx-auto min-h-svh w-full max-w-[1180px] bg-background">
        <header className="mx-auto flex h-16 w-full max-w-[1080px] items-center justify-between px-6 font-mono text-xs text-muted-foreground">
          <Link href="/" className="flex items-center gap-1.5 text-foreground">
            <MessageSquareQuote className="size-3.5 text-primary" />
            <span>ReplyPilot</span>
          </Link>
          <Link href="/" className="hover:text-foreground">
            ← back home
          </Link>
        </header>

        <article className="mx-auto w-full max-w-[760px] px-6 pb-24 pt-10">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">
            Changelog
          </p>
          <h1 className="mt-3 font-serif text-[44px] leading-[0.95] tracking-[-0.04em] sm:text-[56px]">
            What&apos;s new in ReplyPilot
          </h1>
          <p className="mt-6 max-w-[62ch] text-base leading-8 text-muted-foreground">
            Every feature we ship and every improvement we make, newest first.
            We&apos;re building conversation discovery and voice-matched replies
            for X — here&apos;s how the product keeps getting sharper.
          </p>
          <p className="mt-4 font-mono text-xs text-muted-foreground">
            Last updated {formatChangelogDate(LATEST_RELEASE.date)}
          </p>

          <div className="mt-14 space-y-16">
            {CHANGELOG.map((release) => (
              <section
                key={release.version}
                className="grid gap-6 sm:grid-cols-[9rem_1fr]"
              >
                <div className="sm:sticky sm:top-8 sm:self-start">
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-primary">
                    v{release.version}
                  </p>
                  <p className="mt-2 font-mono text-xs text-muted-foreground">
                    {formatChangelogDate(release.date)}
                  </p>
                </div>

                <div>
                  <h2 className="font-serif text-[26px] leading-tight tracking-[-0.02em]">
                    {release.title}
                  </h2>
                  <p className="mt-3 max-w-[60ch] text-base leading-8 text-muted-foreground">
                    {release.summary}
                  </p>

                  <ul className="mt-6 space-y-4">
                    {release.changes.map((change) => (
                      <li
                        key={change.title}
                        className="rounded-lg border border-border bg-card px-5 py-4"
                      >
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5">
                            <ChangeTag type={change.type} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-base leading-6 text-foreground">
                              {change.title}
                            </p>
                            {change.detail && (
                              <p className="mt-1.5 max-w-[58ch] text-sm leading-6 text-muted-foreground">
                                {change.detail}
                              </p>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            ))}
          </div>

          <div className="mt-20 border-t border-border pt-8">
            <p className="max-w-[60ch] text-sm leading-7 text-muted-foreground">
              Want a say in what ships next? Try the product in demo mode — no X
              account or API keys required.
            </p>
            <Link
              href="/api/auth/login"
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-chrome transition-colors hover:bg-oatmeal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Try the demo
            </Link>
          </div>
        </article>

        <footer className="border-t border-border bg-card">
          <div className="mx-auto flex w-full max-w-[1080px] flex-wrap items-center justify-between gap-4 px-6 py-10 font-mono text-xs text-muted-foreground">
            <p>ReplyPilot AI</p>
            <nav className="flex flex-wrap gap-x-6 gap-y-2">
              <Link href="/" className="hover:text-foreground">
                home
              </Link>
              <Link href="/changelog" className="hover:text-foreground">
                changelog
              </Link>
              <Link href="/privacy" className="hover:text-foreground">
                privacy
              </Link>
              <Link href="/terms" className="hover:text-foreground">
                terms
              </Link>
            </nav>
          </div>
        </footer>
      </div>
    </main>
  );
}
