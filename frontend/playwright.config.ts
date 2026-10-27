import { defineConfig } from "@playwright/test";

const port = process.env.PLAYWRIGHT_PORT ?? "5174";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    env: { VITE_USE_MOCK: "false" },
    reuseExistingServer: false,
  },
});
