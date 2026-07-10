import { redirect } from "next/navigation";
import { CheckCircle2, Mail, XCircle } from "lucide-react";
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
import { NotificationSettingsCard } from "@/components/app/notification-settings-card";
import { BriefingSettingsCard } from "@/components/app/briefing-settings-card";
import { InstallAppCard } from "@/components/app/install-app-card";
import { XDisconnectControl } from "@/components/app/settings/x-disconnect-control";
import { PageHeader } from "@/components/app/page-header";
import { convexServer } from "@/lib/convex";
import { env } from "@/lib/env";
import { getSessionUser } from "@/lib/session";
import { formatCount } from "@/lib/utils";

function ConnectionRow({
  name,
  connected,
  detail,
  connectedLabel = "Connected",
  disconnectedLabel = "Not connected",
}: {
  name: string;
  connected: boolean;
  detail: string;
  connectedLabel?: string;
  disconnectedLabel?: string;
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
          label={connectedLabel}
          icon={<CheckCircle2 className="size-3" />}
        />
      ) : (
        <Badge
          variant="neutral"
          label={disconnectedLabel}
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

  const [stats, billing, accountInventory, scheduledDrafts] = await Promise.all([
    convexServer().query(api.usage.stats, { sessionToken }),
    convexServer().query(api.billing.status, { sessionToken }),
    convexServer().query(api.account.inventory, { sessionToken }),
    convexServer().query(api.drafts.scheduledCount, { sessionToken }),
  ]);
  const supportEmail = env.supportEmail;

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
              {billing.hasBetaAccess
                ? "Private beta"
                : billing.hasProAccess
                  ? "Pro"
                  : "Free"}
              {billing.subscriptionStatus
                ? ` · ${billing.subscriptionStatus.replace(/_/g, " ")}`
                : ""}
            </div>
            <div className="text-xs text-muted-foreground">
              {user.isDemo
                ? "Demo accounts keep Pro access without Stripe so the full product stays testable."
                : billing.hasBetaAccess && billing.betaAccessExpiresAt
                  ? `Private beta access through ${new Date(billing.betaAccessExpiresAt).toLocaleDateString()} — no card required.`
                : billing.currentPeriodEnd
                  ? `Current access through ${new Date(billing.currentPeriodEnd).toLocaleDateString()}`
                  : billing.trialEndsAt
                    ? `Trial ends ${new Date(billing.trialEndsAt).toLocaleDateString()}`
                    : "Billing runs in Stripe test mode while launch pricing is being finalized."}
            </div>
          </div>
          <Badge
            variant={billing.hasProAccess ? "success" : "neutral"}
            label={
              billing.hasBetaAccess
                ? "Private beta"
                : billing.hasProAccess
                  ? "Pro unlocked"
                  : "Free plan"
            }
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
              label={
                billing.hasBetaAccess
                  ? "Private beta active"
                  : user.isDemo
                    ? "Demo includes Pro"
                    : "Stripe not configured"
              }
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
        title="Install app"
        description="Add ReplyPilot to your home screen. Offline draft queue syncs when you reconnect — publishing always needs network + an explicit click."
      >
        <InstallAppCard />
      </SettingsSection>

      <SettingsSection
        title="Hot-window notifications"
        description="Capped, quiet-hours-aware alerts when a young opportunity crosses your threshold. Golden-15 covers watched/list authors in the first ~15 minutes."
      >
        <NotificationSettingsCard hasProAccess={billing.hasProAccess} />
      </SettingsSection>

      <SettingsSection
        title="Daily briefing"
        description="Morning artifact at your hour: overnight opportunities, yesterday's outcomes, one coaching insight. Optional email. Agents prepare — you decide."
      >
        <BriefingSettingsCard hasProAccess={billing.hasProAccess} />
      </SettingsSection>

      <SettingsSection
        title="Connections"
        description="Manage your connected X account. Reconnect remains available after disconnect."
      >
        <div className="space-y-3">
          <ConnectionRow
            name="X account"
            connected={user.xConnected}
            detail={
              user.xConnected
                ? "Publishing, scanner reads, and X-dependent alerts use your authorization only after explicit actions."
                : user.isDemo
                  ? "Demo mode — publishing is simulated"
                  : "Reconnect X to publish, scan feeds, and refresh voice from X."
            }
            disconnectedLabel={user.isDemo ? "Demo" : "Disconnected"}
          />
          <div className="flex flex-wrap items-center gap-2">
            <XDisconnectControl
              connected={user.xConnected}
              canReconnect={!user.isDemo}
              scheduledDraftCount={scheduledDrafts.count}
            />
          </div>
          <Text type="supporting" color="secondary" size="sm" display="block">
            Disconnect removes stored X authorization, turns off scanner and
            notification settings that depend on X, and stops scheduled X
            publishes that have not run yet. Saved drafts, exports, and account
            deletion remain available.
          </Text>
        </div>
      </SettingsSection>

      <DefaultModelCard defaultModel={user.defaultModel} />

      <SettingsSection
        title={`Usage — ${stats.month}`}
        description="Tracked per month. AI and X-read spend are capped server-side for the private beta."
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

      <SettingsSection title="Support">
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <div className="text-sm font-medium">Private beta support</div>
              <div className="text-xs text-muted-foreground">
                {supportEmail
                  ? "Use this address for account, deletion, or beta feedback."
                  : "Support contact is not configured for this deployment."}
              </div>
            </div>
            {supportEmail ? (
              <Button
                href={`mailto:${supportEmail}`}
                variant="secondary"
                label="Email support"
                icon={<Mail className="size-4" />}
              />
            ) : (
              <Badge variant="warning" label="Needs owner input" />
            )}
          </div>
        </div>
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
