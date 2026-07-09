import { redirect } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import {
  openBillingPortalAction,
  startProCheckoutAction,
} from "@/app/actions";
import { Badge } from "@/components/ds/badge";
import { Button } from "@/components/ds/button";
import { Card } from "@/components/ds/card";
import { Heading } from "@/components/ds/heading";
import { Text } from "@/components/ds/text";
import { DefaultModelCard } from "@/components/app/default-model-card";
import { AccountDataControls } from "@/components/app/account-data-controls";
import { PageHeader } from "@/components/app/page-header";
import { convexServer } from "@/lib/convex";
import { hasAnthropicKey, hasXCredentials } from "@/lib/env";
import { getSessionUser } from "@/lib/session";
import { formatCount } from "@/lib/utils";

function ConnectionRow({
  name,
  connected,
  detail,
}: {
  name: string;
  connected: boolean;
  detail: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-3">
      <div>
        <div className="text-sm font-medium">{name}</div>
        <div className="text-xs text-muted-foreground">{detail}</div>
      </div>
      {connected ? (
        <Badge
          variant="success"
          label="Connected"
          icon={<CheckCircle2 className="size-3" />}
        />
      ) : (
        <Badge
          variant="neutral"
          label="Not configured"
          icon={<XCircle className="size-3" />}
        />
      )}
    </div>
  );
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card padding={3}>
      <div className="space-y-4">
        <div className="space-y-1">
          <Heading level={3} className="text-base">
            {title}
          </Heading>
          {description ? (
            <Text type="supporting" color="secondary" display="block">
              {description}
            </Text>
          ) : null}
        </div>
        {children}
      </div>
    </Card>
  );
}

