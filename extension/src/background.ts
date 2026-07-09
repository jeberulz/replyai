/**
 * Service worker — opens the ReplyPilot deep link in a new tab.
 * No X DOM automation; no publish APIs.
 */

import {
  buildWorkbenchDeepLink,
  DEFAULT_APP_ORIGIN,
  normalizeAppOrigin,
} from "../../shared/extensionBadge";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== "object") return false;
  if (message.type !== "rp.openWorkbench") return false;

  const tweetUrl = typeof message.tweetUrl === "string" ? message.tweetUrl : "";
  void (async () => {
    const stored = await chrome.storage.sync.get("appOrigin");
    const appOrigin = normalizeAppOrigin(
      typeof stored.appOrigin === "string" ? stored.appOrigin : DEFAULT_APP_ORIGIN
    );
    const deepLink = buildWorkbenchDeepLink({ appOrigin, tweetUrl });
    if (!deepLink) {
      sendResponse({ ok: false, error: "Invalid tweet URL" });
      return;
    }
    await chrome.tabs.create({ url: deepLink });
    sendResponse({ ok: true, url: deepLink });
  })();

  return true; // async sendResponse
});
