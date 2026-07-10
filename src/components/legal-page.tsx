import Link from "next/link";
import { MessageSquareQuote } from "lucide-react";
import { env } from "@/lib/env";

export const LEGAL_LAST_UPDATED = "July 10, 2026";

export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
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

        <article className="mx-auto w-full max-w-[720px] px-6 pb-24 pt-10">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">
            Legal
          </p>
          <h1 className="mt-3 font-serif text-[44px] leading-[0.95] tracking-[-0.04em] sm:text-[56px]">
            {title}
          </h1>
          <p className="mt-4 font-mono text-xs text-muted-foreground">
            Last updated {LEGAL_LAST_UPDATED}
          </p>
          <p className="mt-6 max-w-[65ch] text-base leading-8 text-muted-foreground">
            {intro}
          </p>

          <div className="mt-10 space-y-10">{children}</div>
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

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="max-w-[65ch]">
      <h2 className="font-serif text-[26px] leading-tight tracking-[-0.02em]">
        {heading}
      </h2>
      <div className="mt-3 space-y-4 text-base leading-8 text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

export function LegalList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export function LegalMail() {
  const email = env.supportEmail;
  if (!email) {
    return (
      <span className="text-foreground">
        ReplyPilot support contact not configured
      </span>
    );
  }

  return (
    <a
      href={`mailto:${email}`}
      className="text-foreground underline underline-offset-4 hover:text-primary"
    >
      {email}
    </a>
  );
}

export function LegalOperator() {
  return <>{env.operatorName || "ReplyPilot AI"}</>;
}
