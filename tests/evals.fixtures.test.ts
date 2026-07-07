import { describe, expect, it } from "vitest";
import { buildVoiceStyleFromTweets, type VoiceStyle } from "../shared/voice";
import {
  failedRules,
  runGuardrailChecks,
  voiceFidelity,
  VOICE_FIDELITY_THRESHOLD,
  type EvalOption,
  type GuardrailKind,
  type GuardrailRule,
} from "../shared/evals";
import voiceProfilesFixture from "../evals/fixtures/voiceProfiles.json";
import generationsFixture from "../evals/fixtures/generations.json";

type ProfileFixture = {
  id: string;
  description: string;
  profileTweets: string[];
  expectedStyle: VoiceStyle;
};

type GenerationCase = {
  id: string;
  kind: GuardrailKind;
  profileId: string;
  sourceTweet: string;
  expect: "pass" | "fail";
  trips?: GuardrailRule;
  voice?: "match" | "drift";
  options: EvalOption[];
  notes: string;
};

const profiles = (voiceProfilesFixture as { profiles: ProfileFixture[] }).profiles;
const cases = (generationsFixture as { cases: GenerationCase[] }).cases;
const profileById = new Map(profiles.map((p) => [p.id, p]));

describe("eval fixtures — sanity", () => {
  it("has profiles and cases", () => {
    expect(profiles.length).toBeGreaterThan(0);
    expect(cases.length).toBeGreaterThan(0);
  });

  it("every generation case references a known profile", () => {
    for (const c of cases) {
      expect(profileById.has(c.profileId), `${c.id} → ${c.profileId}`).toBe(true);
    }
  });

  it("every fail case names the guardrail it should trip", () => {
    for (const c of cases) {
      if (c.expect === "fail") {
        expect(c.trips, `${c.id} needs a 'trips' rule`).toBeTruthy();
      }
    }
  });
});

describe("voice measurement regression lock", () => {
  for (const profile of profiles) {
    it(`re-measures "${profile.id}" to its stored expectedStyle`, () => {
      const measured = buildVoiceStyleFromTweets(profile.profileTweets);
      expect(measured).toEqual(profile.expectedStyle);
    });
  }
});

describe("guardrail gate", () => {
  for (const c of cases) {
    it(`${c.id} — expect ${c.expect}`, () => {
      const report = runGuardrailChecks(c.options, { kind: c.kind });
      if (c.expect === "pass") {
        expect(report.pass, JSON.stringify(failedRules(report))).toBe(true);
      } else {
        expect(report.pass).toBe(false);
        // A fail case must trip EXACTLY the one guardrail it targets.
        expect(failedRules(report)).toEqual([c.trips]);
      }
    });
  }
});

describe("voice-fidelity gate", () => {
  for (const c of cases) {
    if (!c.voice) continue;
    const profile = profileById.get(c.profileId);
    it(`${c.id} — voice ${c.voice}`, () => {
      expect(profile).toBeDefined();
      const target = (profile as ProfileFixture).expectedStyle;
      const scores = c.options.map((o) => voiceFidelity(o.content, target));
      if (c.voice === "match") {
        for (const s of scores) expect(s).toBeGreaterThanOrEqual(VOICE_FIDELITY_THRESHOLD);
      } else {
        for (const s of scores) expect(s).toBeLessThan(VOICE_FIDELITY_THRESHOLD);
      }
    });
  }
});
