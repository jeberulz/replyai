import { describe, expect, it } from "vitest";
import { navLinks, visibleNavLinks } from "../src/components/app/sidebar/nav-links";

describe("eval nav visibility", () => {
  it("keeps the evals route out of regular signed-in navigation", () => {
    expect(navLinks.find((link) => link.href === "/evals")).toMatchObject({
      requiresEvalOperator: true,
    });

    expect(
      visibleNavLinks({ evalOperator: false }).map((link) => link.href)
    ).not.toContain("/evals");
    expect(visibleNavLinks({}).map((link) => link.href)).not.toContain("/evals");
  });

  it("shows evals navigation for internal eval operators", () => {
    expect(
      visibleNavLinks({ evalOperator: true }).map((link) => link.href)
    ).toContain("/evals");
  });
});
