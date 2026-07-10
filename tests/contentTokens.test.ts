import { describe, expect, it } from "vitest";
import {
  isStrongContentToken,
  sanitizeKeywordList,
  strongContentTokens,
} from "../shared/contentTokens";

describe("content token hygiene", () => {
  it("filters audited weak labels and onboarding keywords", () => {
    for (const token of ["not", "all", "because", "get", "Deleted", "Everyone", "building"]) {
      expect(isStrongContentToken(token), token).toBe(false);
    }

    expect(strongContentTokens("Deleted 200 lines because everyone said get building")).toEqual([
      "lines",
      "said",
    ]);
    expect(
      sanitizeKeywordList(["not", "AI agents", "everyone", "SaaS"], 4)
    ).toEqual(["ai agents", "saas"]);
  });
});
