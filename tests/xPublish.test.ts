import { describe, expect, it } from "vitest";
import {
  buildTweetPermalink,
  buildXIntentUrl,
  composeQuotePostText,
} from "../shared/xPublish";

describe("buildTweetPermalink", () => {
  it("builds canonical URL from handle and id", () => {
    expect(buildTweetPermalink("sarahbuilds", "1800000000000000001")).toBe(
      "https://x.com/sarahbuilds/status/1800000000000000001"
    );
  });

  it("strips leading @ from handle", () => {
    expect(buildTweetPermalink("@sarahbuilds", "123")).toBe(
      "https://x.com/sarahbuilds/status/123"
    );
  });
});

describe("composeQuotePostText", () => {
  it("appends permalink on new line", () => {
    const url = "https://x.com/user/status/123";
    expect(composeQuotePostText("Hot take", url)).toBe(`Hot take\n${url}`);
  });

  it("returns permalink only when text is empty", () => {
    const url = "https://x.com/user/status/123";
    expect(composeQuotePostText("", url)).toBe(url);
  });

  it("truncates text to fit 280 chars with permalink", () => {
    const url = "https://x.com/user/status/1234567890123456789";
    const longText = "x".repeat(300);
    const result = composeQuotePostText(longText, url);
    expect(result.length).toBeLessThanOrEqual(280);
    expect(result.endsWith(url)).toBe(true);
  });
});

describe("buildXIntentUrl", () => {
  it("builds intent URL with text", () => {
    const url = buildXIntentUrl({ text: "Hello world" });
    expect(url).toContain("x.com/intent/tweet");
    expect(url).toContain("text=Hello");
  });

  it("includes in_reply_to when provided", () => {
    const url = buildXIntentUrl({ text: "Reply", inReplyTo: "999" });
    expect(url).toContain("in_reply_to=999");
  });
});
