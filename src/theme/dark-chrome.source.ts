/**
 * Dark Chrome theme for Astryx — brand lock from design.md.
 *
 * Extends Neutral as a scaffold only. Visual truth is ReplyPilot Dark Chrome:
 * orange accent, charcoal surfaces, border elevation, Instrument Serif headings.
 * Do not ship stock Neutral aesthetics.
 *
 * Rebuild after edits:
 *   npm run astryx:theme
 * (requires Node >=22.13 for the Astryx CLI; source is this file)
 */

import { defineTheme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral";

export const darkChromeTheme = defineTheme({
  name: "dark-chrome",
  extends: neutralTheme,

  color: {
    accent: "#ff4400",
    neutralStyle: "warm",
    contrast: "standard",
  },

  typography: {
    scale: { base: 14, ratio: 1.2 },
    body: {
      family: "Inter",
      fallbacks: "var(--font-inter), system-ui, sans-serif",
    },
    heading: {
      family: "Instrument Serif",
      fallbacks: "var(--font-instrument-serif), Georgia, serif",
      // Instrument Serif ships weight 400 only — avoid synthetic bold.
      weights: { 1: "400", 2: "400", 3: "400", 4: "400", 5: "400", 6: "400" },
    },
    code: {
      family: "Geist Mono",
      fallbacks: "var(--font-geist-mono), ui-monospace, monospace",
    },
  },

  // Slightly tighter than Neutral defaults; matches design.md 0.5rem system.
  radius: { base: 4, multiplier: 1 },

  motion: { fast: 150, medium: 300, ratio: 0.75 },

  tokens: {
    // Surfaces — Dark Chrome charcoal ladder (light tuple unused; app is dark-only).
    "--color-background-body": ["#181818", "#181818"],
    "--color-background-surface": ["#1a1a1a", "#1a1a1a"],
    "--color-background-card": ["#232323", "#232323"],
    "--color-background-popover": ["#2e2e2e", "#2e2e2e"],
    "--color-background-muted": ["#282828", "#282828"],
    "--color-background-inverted": ["#000000", "#000000"],

    "--color-text-primary": ["#fafafa", "#fafafa"],
    "--color-text-secondary": ["#a1a1aa", "#a1a1aa"],
    "--color-text-disabled": ["#71717a", "#71717a"],
    "--color-text-accent": ["#ff4400", "#ff4400"],

    "--color-border": ["#353535", "#353535"],
    "--color-border-emphasized": ["#52525b", "#52525b"],

    "--color-accent": ["#ff4400", "#ff4400"],
    "--color-on-accent": ["#fafafa", "#fafafa"],
    "--color-accent-muted": [
      "color-mix(in oklab, #ff4400 18%, transparent)",
      "color-mix(in oklab, #ff4400 18%, transparent)",
    ],

    "--color-error": ["#c25b54", "#c25b54"],
    "--color-error-muted": [
      "color-mix(in oklab, #c25b54 18%, transparent)",
      "color-mix(in oklab, #c25b54 18%, transparent)",
    ],
    "--color-success": ["oklch(0.696 0.17 149)", "oklch(0.696 0.17 149)"],
    "--color-success-muted": [
      "color-mix(in oklab, oklch(0.696 0.17 149) 18%, transparent)",
      "color-mix(in oklab, oklch(0.696 0.17 149) 18%, transparent)",
    ],
    "--color-warning": ["oklch(0.769 0.162 76)", "oklch(0.769 0.162 76)"],
    "--color-warning-muted": [
      "color-mix(in oklab, oklch(0.769 0.162 76) 18%, transparent)",
      "color-mix(in oklab, oklch(0.769 0.162 76) 18%, transparent)",
    ],

    // Border elevation — suppress Neutral's card/popover shadow lift.
    "--shadow-low": ["none", "none"],
    "--shadow-med": ["0 1px 2px #00000026", "0 1px 2px #00000026"],
    "--shadow-high": ["0 1px 2px #00000026", "0 1px 2px #00000026"],
  },

  components: {
    card: {
      base: {
        boxShadow: "none",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "var(--color-border)",
        backgroundColor: "var(--color-background-card)",
      },
    },
    button: {
      base: {
        borderRadius: "6px",
      },
      "variant:primary": {
        backgroundColor: "var(--color-accent)",
        color: "var(--color-on-accent)",
      },
    },
    banner: {
      base: {
        borderRadius: "8px",
      },
    },
  },
});
