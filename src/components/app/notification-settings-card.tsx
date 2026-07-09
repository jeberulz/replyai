"use client";

import { useState, useTransition } from "react";
import { useQuery } from "convex/react";
import { Bell, BellOff } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import {
  saveNotificationSettingsAction,
  savePushSubscriptionAction,
} from "@/app/actions";
import { useSessionToken } from "@/components/app/convex-provider";
import { Badge } from "@/components/ds/badge";
import { Button } from "@/components/ds/button";
import { Switch } from "@/components/ds/switch";
import { Text } from "@/components/ds/text";
import { TextInput } from "@/components/ds/text-input";
import {
  pushSupported,
  serializePushSubscription,
  subscribeToPush,
} from "@/lib/push";
import { ALL_NOTIFICATION_SOURCES } from "../../../shared/notifications";

const SOURCE_LABELS: Record<(typeof ALL_NOTIFICATION_SOURCES)[number], string> = {
  following: "Following",
  lists: "Engage lists",
  watched: "Watched accounts",
  search: "Keyword search",
};

export function NotificationSettingsCard({
  hasProAccess,
}: {
  hasProAccess: boolean;
}) {
  const sessionToken = useSessionToken();
  const settings = useQuery(
    api.notifications.settings,
    sessionToken ? { sessionToken } : "skip"
  );
  const [pending, startTransition] = useTransition();
  const [digestEmail, setDigestEmail] = useState("");
  const [digestEmailInitialized, setDigestEmailInitialized] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

  if (!settings) {
    return <Text type="supporting">Loading notification settings…</Text>;
  }

  const emailValue =
    digestEmailInitialized || digestEmail.length > 0
      ? digestEmail
      : (settings.notificationEmail ?? "");

  const locked = settings.notificationsLocked || !hasProAccess;

  const savePatch = (patch: Record<string, unknown>) => {
    if (!sessionToken || locked) return;
    startTransition(async () => {
      try {
        await saveNotificationSettingsAction(patch);
        setMessage("Saved");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Save failed");
      }
    });
  };

  const enablePush = () => {
    if (!sessionToken || locked) return;
    startTransition(async () => {
      try {
        if (!pushSupported()) {
          setMessage("Push is not supported in this browser.");
          return;
        }
        if (!vapidPublicKey) {
          setMessage("Push is not configured in this environment.");
          return;
        }
        const subscription = await subscribeToPush(vapidPublicKey);
        if (!subscription) {
          setMessage("Notification permission was not granted.");
          return;
        }
        await savePushSubscriptionAction(serializePushSubscription(subscription));
        await saveNotificationSettingsAction({ masterEnabled: true, pushEnabled: true });
        setMessage("Push enabled");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Push setup failed");
      }
    });
  };

  const toggleSource = (source: (typeof ALL_NOTIFICATION_SOURCES)[number]) => {
    const next = settings.enabledSources.includes(source)
      ? settings.enabledSources.filter((entry) => entry !== source)
      : [...settings.enabledSources, source];
    savePatch({ enabledSources: next });
  };

  return (
    <div className="space-y-4">
      {locked ? (
        <Badge variant="neutral" label="Pro feature" />
      ) : (
        <Badge
          variant={settings.masterEnabled ? "success" : "neutral"}
          label={settings.masterEnabled ? "Opted in" : "Off until you opt in"}
        />
      )}

      <Text type="supporting" color="secondary" display="block">
        Hot-window alerts fire for young, high-scoring opportunities. Default cap
        is 5/day with quiet hours 22:00–08:00 UTC. Golden-15 alerts cover watched
        or list authors in their first ~15 minutes.
      </Text>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
        <div>
          <div className="text-sm font-medium">Browser push</div>
          <div className="text-xs text-muted-foreground">
            {settings.hasPushSubscription
              ? "Permission granted and subscription saved."
              : "Requires opt-in plus browser permission."}
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          label={settings.hasPushSubscription ? "Push active" : "Enable push"}
          icon={
            settings.hasPushSubscription ? (
              <Bell className="size-3.5" />
            ) : (
              <BellOff className="size-3.5" />
            )
          }
          onClick={enablePush}
          isDisabled={pending || locked || !settings.pushConfigured}
        />
      </div>

      <Switch
        label="Master alerts"
        description="Off until you opt in and grant push permission."
        value={settings.masterEnabled}
        onChange={(checked) => savePatch({ masterEnabled: checked })}
        isDisabled={pending || locked}
      />

      <Switch
        label="Email digest fallback"
        description="Queued alerts when push is unavailable."
        value={settings.digestEnabled}
        onChange={(checked) => savePatch({ digestEnabled: checked })}
        isDisabled={pending || locked}
      />

      <TextInput
        label="Digest email (optional)"
        value={emailValue}
        placeholder="you@domain.com"
        onChange={(value) => {
          if (!digestEmailInitialized) setDigestEmailInitialized(true);
          setDigestEmail(value);
        }}
        changeAction={(value) => savePatch({ notificationEmail: value })}
        isDisabled={pending || locked}
      />

      <div className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
        Score threshold: <span className="font-mono text-foreground">{settings.scoreThreshold}</span>
        {" · "}
        Daily cap: <span className="font-mono text-foreground">{settings.dailyCap}</span>
        {" · "}
        Quiet hours:{" "}
        <span className="font-mono text-foreground">
          {settings.quietHoursStart}–{settings.quietHoursEnd} {settings.timezone}
        </span>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Sources</div>
        <div className="flex flex-wrap gap-2">
          {ALL_NOTIFICATION_SOURCES.map((source) => {
            const active = settings.enabledSources.includes(source);
            return (
              <Button
                key={source}
                type="button"
                size="sm"
                variant={active ? "primary" : "secondary"}
                label={SOURCE_LABELS[source]}
                onClick={() => toggleSource(source)}
                isDisabled={pending || locked}
              />
            );
          })}
        </div>
      </div>

      {message ? (
        <Text type="supporting" color="secondary" display="block">
          {message}
        </Text>
      ) : null}
    </div>
  );
}
