import { describe, expect, test } from "vitest";
import { hasEvalOperatorAccess } from "../shared/evalAuth";

describe("eval operator authorization", () => {
  test("fails closed for missing, unset, false, and demo users", () => {
    expect(hasEvalOperatorAccess(null)).toBe(false);
    expect(hasEvalOperatorAccess({})).toBe(false);
    expect(hasEvalOperatorAccess({ evalOperator: false })).toBe(false);
    expect(hasEvalOperatorAccess({ evalOperator: true, isDemo: true })).toBe(
      false
    );
  });

  test("allows only explicit non-demo operators", () => {
    expect(hasEvalOperatorAccess({ evalOperator: true })).toBe(true);
    expect(hasEvalOperatorAccess({ evalOperator: true, isDemo: false })).toBe(
      true
    );
  });
});
