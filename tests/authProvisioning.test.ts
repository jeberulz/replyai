import { describe, expect, it } from "vitest";
import { verifyProvisioningSecret } from "../shared/authProvisioning";

describe("auth provisioning secret", () => {
  it("accepts a matching shared server secret", () => {
    expect(
      verifyProvisioningSecret({ expected: "server-secret", provided: "server-secret" })
    ).toEqual({ ok: true });
  });

  it("rejects missing and invalid caller secrets when configured", () => {
    expect(
      verifyProvisioningSecret({ expected: "server-secret", provided: "" })
    ).toEqual({ ok: false, reason: "missing_provided_secret" });
    expect(
      verifyProvisioningSecret({ expected: "server-secret", provided: "wrong" })
    ).toEqual({ ok: false, reason: "invalid_secret" });
  });

  it("fails closed when production requires a secret that is not configured", () => {
    expect(
      verifyProvisioningSecret({ expected: "", provided: "anything", requireWhenMissing: true })
    ).toEqual({ ok: false, reason: "missing_expected_secret" });
  });
});
