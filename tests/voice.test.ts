import { describe, expect, it } from "vitest";
import { buildVoiceStyleFromTweets, topPhrases } from "../shared/voice";

describe("buildVoiceStyleFromTweets", () => {
  it("returns sensible defaults for empty input", () => {
    const style = buildVoiceStyleFromTweets([]);
    expect(style.tone).toContain("conversational");
    expect(style.emojiUse).toBe("none");
    expect(style.commonPhrases).toEqual([]);
  });

  it("detects emoji-heavy writing", () => {
    const style = buildVoiceStyleFromTweets([
      "Shipped it 🚀🔥",
      "Big day 🎉",
      "Let's go 💪🚀",
    ]);
    expect(style.emojiUse).toBe("frequent");
  });

  it("detects short punchy sentences", () => {
    const style = buildVoiceStyleFromTweets([
      "Ship fast. Learn faster.",
      "Talk to users. Build less.",
    ]);
    expect(style.sentenceLength).toBe("short and punchy");
  });

  it("detects contrarian, data-driven tone", () => {
    const style = buildVoiceStyleFromTweets([
      "Hot take: everyone is wrong about this. The data says 73% churn.",
      "Unpopular opinion: your 10x metric is survivorship bias.",
    ]);
    expect(style.tone).toContain("contrarian");
  });

  it("surfaces repeated phrases", () => {
    const tweets = Array(4).fill("the real question is whether you shipped today");
    const style = buildVoiceStyleFromTweets(tweets);
    expect(style.commonPhrases.length).toBeGreaterThan(0);
  });
});

describe("topPhrases", () => {
  it("ignores pure stop-word phrases", () => {
    const phrases = topPhrases(Array(5).fill("this is the and of the"));
    expect(phrases).toEqual([]);
  });

  it("requires at least 3 occurrences", () => {
    const phrases = topPhrases(["ship fast daily", "ship fast daily"]);
    expect(phrases).toEqual([]);
  });
});
