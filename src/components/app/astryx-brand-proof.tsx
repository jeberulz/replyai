"use client";

/**
 * WP24 brand-lock proof — low-risk Astryx Banner in the app shell.
 * Confirms accent orange, charcoal surface tokens, and Theme wiring.
 * Remove or replace once WP25 adapters land real call sites.
 */

import { Banner } from "@/components/ds/banner";

export function AstryxBrandProof() {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <div className="mb-4" data-testid="astryx-brand-proof">
      <Banner
        status="info"
        title="Dark Chrome × Astryx"
        description="Foundation proof (dev only): accent, surfaces, and Theme are wired. Landing stays off Astryx."
      />
    </div>
  );
}
