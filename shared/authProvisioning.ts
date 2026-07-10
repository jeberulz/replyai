export type ProvisioningSecretDecision =
  | { ok: true }
  | { ok: false; reason: "missing_expected_secret" | "missing_provided_secret" | "invalid_secret" };

export function verifyProvisioningSecret(input: {
  expected?: string | null;
  provided?: string | null;
  requireWhenMissing?: boolean;
}): ProvisioningSecretDecision {
  const expected = input.expected?.trim() ?? "";
  const provided = input.provided?.trim() ?? "";

  if (!expected) {
    return input.requireWhenMissing ? { ok: false, reason: "missing_expected_secret" } : { ok: true };
  }
  if (!provided) return { ok: false, reason: "missing_provided_secret" };
  if (provided !== expected) return { ok: false, reason: "invalid_secret" };
  return { ok: true };
}
