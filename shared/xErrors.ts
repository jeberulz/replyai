export type XPublishErrorCode =
  | "reply_restricted"
  | "quote_restricted"
  | "token_expired"
  | "rate_limit"
  | "unknown";

export function parseXPublishError(
  status: number,
  body: string
): {
  code: XPublishErrorCode;
  message: string;
  canFallbackStandalone: boolean;
} {
  const detail = extractDetail(body);
  const lower = detail.toLowerCase();

  if (status === 403) {
    if (lower.includes("reply to this conversation is not allowed")) {
      return {
        code: "reply_restricted",
        message:
          "X blocked the API reply (standard tiers require the author to mention you first). Use Reply on X or post standalone.",
        canFallbackStandalone: true,
      };
    }
    if (lower.includes("quoting this post is not allowed")) {
      return {
        code: "quote_restricted",
        message:
          "Native API quote blocked — we retried with a link card when possible. Use Quote on X if it still fails.",
        canFallbackStandalone: true,
      };
    }
  }

  if (status === 401) {
    return {
      code: "token_expired",
      message: "X session expired. Reconnect your account in Settings.",
      canFallbackStandalone: false,
    };
  }

  if (status === 429) {
    return {
      code: "rate_limit",
      message: "X rate limit hit. Wait a few minutes and try again.",
      canFallbackStandalone: false,
    };
  }

  return {
    code: "unknown",
    message: detail ? `X API ${status}: ${detail}` : `X API ${status}: publish failed`,
    canFallbackStandalone: false,
  };
}

function extractDetail(body: string): string {
  try {
    const json = JSON.parse(body) as {
      detail?: string;
      errors?: Array<{ detail?: string }>;
    };
    if (json.detail) return json.detail;
    if (json.errors?.[0]?.detail) return json.errors[0].detail!;
  } catch {
    // body may not be JSON
  }
  return body.slice(0, 200);
}

const REPLY_SETTINGS_LABELS: Record<string, string> = {
  mentionedUsers: "mentioned users only",
  following: "accounts they follow",
  followers: "their followers",
  subscribers: "subscribers only",
  verified: "verified accounts only",
  other: "restricted accounts",
};

export function formatReplySettings(settings: string | undefined): string | null {
  if (!settings || settings === "everyone") return null;
  return REPLY_SETTINGS_LABELS[settings] ?? settings;
}

/** Author-level reply setting on x.com (separate from X API anti-spam rules). */
export function replySettingsWarning(settings: string | undefined): string | null {
  const label = formatReplySettings(settings);
  if (!label) return null;
  return `On x.com, this author limits replies to ${label}. That is separate from X API rules — threaded replies from the app may still need Reply on X.`;
}

/** Shown on analysis pages when a tweet URL/ID is available for publishing. */
export function apiPublishLimitationNotice(): string {
  return "Quotes publish via API with the tweet linked (quote card on your timeline). Replies try the API first; if X blocks threading, use Reply on X to finish in the X compose window.";
}
