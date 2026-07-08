import { describe, expect, it } from "vitest";
import { timingSafeEqual } from "../convex/users";

describe("timingSafeEqual", () => {
  it("matches equal strings", async () => {
    await expect(timingSafeEqual("shared-secret", "shared-secret")).resolves.toBe(
      true
    );
  });

  it("rejects mismatched strings, including differing lengths", async () => {
    await expect(timingSafeEqual("shared-secret", "wrong")).resolves.toBe(false);
    await expect(timingSafeEqual("shared-secret", "shared-secre")).resolves.toBe(
      false
    );
    await expect(timingSafeEqual("", "shared-secret")).resolves.toBe(false);
  });
});
