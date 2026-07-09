"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ds/button";
import { Text } from "@/components/ds/text";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

/**
 * Optional install hint (WP15-S5). Uses beforeinstallprompt when available;
 * otherwise shows manual Add-to-Home-Screen copy.
 */
export function InstallAppCard() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [installed, setInstalled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      ("standalone" in navigator &&
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    if (standalone) {
      setInstalled(true);
      return;
    }

    const onBip = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      setMessage("Installed");
    };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) {
    return (
      <Text type="supporting" color="secondary" display="block">
        ReplyPilot is installed as an app on this device.
      </Text>
    );
  }

  return (
    <div className="space-y-3">
      <Text type="supporting" color="secondary" display="block">
        Install ReplyPilot for a standalone window and offline draft saves.
        Publishing still needs a network connection and an explicit click —
        nothing auto-posts.
      </Text>
      {deferred ? (
        <Button
          variant="secondary"
          label="Install app"
          icon={<Download className="size-3.5" />}
          onClick={() => {
            void (async () => {
              await deferred.prompt();
              const choice = await deferred.userChoice;
              setDeferred(null);
              setMessage(
                choice.outcome === "accepted"
                  ? "Install started"
                  : "Install dismissed"
              );
            })();
          }}
        />
      ) : (
        <Text type="supporting" color="secondary" display="block">
          Use your browser menu → Install app / Add to Home Screen. Requires
          HTTPS (or localhost) and the ReplyPilot service worker.
        </Text>
      )}
      {message ? (
        <Text type="supporting" color="secondary" display="block">
          {message}
        </Text>
      ) : null}
    </div>
  );
}
