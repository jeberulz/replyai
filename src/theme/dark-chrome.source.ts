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
    // Generated scale is overridden below so Dark Chrome app surfaces land on
    // exact product UI sizes: 12px meta, 14px controls/supporting, 16px body.
    scale: { base: 16, ratio: 1.2 },
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
    // App typography scale. Keep exact values here; ratio-only generation made
    // Astryx text-base 14px, text-sm 12px, and text-xs 10px.
    "--font-size-4xs": "0.5rem", // 8px
    "--font-size-3xs": "0.5625rem", // 9px
    "--font-size-2xs": "0.6875rem", // 11px
    "--font-size-xs": "0.75rem", // 12px
    "--font-size-sm": "0.875rem", // 14px
    "--font-size-base": "1rem", // 16px
    "--font-size-lg": "1.125rem", // 18px
    "--font-size-xl": "1.5rem", // 24px
    "--font-size-2xl": "2rem", // 32px
    "--font-size-3xl": "2.5rem",
    "--font-size-4xl": "3rem",
    "--font-size-5xl": "3.75rem",

    "--text-heading-1-size": "var(--font-size-2xl)",
    "--text-heading-1-leading": "1.15",
    "--text-heading-2-size": "var(--font-size-xl)",
    "--text-heading-2-leading": "1.25",
    "--text-heading-3-size": "var(--font-size-lg)",
    "--text-heading-3-weight": "var(--font-weight-semibold)",
    "--text-heading-3-leading": "1.3333",
    "--text-heading-4-size": "var(--font-size-base)",
    "--text-heading-4-weight": "var(--font-weight-semibold)",
    "--text-heading-4-leading": "1.35",
    "--text-heading-5-size": "var(--font-size-sm)",
    "--text-heading-5-weight": "var(--font-weight-semibold)",
    "--text-heading-5-leading": "1.4286",
    "--text-heading-6-size": "var(--font-size-xs)",
    "--text-heading-6-weight": "var(--font-weight-semibold)",
    "--text-heading-6-leading": "1.3333",
    "--text-body-size": "var(--font-size-base)",
    "--text-body-leading": "1.5",
    "--text-large-size": "var(--font-size-lg)",
    "--text-large-leading": "1.3333",
    "--text-label-size": "var(--font-size-sm)",
    "--text-label-weight": "var(--font-weight-medium)",
    "--text-label-leading": "1.4286",
    "--text-code-size": "0.8125rem",
    "--text-code-leading": "1.3846",
    "--text-supporting-size": "var(--font-size-sm)",
    "--text-supporting-leading": "1.5",
    "--text-display-1-size": "var(--font-size-5xl)",
    "--text-display-1-leading": "1.1",
    "--text-display-2-size": "var(--font-size-4xl)",
    "--text-display-2-leading": "1.1",
    "--text-display-3-size": "var(--font-size-3xl)",
    "--text-display-3-leading": "1.15",

    // Surfaces — Dark Chrome charcoal ladder. Plain strings, not [light, dark]
    // tuples: tuples compile to light-dark(), which is color-only CSS and
    // invalid on font-size/line-height/shadow tokens (app is dark-only anyway).
    "--color-background-body": "#181818",
    "--color-background-surface": "#1a1a1a",
    "--color-background-card": "#232323",
    "--color-background-popover": "#2e2e2e",
    "--color-background-muted": "#282828",
    "--color-background-inverted": "#000000",

    "--color-text-primary": "#fafafa",
    "--color-text-secondary": "#a1a1aa",
    "--color-text-disabled": "#71717a",
    "--color-text-accent": "#ff4400",

    "--color-border": "#353535",
    "--color-border-emphasized": "#52525b",

    "--color-accent": "#ff4400",
    "--color-on-accent": "#fafafa",
    "--color-accent-muted": "color-mix(in oklab, #ff4400 18%, transparent)",

    "--color-error": "#c25b54",
    "--color-error-muted": "color-mix(in oklab, #c25b54 18%, transparent)",
    "--color-success": "oklch(0.696 0.17 149)",
    "--color-success-muted": "color-mix(in oklab, oklch(0.696 0.17 149) 18%, transparent)",
    "--color-warning": "oklch(0.769 0.162 76)",
    "--color-warning-muted": "color-mix(in oklab, oklch(0.769 0.162 76) 18%, transparent)",

    // Border elevation — suppress Neutral's card/popover shadow lift.
    "--shadow-low": "none",
    "--shadow-med": "0 1px 2px #00000026",
    "--shadow-high": "0 1px 2px #00000026",
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
