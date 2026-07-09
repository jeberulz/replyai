"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useSessionToken } from "@/components/app/convex-provider";
import { OatmealEmptyState } from "@/components/app/oatmeal-empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ds/badge";
import { Button } from "@/components/ds/button";
import { Card } from "@/components/ds/card";
import { Heading } from "@/components/ds/heading";
import { Text } from "@/components/ds/text";

function formatRunTime(ms: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toISOString();
  }
}

export function BriefingView({ hasProAccess }: { hasProAccess: boolean }) {
  const sessionToken = useSessionToken();
  const settings = useQuery(
    api.briefings.settings,
    sessionToken ? { sessionToken } : "skip"
  );
  const latestRun = useQuery(
    api.briefings.latestRun,
    sessionToken ? { sessionToken } : "skip"
  );

  if (!hasProAccess) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          eyebrow="Agent"
          title="Daily briefing"
          description="A morning artifact with overnight opportunities, yesterday's outcomes, and one coaching insight. Pro prepares it — you still decide every reply."
        />
        <Card padding={3}>
          <div className="space-y-4">
            <Badge variant="neutral" label="Pro feature" />
            <Heading level={3} className="text-base">
              Unlock the daily briefing agent
            </Heading>
            <Text type="supporting" color="secondary" display="block">
              Free accounts can still analyze pasted tweets and generate replies.
              Briefing runs are Pro/demo only. Nothing auto-posts.
            </Text>
            <Button
              variant="primary"
              label="Open billing settings"
              href="/settings"
              as={Link}
            />
          </div>
        </Card>
      </div>
    );
  }

  if (settings === undefined || latestRun === undefined) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          eyebrow="Agent"
          title="Daily briefing"
          description="Loading your latest briefing…"
        />
      </div>
    );
  }

  const artifact = latestRun?.status === "complete" ? latestRun.artifact : null;
  const lastRanAt = latestRun?.completedAt ?? latestRun?.createdAt;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Agent"
        title="Daily briefing"
        description="Overnight opportunities with angles, yesterday's outcomes, and one coaching insight. Agents prepare — you decide."
      >
        <Button
          variant="secondary"
          size="sm"
          label="Briefing settings"
          href="/settings"
          as={Link}
        />
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        {!settings.enabled ? (
          <Badge variant="neutral" label="Disabled until opt-in" />
        ) : (
          <Badge
            variant="success"
            label={`Scheduled · ${String(settings.hourLocal).padStart(2, "0")}:00 ${settings.timezone}`}
          />
        )}
        {artifact?.demo ? (
          <Badge variant="neutral" label="Demo artifact" />
        ) : null}
        {lastRanAt ? (
          <Text type="code" size="sm" color="secondary">
            Last briefing ran at {formatRunTime(lastRanAt)}
          </Text>
        ) : (
          <Text type="code" size="sm" color="secondary">
            No briefing run yet
          </Text>
        )}
      </div>

      {latestRun?.status === "running" ? (
        <Card padding={3}>
          <Text type="supporting">Briefing is generating…</Text>
        </Card>
      ) : null}

      {latestRun?.status === "failed" ? (
        <Card padding={3}>
          <Text type="supporting" color="secondary" display="block">
            Last run failed
            {latestRun.error ? `: ${latestRun.error}` : "."} It will retry at
            your next scheduled hour.
          </Text>
        </Card>
      ) : null}

      {!artifact ? (
        <OatmealEmptyState
          title="No briefing yet"
          description={
            settings.enabled
              ? `Your next run is around ${String(settings.hourLocal).padStart(2, "0")}:00 ${settings.timezone}. Enable stays on — nothing publishes without your click.`
              : "Turn on the daily briefing in Settings (hour + timezone). Runs are Pro/demo only."
          }
        />
      ) : (
        <>
          <section className="space-y-3">
            <Heading level={2} className="text-xl tracking-[-0.02em]">
              Overnight opportunities
            </Heading>
            <div className="space-y-3">
              {artifact.opportunities.map((opp, index) => (
                <Card
                  key={opp.opportunityId ?? `${opp.authorHandle}-${index}`}
                  padding={3}
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <Text type="code" size="sm" color="accent">
                        @{opp.authorHandle}
                      </Text>
                      {opp.opportunityId &&
                      !opp.opportunityId.startsWith("demo-") ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          label="Open in feed"
                          href={`/feed?opportunity=${opp.opportunityId}`}
                          as={Link}
                        />
                      ) : null}
                    </div>
                    <Text
                      type="supporting"
                      display="block"
                      className="leading-6"
                    >
                      {opp.textPreview}
                    </Text>
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <Text
                        type="supporting"
                        size="sm"
                        display="block"
                        className="mb-1 font-medium text-foreground"
                      >
                        Angle
                      </Text>
                      <Text display="block">{opp.angle}</Text>
                      <Text
                        type="supporting"
                        color="secondary"
                        size="sm"
                        display="block"
                        className="mt-2"
                      >
                        {opp.reason}
                      </Text>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <Heading level={2} className="text-xl tracking-[-0.02em]">
              Yesterday&apos;s outcomes
            </Heading>
            <Card padding={3}>
              <div className="mb-3 flex flex-wrap gap-4 font-mono text-sm tabular-nums">
                <span>Analyzed {artifact.outcomes.analyzed}</span>
                <span>Sent {artifact.outcomes.sent}</span>
                <span>Reply-backs {artifact.outcomes.responded}</span>
              </div>
              <Text type="supporting" color="secondary" display="block">
                {artifact.outcomes.summary}
              </Text>
            </Card>
          </section>

          <section className="space-y-3">
            <Heading level={2} className="text-xl tracking-[-0.02em]">
              Coaching insight
            </Heading>
            <Card padding={3}>
              <Text display="block" className="leading-6">
                {artifact.coachingInsight}
              </Text>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
