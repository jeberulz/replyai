"use client";

/**
 * App-shell Theme provider — Dark Chrome via built Astryx theme.
 * Mount only under (app) / (onboarding). Never on the marketing landing.
 */

import { Theme } from "@astryxdesign/core/theme";
import { darkChromeTheme } from "@/theme/dark-chrome";

export function AstryxThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Theme wrapper is display:contents; keep a real flex child so body
  // (flex-col) + app shell (min-h-screen) don't collapse before hydrate.
  return (
    <Theme theme={darkChromeTheme} mode="dark">
      <div className="flex min-h-full flex-1 flex-col">{children}</div>
    </Theme>
  );
}
