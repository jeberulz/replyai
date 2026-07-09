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
  return (
    <Theme theme={darkChromeTheme} mode="dark">
      {children}
    </Theme>
  );
}
