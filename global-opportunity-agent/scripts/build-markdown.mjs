import { build } from "esbuild";
import { fileURLToPath } from "node:url";

// Build browser-only Markdown dependencies locally; keep the app's buildless JSX entry unchanged.
await build({
  entryPoints: [fileURLToPath(new URL("../src/ui/browser-markdown.ts", import.meta.url))],
  outfile: fileURLToPath(new URL("../../global-opportunity-radar/assets/markdown-renderer.js", import.meta.url)),
  bundle: true,
  platform: "browser",
  format: "iife",
  globalName: "AtlasMarkdown",
  target: ["es2020"],
  minify: true,
  legalComments: "inline",
  logLevel: "info",
});
