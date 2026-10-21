import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// Plain static SPA build. `base: "./"` keeps every asset URL relative so the
// same dist/ works from any GitHub Pages subpath (office212.github.io/<repo>/)
// or from the domain root, with no rebuild.
export default defineConfig({
  base: "./",
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
});
