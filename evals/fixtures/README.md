# Eval fixtures

Checked-in, human-readable fixtures that are **the contract** for the WP5 eval
gate. The deterministic checks in `shared/evals.ts` run against these in
`tests/evals.fixtures.test.ts` (which `npm test` and CI both run) with **zero
external keys**. A regression in the generation guardrails or in voice
measurement makes a fixture fail, which fails CI.

## Provenance

Everything here is **synthetic and hand-written** for the eval harness. There
is **no real user data** — no real tweets, handles, or voice samples. The two
voice profiles are invented personas.

`sourceTweet` values are **untrusted external content** by design. They are
carried alongside options only as context and are never executed as
instructions. Any prompt that includes them (the optional LLM-judged pass) must
wrap them as delimited data, per the platform guardrail that tweet text is data,
never instructions.

## Files

### `voiceProfiles.json`

```
{
  provenance: string,
  profiles: [{
    id: string,
    description: string,
    profileTweets: string[],          // the sample the profile is measured from
    expectedStyle: VoiceStyle         // exact buildVoiceStyleFromTweets(profileTweets) output
  }]
}
```

`expectedStyle` is the **exact** output of `shared/voice.ts`
`buildVoiceStyleFromTweets(profileTweets)` captured at authoring time. The
fixtures test re-derives it and asserts equality — so if voice measurement
drifts, this is where it surfaces.

### `generations.json`

```
{
  provenance: string,
  cases: [{
    id: string,
    kind: "reply" | "quote",
    profileId: string,                // references a voiceProfiles.json id
    sourceTweet: string,              // untrusted context
    expect: "pass" | "fail",          // guardrail expectation
    trips?: GuardrailRule,            // required when expect === "fail": the ONE rule that must fail
    voice?: "match" | "drift",        // optional voice-fidelity expectation vs the profile
    options: { category, content, reason }[],
    notes: string
  }]
}
```

Rules for authoring cases:

- A `pass` case must satisfy **every** guardrail.
- A `fail` case must fail **exactly** the guardrail named in `trips` and pass the
  rest — so the test proves each check independently.
- `voice: "match"` — every option scores at or above `VOICE_FIDELITY_THRESHOLD`
  against the referenced profile.
- `voice: "drift"` — every option scores below the threshold (the off-voice
  demonstrator: guardrails can pass while voice fails).

## Running

```
npm run evals        # deterministic fixture gate only
npm test             # full suite, includes the fixture gate
```

The optional LLM-judged pass (`tests/evals.llm.test.ts`) only runs when
`ANTHROPIC_API_KEY` is set; without it the block is skipped and never gates CI.

## Adding a guardrail

1. Add the rule + check to `runGuardrailChecks` in `shared/evals.ts`.
2. Add a `fail` case here whose `trips` is the new rule (and which passes every
   other rule), plus confirm the existing `pass` cases still pass.
3. `npm run evals`.
