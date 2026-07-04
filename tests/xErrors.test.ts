import { describe, expect, it } from "vitest";
import {
  parseXPublishError,
  replySettingsWarning,
} from "../shared/xErrors";

describe("parseXPublishError", () => {
  it("parses reply restriction 403", () => {
    const body = JSON.stringify({
      detail:
        "Reply to this conversation is not allowed because you have not been mentioned or otherwise engaged by the author of the post you are replying to.",
      status: 403,
    });
    const result = parseXPublishError(403, body);
    expect(result.code).toBe("reply_restricted");
    expect(result.canFallbackStandalone).toBe(true);
    expect(result.message).toContain("Reply on X");
  });

  it("parses quote restriction 403", () => {
    const body = JSON.stringify({
      detail:
        "Quoting this post is not allowed because you have not been mentioned or are not part of the conversation thread of the post you are quoting.",
      status: 403,
    });
    const result = parseXPublishError(403, body);
    expect(result.code).toBe("quote_restricted");
    expect(result.canFallbackStandalone).toBe(true);
  });

  it("parses 401 as token expired", () => {
    const result = parseXPublishError(401, '{"detail":"Unauthorized"}');
    expect(result.code).toBe("token_expired");
  });
});

describe("replySettingsWarning", () => {
  it("returns null for everyone", () => {
    expect(replySettingsWarning("everyone")).toBeNull();
    expect(replySettingsWarning(undefined)).toBeNull();
  });

  it("warns for restricted settings", () => {
    const msg = replySettingsWarning("following");
    expect(msg).toContain("accounts they follow");
    expect(msg).toContain("Reply on X");
  });
});
