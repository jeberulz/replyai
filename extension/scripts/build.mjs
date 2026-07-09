import * as esbuild from "esbuild";
import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Minimal solid placeholder PNGs (16 / 48).
const ICON_16_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAFUlEQVR42mP8z8BQz0BFwzBqGAVDAQC+WwMFq0nVWwAAAABJRU5ErkJggg==";
const ICON_48_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAFUlEQVR42mP8z8BQz0BFwzBqGAVDAQC+WwMFq0nVWwAAAABJRU5ErkJggg==";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dist = join(root, "dist");

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

await esbuild.build({
  entryPoints: {
    content: join(root, "src/content.ts"),
    background: join(root, "src/background.ts"),
    options: join(root, "src/options.ts"),
  },
  bundle: true,
  outdir: dist,
  format: "esm",
  target: ["chrome120"],
  platform: "browser",
  sourcemap: true,
  logLevel: "info",
});

cpSync(join(root, "manifest.json"), join(dist, "manifest.json"));
cpSync(join(root, "src/content.css"), join(dist, "content.css"));
cpSync(join(root, "src/options.html"), join(dist, "options.html"));

writeFileSync(join(dist, "icon-16.png"), Buffer.from(ICON_16_PNG_B64, "base64"));
writeFileSync(join(dist, "icon-48.png"), Buffer.from(ICON_48_PNG_B64, "base64"));

const manifest = JSON.parse(readFileSync(join(dist, "manifest.json"), "utf8"));
manifest.icons = {
  "16": "icon-16.png",
  "48": "icon-48.png",
};
manifest.action = {
  ...manifest.action,
  default_icon: {
    "16": "icon-16.png",
    "48": "icon-48.png",
  },
};
writeFileSync(join(dist, "manifest.json"), JSON.stringify(manifest, null, 2));

console.log("extension build →", dist);
