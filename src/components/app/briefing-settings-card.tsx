"use client";

import { useState, useTransition } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { saveBriefingSettingsAction } from "@/app/actions";
import { useSessionToken } from "@/components/app/convex-provider";
import { Badge } from "@/components/ds/badge";
import { Switch } from "@/components/ds/switch";
import { Text } from "@/components/ds/text";
import { TextInput } from "@/components/ds/text-input";
import { BRIEFING_DEFAULTS } from "../../../shared/briefings";

export function BriefingSettingsCard({
  hasProAccess,
}: {
  hasProAccess: boolean;
}) {
  const sessionToken = useSessionToken();
  const settings = useQuery(
    api.briefings.settings,
    sessionToken ? { sessionToken } : "skip"
  );
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [hourDraft, setHourDraft] = useState("");
  const [tzDraft, setTzDraft] = useState("");
  const [hourInitialized, setHourInitialized] = useState(false);
  const [tzInitialized, setTzInitialized] = useState(false);

  if (!settings) {
    return <Text type="supporting">Loading briefing settings…</Text>;
  }

  const locked = settings.briefingLocked || !hasProAccess;
  const hourValue =
    hourInitialized || hourDraft.length > 0
      ? hourDraft
      : String(settings.hourLocal);
  const tzValue =
    tzInitialized || tzDraft.length > 0 ? tzDraft : settings.timezone;

  const savePatch = (patch: {
    enabled?: boolean;
    hourLocal?: number;
    timezone?: string;
    emailOptIn?: boolean;
  }) => {
    if (!sessionToken || locked) return;
    startTransition(async () => {
      try {
        await saveBriefingSettingsAction(patch);
        setMessage("Saved");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Save failed");
      }
    });
  };

  return (
    <div className="space-y-4">
      {locked ? (
        <Badge variant="neutral" label="Pro feature" />
      ) : (
        <Badge
          variant={settings.enabled ? "success" : "neutral"}
          label={settings.enabled ? "Opted in" : "Off until you opt in"}
        />
      )}

      <Text type="supporting" color="secondary" display="block">
        At your chosen local hour, ReplyPilot writes a briefing artifact (top
        opportunities, yesterday&apos;s outcomes, one coaching insight). Optional
        email uses the same address as notification digest. Nothing auto-posts.
        Default hour is {String(BRIEFING_DEFAULTS.hourLocal).padStart(2, "0")}
        :00.
      </Text>

      <Switch
        label="Enable daily briefing"
        description="Runs once per local calendar day at the hour below."
        value={settings.enabled}
        onChange={(checked) => savePatch({ enabled: checked })}
        isDisabled={pending || locked}
      />

      <TextInput
        label="Local hour (0–23)"
        value={hourValue}
        placeholder="8"
        onChange={(value) => {
          if (!hourInitialized) setHourInitialized(true);
          setHourDraft(value);
        }}
        changeAction={(value) => {
          const parsed = Number(value);
          if (!Number.isFinite(parsed)) return;
          savePatch({ hourLocal: parsed });
        }}
        isDisabled={pending || locked}
      />

      <TextInput
        label="Timezone"
        value={tzValue}
        placeholder="UTC"
        onChange={(value) => {
          if (!tzInitialized) setTzInitialized(true);
          setTzDraft(value);
        }}
        changeAction={(value) => {
          const trimmed = value.trim();
          if (!trimmed) return;
          savePatch({ timezone: trimmed });
        }}
        isDisabled={pending || locked}
      />

      <Switch
        label="Email briefing"
        description="Send the artifact via Resend when keys are configured. Uses your notification digest email."
        value={settings.emailOptIn}
        onChange={(checked) => savePatch({ emailOptIn: checked })}
        isDisabled={pending || locked}
      />

      {message ? (
        <Text type="supporting" size="sm" color="secondary">
          {message}
        </Text>
      ) : null}
    </div>
  );
}
