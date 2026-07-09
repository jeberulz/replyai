"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ds/button";
import { Text } from "@/components/ds/text";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function subscribeStandalone(onStoreChange: () => void): () => void {
  const mq = window.matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", onStoreChange);
  window.addEventListener("appinstalled", onStoreChange);
  return () => {
    mq.removeEventListener("change", onStoreChange);
    window.removeEventListener("appinstalled", onStoreChange);
  };
}

function getStandaloneSnapshot(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

/**
 * Optional install hint (WP15-S5). Uses beforeinstallprompt when available;
 * otherwise shows manual Add-to-Home-Screen copy.
 */
export function InstallAppCard() {
  const installed = useSyncExternalStore(
    subscribeStandalone,
    getStandaloneSnapshot,
    () => false
  );
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (installed) return;

    const onBip = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
    };
  }, [installed]);

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
