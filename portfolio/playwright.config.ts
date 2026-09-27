import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  globalSetup: "./tests/wait-for-server.ts",
  forbidOnly: true,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
  },
});
