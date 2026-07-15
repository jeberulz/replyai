export function backgroundScannerEnabled(input: {
  enabled: boolean;
  isDemo: boolean;
}): boolean {
  return input.enabled && !input.isDemo;
}
