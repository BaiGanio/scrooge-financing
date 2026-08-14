/// <reference types="vitest" />
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/scrooge-financing/",
  plugins: [svelte()],
  // Under Vitest, resolve the browser build of Svelte components so lifecycle
  // hooks (onMount) actually run — the default SSR build skips them.
  resolve: {
    conditions: process.env.VITEST ? ["browser"] : [],
  },
  server: {
    // Proxy API calls to the BGAPI .NET host so the browser sees a single
    // origin — no CORS config needed on the backend during dev.
    proxy: {
      "/api": {
        target: "http://localhost:62010",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest-setup.ts"],
  },
});
