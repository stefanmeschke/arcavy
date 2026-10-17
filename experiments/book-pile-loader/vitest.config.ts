import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Test the production code path: no dev-only debug panel.
  define: { "import.meta.env.DEV": false },
  test: {
    include: ["tests/**/*.test.ts"],
    browser: {
      enabled: true,
      headless: true,
      viewport: { width: 1000, height: 700 },
      provider: playwright({
        // Software WebGL, so it also renders on machines without a GPU.
        launchOptions: {
          args: [
            "--use-angle=swiftshader",
            "--enable-unsafe-swiftshader",
            "--ignore-gpu-blocklist",
          ],
        },
        contextOptions: { reducedMotion: "reduce" },
      }),
      instances: [{ browser: "chromium" }],
    },
  },
});
