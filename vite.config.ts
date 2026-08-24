import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  root: "web",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "web/index.html"),
        about: resolve(import.meta.dirname, "web/about.html"),
      },
    },
  },
});
