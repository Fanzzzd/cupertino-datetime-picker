import { defineConfig } from "tsdown";

// The npm bundle: one ESM file and one declaration file, so consumers on
// `moduleResolution: node16` resolve every import (per-file declarations with
// extension-less sibling imports do not). Vite serves the demo; this is only
// the package.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "browser",
  dts: true,
  sourcemap: true,
  clean: true,
  // Peers and runtime dependencies stay imports.
  deps: {
    neverBundle: [
      /^react($|\/)/,
      /^react-dom($|\/)/,
      /^@base-ui\/react($|\/)/,
      "clsx",
      "tailwind-merge",
    ],
  },
});
