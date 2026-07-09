import { describe, expect, it } from "vitest";
import { demoComposeBundle, demoTopicClusters } from "../shared/compose";
import { generateComposeOptions } from "../src/lib/ai";

describe("compose demo generation path", () => {
  it("generateComposeOptions returns 3 options per format without a key", async () => {
    const cluster = demoTopicClusters()[0];
    for (const format of ["standalone", "thread", "longform"] as const) {
      const result = await generateComposeOptions({
        cluster,
        format,
        voice: null,
        voiceExamples: [],
      });
      expect(result.demo).toBe(true);
      expect(result.bundle.format).toBe(format);
      const options =
        format === "standalone"
          ? result.bundle.standalone
          : format === "thread"
            ? result.bundle.thread
            : result.bundle.longform;
      expect(options).toHaveLength(3);
      for (const opt of options) {
        expect(opt.reason.length).toBeGreaterThan(0);
        expect(opt.reason).not.toMatch(/\d{2}%/);
      }
    }
  });

  it("demoComposeBundle matches generateComposeOptions demo output shape", () => {
    const cluster = demoTopicClusters()[0];
    const bundle = demoComposeBundle(cluster, "thread");
    expect(bundle.thread[0].posts.length).toBeGreaterThanOrEqual(4);
  });
});
