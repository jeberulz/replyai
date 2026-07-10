"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Link2Off } from "lucide-react";

import { disconnectXAction } from "@/app/actions";
import { Button } from "@/components/ds/button";
import { xDisconnectConsequenceCopy } from "../../../../shared/xDisconnect";

export function XDisconnectControl({
  connected,
  canReconnect = true,
  scheduledDraftCount,
}: {
  connected: boolean;
  canReconnect?: boolean;
  scheduledDraftCount: number;
}) {
  const [pending, startTransition] = useTransition();

  if (!connected) {
    if (!canReconnect) return null;
    return (
      <Button
        href="/api/auth/login"
        variant="secondary"
        label="Reconnect X"
      />
    );
  }

  return (
    <Button
      type="button"
      variant="secondary"
      label={pending ? "Disconnecting..." : "Disconnect X"}
      icon={<Link2Off className="size-4" />}
      isDisabled={pending}
      onClick={() => {
        const confirmed = window.confirm(
          `${xDisconnectConsequenceCopy(scheduledDraftCount)}\n\nDisconnect X now?`
        );
        if (!confirmed) return;

        startTransition(async () => {
          try {
            const result = await disconnectXAction();
            toast.success(
              result.failedScheduledDrafts > 0
                ? `X disconnected. ${result.failedScheduledDrafts} scheduled publish${
                    result.failedScheduledDrafts === 1 ? "" : "es"
                  } stopped.`
                : "X disconnected."
            );
          } catch {
            toast.error("Couldn't disconnect X. Try again.");
          }
        });
      }}
    />
  );
}
