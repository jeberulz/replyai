import { describe, expect, it } from "vitest";

import { resolveBuild } from "../scripts/vercel-build.mjs";

const PROD_KEY = "prod:calculating-mandrill-742|token";
const PREVIEW_KEY = "preview:replyai|token";

describe("vercel build command resolution", () => {
  it("deploys Convex on production builds", () => {
    const { command, args, mode } = resolveBuild({
      VERCEL_ENV: "production",
      CONVEX_DEPLOY_KEY: PROD_KEY,
    });

    expect(mode).toBe("production-convex-deploy");
    expect(command).toBe("npx");
    expect(args).toEqual([
      "convex",
      "deploy",
      "--cmd",
      "npm run build",
      "--cmd-url-env-var-name",
      "NEXT_PUBLIC_CONVEX_URL",
    ]);
  });

  // The regression this whole change exists for: a production deploy key is
  // scoped to Preview as well, and Convex refuses to run a production deploy
  // from a non-production build environment.
  it("does not run a Convex deploy on a preview build holding a production key", () => {
    const { command, args, mode } = resolveBuild({
      VERCEL_ENV: "preview",
      CONVEX_DEPLOY_KEY: PROD_KEY,
    });

    expect(mode).toBe("next-build-only");
    expect(command).toBe("npm");
    expect(args).toEqual(["run", "build"]);
    expect(args).not.toContain("deploy");
  });

  it("creates a per-branch Convex preview deployment when given a preview key", () => {
    const { command, args, mode } = resolveBuild({
      VERCEL_ENV: "preview",
      CONVEX_DEPLOY_KEY: PREVIEW_KEY,
      VERCEL_GIT_COMMIT_REF: "feat/some-branch",
    });

    expect(mode).toBe("preview-convex-deploy");
    expect(command).toBe("npx");
    expect(args.slice(-2)).toEqual(["--preview-create", "feat/some-branch"]);
  });

  it("falls back to a stable preview name when the branch ref is missing", () => {
    for (const ref of [undefined, "", "   "]) {
      const { args } = resolveBuild({
        VERCEL_ENV: "preview",
        CONVEX_DEPLOY_KEY: PREVIEW_KEY,
        VERCEL_GIT_COMMIT_REF: ref,
      });
      expect(args.slice(-2)).toEqual(["--preview-create", "preview"]);
    }
  });

  it("builds the app only when no deploy key is present at all", () => {
    expect(resolveBuild({ VERCEL_ENV: "preview" }).mode).toBe("next-build-only");
    expect(resolveBuild({}).mode).toBe("next-build-only");
  });

  it("only treats an exact production environment as production", () => {
    for (const env of ["development", "preview", "Production", ""]) {
      expect(
        resolveBuild({ VERCEL_ENV: env, CONVEX_DEPLOY_KEY: PROD_KEY }).mode,
      ).toBe("next-build-only");
    }
  });
});
