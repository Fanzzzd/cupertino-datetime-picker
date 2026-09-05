import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

const root = fileURLToPath(new URL(".", import.meta.url));

// `vite` serves the demo; `vite build --mode lib` emits the npm package.
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), ...(mode === "lib" ? [dts({ include: ["src"] })] : [])],
  resolve: { alias: { "@": `${root}src` } },
  build:
    mode === "lib"
      ? {
          lib: { entry: `${root}src/index.ts`, formats: ["es"], fileName: "index" },
          rollupOptions: {
            external: [
              /^react($|\/)/,
              /^react-dom($|\/)/,
              /^@base-ui\/react($|\/)/,
              "clsx",
              "tailwind-merge",
            ],
          },
          sourcemap: true,
        }
      : { outDir: "dist-demo" },
}));
