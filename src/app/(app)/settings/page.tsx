import { redirect } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import {
  openBillingPortalAction,
  startProCheckoutAction,
} from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DefaultModelCard } from "@/components/app/default-model-card";
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
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div>
        <div className="text-sm font-medium">{name}</div>
        <div className="text-xs text-muted-foreground">{detail}</div>
      </div>
      {connected ? (
        <Badge variant="success">
          <CheckCircle2 className="size-3" /> Connected
        </Badge>
      ) : (
        <Badge variant="secondary">
          <XCircle className="size-3" /> Not configured
        </Badge>
      )}
    </div>
  );
}

export default async function SettingsPage() {
  const session = await getSessionUser();
  if (!session) redirect("/");
  const { user, sessionToken } = session;

  const [stats, billing] = await Promise.all([
    convexServer().query(api.usage.stats, { sessionToken }),
    convexServer().query(api.billing.status, { sessionToken }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Account & usage"
        title="Settings"
        description="Account, connections, and usage."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{user.displayName}</div>
              <div className="text-xs text-muted-foreground">
                @{user.username}
                {user.isDemo && " · demo account"}
              </div>
            </div>
            <Badge variant="accent" className="capitalize">
              {user.plan} plan
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <form action="/api/auth/logout" method="POST">
              <Button variant="outline" type="submit">
                Sign out
              </Button>
            </form>
            <Button variant="ghost" asChild>
              <a href="/onboarding?rerun=1">Redo onboarding</a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Billing</CardTitle>
          <CardDescription>
            Free keeps manual analysis and reply generation. Pro unlocks the
            feed scanner, all scanner sources, and hot-window notifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
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
            <Badge variant={billing.hasProAccess ? "success" : "secondary"}>
              {billing.hasProAccess ? "Pro unlocked" : "Free plan"}
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <div className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
                Free
              </div>
              {/* Only describe what the code actually enforces today — the
                  strategy's numeric caps (analyses/day, profile count) ship
                  with their own enforcement, not as copy. */}
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>Manual tweet analysis</li>
                <li>Voice-matched reply generation</li>
                <li>No live scanner or notifications</li>
              </ul>
            </div>
            <div className="rounded-lg border p-3">
              <div className="font-mono text-xs uppercase tracking-[0.1em] text-primary">
                Pro
              </div>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>Everything in Free</li>
                <li>Feed scanner across all 4 sources</li>
                <li>Hot-window notifications when they launch</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {billing.canStartCheckout ? (
              <form action={startProCheckoutAction}>
                <Button type="submit">Start Pro trial</Button>
              </form>
            ) : (
              <Button type="button" disabled>
                {user.isDemo ? "Demo includes Pro" : "Stripe not configured"}
              </Button>
            )}
            {billing.canManageBilling && (
              <form action={openBillingPortalAction}>
                <Button variant="outline" type="submit">
                  Open billing portal
                </Button>
              </form>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connections</CardTitle>
          <CardDescription>
            Configured via environment variables — see .env.example in the repo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
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
        </CardContent>
      </Card>

      <DefaultModelCard defaultModel={user.defaultModel} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usage — {stats.month}</CardTitle>
          <CardDescription>
            Tracked per month; pricing tiers are decided before public launch.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {(
              [
                ["Requests", stats.requests],
                ["Analyses", stats.analyses],
                ["Generations", stats.generations],
                ["Tokens", stats.tokensIn + stats.tokensOut],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-lg border p-3">
                <dt className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
                  {label}
                </dt>
                <dd className="mt-1.5 font-mono text-lg tabular-nums text-foreground">
                  {formatCount(value)}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How publishing works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong className="font-medium text-foreground">Quotes</strong> post
            through the API with the original tweet linked — X renders it as a
            quote card on your timeline.
          </p>
          <p>
            <strong className="font-medium text-foreground">Replies</strong> try
            the API first. If X blocks threading (common on standard API tiers),
            use <strong className="font-medium text-foreground">Reply on X</strong>{" "}
            to finish in the X compose window, or post standalone.
          </p>
          <p>
            Nothing is auto-published. Every post requires your explicit click on
            that specific text.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platform safety</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          ReplyPilot never auto-publishes. Every reply, quote tweet, and
          scheduled post requires your explicit click on that specific text.
          This is a permanent design decision to keep your account safe under
          X&apos;s automation rules.
        </CardContent>
      </Card>
    </div>
  );
}
