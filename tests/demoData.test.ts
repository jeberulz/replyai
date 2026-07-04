import { describe, expect, it } from "vitest";
import { DEMO_TWEETS, demoTweetForId } from "../shared/demoData";

describe("demoTweetForId", () => {
  it("returns the exact demo tweet when the id matches", () => {
    const tweet = demoTweetForId(DEMO_TWEETS[0].id);
    expect(tweet.id).toBe(DEMO_TWEETS[0].id);
  });

  it("is deterministic for arbitrary ids", () => {
    const a = demoTweetForId("1234567890123456789");
    const b = demoTweetForId("1234567890123456789");
    expect(a.id).toBe(b.id);
  });

  it("always returns a valid tweet", () => {
    for (const id of ["1", "99999999", "424242424242"]) {
      const tweet = demoTweetForId(id);
      expect(tweet.text.length).toBeGreaterThan(0);
      expect(tweet.authorFollowers).toBeGreaterThan(0);
    }
  });
});
