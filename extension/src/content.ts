/**
 * Content script — read-only score badge on x.com status pages.
 * Never mutates the composer, never clicks reply/post, never injects text.
 */

import {
  buildWorkbenchDeepLink,
  scoreFromPageMetrics,
  tweetIdFromLocation,
} from "../../shared/extensionBadge";
import { scrapePageMetrics } from "./domMetrics";

const ROOT_ID = "replypilot-ext-root";
let lastTweetId: string | null = null;
let dismissedFor: string | null = null;
let refreshTimer: number | null = null;

function scoreTier(value: number): "high" | "mid" | "low" {
  if (value >= 70) return "high";
  if (value >= 45) return "mid";
  return "low";
}

function removeBadge(): void {
  document.getElementById(ROOT_ID)?.remove();
}

function ensureRoot(): HTMLElement {
  let root = document.getElementById(ROOT_ID);
  if (root) return root;
  root = document.createElement("div");
  root.id = ROOT_ID;
  root.className = "rp-ext-root";
  root.setAttribute("data-rp-ext", "1");
  document.documentElement.appendChild(root);
  return root;
}

function renderBadge(tweetId: string, tweetUrl: string): void {
  if (dismissedFor === tweetId) {
    removeBadge();
    return;
  }

  const metrics = scrapePageMetrics(tweetId);
  const score = scoreFromPageMetrics(metrics);
  const root = ensureRoot();
  root.replaceChildren();

  const badge = document.createElement("div");
  badge.className = "rp-ext-badge";
  badge.setAttribute("role", "complementary");
  badge.setAttribute("aria-label", "ReplyPilot conversation score");

  const copy = document.createElement("div");
  const brand = document.createElement("p");
  brand.className = "rp-ext-brand";
  brand.textContent = "ReplyPilot";
  const scoreEl = document.createElement("p");
  scoreEl.className = "rp-ext-score";
  scoreEl.dataset.tier = scoreTier(score.value);
  scoreEl.textContent = `${score.value}/100`;
  const reason = document.createElement("p");
  reason.className = "rp-ext-reason";
  reason.textContent = score.reason;
  copy.append(brand, scoreEl, reason);

  const actions = document.createElement("div");
  actions.className = "rp-ext-actions";

  const openBtn = document.createElement("button");
  openBtn.type = "button";
  openBtn.className = "rp-ext-btn";
  openBtn.textContent = "Analyze";
  openBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    // Prefer background tab open (has storage for app origin). Fallback: direct link.
    chrome.runtime.sendMessage(
      { type: "rp.openWorkbench", tweetUrl },
      (response: { ok?: boolean } | undefined) => {
        if (chrome.runtime.lastError || !response?.ok) {
          const fallback = buildWorkbenchDeepLink({ tweetUrl });
          if (fallback) window.open(fallback, "_blank", "noopener,noreferrer");
        }
      }
    );
  });

  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.className = "rp-ext-dismiss";
  dismiss.textContent = "Dismiss";
  dismiss.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    dismissedFor = tweetId;
    removeBadge();
  });

  actions.append(openBtn, dismiss);
  badge.append(copy, actions);
  root.append(badge);
}

function syncForLocation(): void {
  const href = window.location.href;
  const tweetId = tweetIdFromLocation(href);
  if (!tweetId) {
    lastTweetId = null;
    removeBadge();
    return;
  }

  const tweetUrl = `https://x.com/i/web/status/${tweetId}`;
  const changed = tweetId !== lastTweetId;
  lastTweetId = tweetId;
  if (changed) dismissedFor = null;

  // X hydrates metrics asynchronously — render now, refresh shortly.
  renderBadge(tweetId, tweetUrl);
  if (refreshTimer !== null) window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => {
    if (lastTweetId === tweetId) renderBadge(tweetId, tweetUrl);
  }, 1200);
}

function installSpaHooks(): void {
  const pushState = history.pushState.bind(history);
  const replaceState = history.replaceState.bind(history);
  history.pushState = (...args) => {
    pushState(...args);
    queueMicrotask(syncForLocation);
  };
  history.replaceState = (...args) => {
    replaceState(...args);
    queueMicrotask(syncForLocation);
  };
  window.addEventListener("popstate", () => syncForLocation());

  // Re-scrape when X hydrates the tweet article — ignore our own badge DOM.
  const observer = new MutationObserver((mutations) => {
    if (!lastTweetId) return;
    const relevant = mutations.some((m) => {
      const node = m.target instanceof Node ? m.target : null;
      if (!node) return false;
      const el =
        node.nodeType === Node.ELEMENT_NODE
          ? (node as Element)
          : node.parentElement;
      if (!el) return false;
      if (el.closest(`#${ROOT_ID}`)) return false;
      return Boolean(
        el.closest('article[data-testid="tweet"]') ||
          el.getAttribute?.("data-testid") === "tweet"
      );
    });
    if (!relevant) return;
    if (refreshTimer !== null) window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => syncForLocation(), 800);
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

installSpaHooks();
syncForLocation();
