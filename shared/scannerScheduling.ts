export function backgroundScannerEnabled(input: {
  enabled: boolean;
  isDemo: boolean;
}): boolean {
  return input.enabled && !input.isDemo;
}

export function backgroundScannerDispatchEligible(input: {
  enabled: boolean;
  backgroundEnabled?: boolean;
  isDemo: boolean;
  hasAccess: boolean;
}): boolean {
  const backgroundEnabled =
    input.backgroundEnabled ??
    backgroundScannerEnabled({
      enabled: input.enabled,
      isDemo: input.isDemo,
    });
  return (
    input.enabled &&
    backgroundEnabled &&
    !input.isDemo &&
    input.hasAccess
  );
}