export default async function SettingsPage() {
  const session = await getSessionUser();
  if (!session) redirect("/");
  const { user, sessionToken } = session;

  const [stats, billing, accountInventory] = await Promise.all([
    convexServer().query(api.usage.stats, { sessionToken }),
    convexServer().query(api.billing.status, { sessionToken }),
    convexServer().query(api.account.inventory, { sessionToken }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Account & usage"
        title="Settings"
        description="Account, connections, and usage."
      />

      <SettingsSection title="Account">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">{user.displayName}</div>
            <div className="text-xs text-muted-foreground">
              @{user.username}
              {user.isDemo && " · demo account"}
            </div>
          </div>
          <Badge
            variant="orange"
            label={`${user.plan} plan`}
            className="capitalize"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form action="/api/auth/logout" method="POST">
            <Button type="submit" variant="secondary" label="Sign out" />
          </form>
          <Button
            variant="ghost"
            label="Redo onboarding"
            href="/onboarding?rerun=1"
          />
        </div>
      </SettingsSection>

      <AccountDataControls
        username={user.username}
        inventory={accountInventory}
      />

      <SettingsSection
        title="Billing"
        description="Free keeps manual analysis and reply generation. Pro unlocks the feed scanner, all scanner sources, and hot-window notifications."
      >
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
          <div>
            <div className="text-sm font-medium">
              {billing.hasProAccess ? "Pro" : "Free"}
              {billing.subscriptionStatus
                ? ` · ${billing.subscriptionStatus.replace(/_/g, " ")}`
                : ""}
            </div>
            <div className="text-xs text-muted-foreground">
              {user.isDemo
                ? "Demo accounts keep Pro access without Stripe so the full product stays testable."
                : billing.currentPeriodEnd
                  ? `Current access through ${new Date(billing.currentPeriodEnd).toLocaleDateString()}`
                  : billing.trialEndsAt
                    ? `Trial ends ${new Date(billing.trialEndsAt).toLocaleDateString()}`
                    : "Billing runs in Stripe test mode while launch pricing is being finalized."}
            </div>
          </div>
          <Badge
            variant={billing.hasProAccess ? "success" : "neutral"}
            label={billing.hasProAccess ? "Pro unlocked" : "Free plan"}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border p-3">
            <div className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
              Free
            </div>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>3 analyses per day</li>
              <li>1 voice profile</li>
              <li>No live scanner or notifications</li>
            </ul>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="font-mono text-xs uppercase tracking-[0.1em] text-primary">
              Pro
            </div>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>Unlimited analyses under fair use</li>
              <li>Feed scanner across all 4 sources</li>
              <li>Hot-window notifications</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {billing.canStartCheckout ? (
            <form action={startProCheckoutAction}>
              <Button type="submit" label="Start Pro trial" />
            </form>
          ) : (
            <Button
              type="button"
              label={user.isDemo ? "Demo includes Pro" : "Stripe not configured"}
              isDisabled
            />
          )}
          {billing.canManageBilling && (
            <form action={openBillingPortalAction}>
              <Button
                type="submit"
                variant="secondary"
                label="Open billing portal"
              />
            </form>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Connections"
        description="Configured via environment variables — see .env.example in the repo."
      >
        <div className="space-y-3">
          <ConnectionRow
            name="X account"
            connected={user.xConnected}
            detail={
              user.xConnected
                ? "Publishing and feed scanning use your X authorization"
                : user.isDemo
                  ? "Demo mode — publishing is simulated"
                  : "Sign in with X to enable publishing"
            }
          />
          <ConnectionRow
            name="X API app"
            connected={hasXCredentials()}
            detail="X_CLIENT_ID / X_CLIENT_SECRET for OAuth sign-in"
          />
          <ConnectionRow
            name="Anthropic API"
            connected={hasAnthropicKey()}
            detail={
              hasAnthropicKey()
                ? "AI analysis and generation are live"
                : "ANTHROPIC_API_KEY missing — using deterministic demo generation"
            }
          />
          <ConnectionRow
            name="Stripe billing"
            connected={billing.stripeConfigured}
            detail={
              billing.stripeConfigured
                ? "Stripe checkout, portal, and webhook are live in test mode"
                : "STRIPE_SECRET_KEY / STRIPE_PRO_PRICE_ID / STRIPE_WEBHOOK_SECRET missing — billing stays hidden"
            }
          />
        </div>
      </SettingsSection>

      <DefaultModelCard defaultModel={user.defaultModel} />

      <SettingsSection
        title={`Usage — ${stats.month}`}
        description="Tracked per month; pricing tiers are decided before public launch."
      >
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {(
            [
              ["Requests", stats.requests],
              ["Analyses", stats.analyses],
              ["Generations", stats.generations],
              ["Tokens", stats.tokensIn + stats.tokensOut],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border p-3">
              <dt className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
                {label}
              </dt>
              <dd className="mt-1.5 font-mono text-lg tabular-nums text-foreground">
                {formatCount(value)}
              </dd>
            </div>
          ))}
        </dl>
      </SettingsSection>

      <SettingsSection
        title={`Reply quality — ${stats.month}`}
        description="Launch baseline for the north star: generated replies sent with no or minor edits."
      >
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {(
            [
              [
                "No/minor edits",
                stats.noOrMinorEditRate === null
                  ? "—"
                  : `${stats.noOrMinorEditRate}%`,
              ],
              ["No edit", stats.observedEditBuckets.no_edit],
              ["Minor edit", stats.observedEditBuckets.minor_edit],
              ["Major edit", stats.observedEditBuckets.major_edit],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border p-3">
              <dt className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
                {label}
              </dt>
              <dd className="mt-1.5 font-mono text-lg tabular-nums text-foreground">
                {typeof value === "number" ? formatCount(value) : value}
              </dd>
            </div>
          ))}
        </dl>
        <Text type="supporting" color="secondary" size="sm" display="block">
          Only generated replies with observed edit-distance data are counted
          here. Legacy publishes without bucket data are excluded from this
          baseline.
        </Text>
      </SettingsSection>

      <SettingsSection title="How publishing works">
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong className="font-medium text-foreground">Quotes</strong> post
            through the API with the original tweet linked — X renders it as a
            quote card on your timeline.
          </p>
          <p>
            <strong className="font-medium text-foreground">Replies</strong>{" "}
            try the API first. If X blocks threading (common on standard API
            tiers), use{" "}
            <strong className="font-medium text-foreground">Reply on X</strong>{" "}
            to finish in the X compose window, or post standalone.
          </p>
          <p>
            Nothing is auto-published. Every post requires your explicit click on
            that specific text.
          </p>
        </div>
      </SettingsSection>

      <SettingsSection title="Platform safety">
        <Text type="supporting" color="secondary" display="block">
          ReplyPilot never auto-publishes. Every reply, quote tweet, and
          scheduled post requires your explicit click on that specific text.
          This is a permanent design decision to keep your account safe under
          X&apos;s automation rules.
        </Text>
      </SettingsSection>
    </div>
  );
}
