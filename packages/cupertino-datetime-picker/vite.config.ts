import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));

// The demo app only. `pnpm build` (tsdown) emits the npm package.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": `${root}src` } },
  build: { outDir: "dist-demo" },
});
