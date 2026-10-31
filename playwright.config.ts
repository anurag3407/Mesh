import "dotenv/config"
import { defineConfig, devices } from "@playwright/test"

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 20_000 },
  globalSetup: "./e2e/global-setup.ts",
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    viewport: { width: 1440, height: 900 },
  },
  webServer: [
    {
      command: "pnpm --filter @mesh/web dev",
      url: baseURL,
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      command: "pnpm --filter @mesh/orchestrator dev",
      url: `${process.env.ORCHESTRATOR_URL ?? "http://localhost:4000"}/health`,
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
})
