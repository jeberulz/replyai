import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("security audit script", () => {
  it("passes on the committed Convex auth/token surface", () => {
    const output = execFileSync(process.execPath, ["scripts/security-audit.mjs"], {
      encoding: "utf8",
    });

    expect(output).toContain("Security audit passed");
    expect(output).toContain("public Convex functions checked");
  }, 15_000);
});
