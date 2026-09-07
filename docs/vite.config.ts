import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import mdx from "fumadocs-mdx/vite";
import { nitro } from "nitro/vite";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "react-vendor",
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 30,
            },
            {
              name: "tanstack-vendor",
              test: /node_modules[\\/]@tanstack[\\/]/,
              priority: 20,
            },
            {
              name: "fumadocs-vendor",
              test: /node_modules[\\/](fumadocs-core|fumadocs-ui)[\\/]/,
              priority: 10,
            },
          ],
        },
        // Manual groups can otherwise move side-effectful framework modules
        // ahead of their dependencies.
        strictExecutionOrder: true,
      },
    },
  },
  server: {
    port: 3000,
  },
  resolve: {
    alias: [
      // tslib ships a CJS default that breaks ESM interop during SSR/prerender
      // (e.g. Orama search emits `Cannot destructure '__extends'`). Pin its ESM build.
      { find: "tslib", replacement: "tslib/tslib.es6.js" },
      // The demos render the library from its source, so an edit shows up here
      // without a package build in between.
      { find: /^cupertino-datetime-picker$/, replacement: `${root}../src/index.ts` },
    ],
    // The library source lives outside this package; both must share one React.
    dedupe: ["react", "react-dom", "@base-ui/react"],
  },
  plugins: [
    mdx(),
    tailwindcss(),
    tanstackStart({
      prerender: {
        enabled: true,
        crawlLinks: true,
      },
    }),
    react(),
    // see https://tanstack.com/start/latest/docs/framework/react/guide/hosting
    // "vercel" preset emits .vercel/output so Vercel auto-detects and deploys.
    nitro({ preset: "vercel" }),
  ],
});
