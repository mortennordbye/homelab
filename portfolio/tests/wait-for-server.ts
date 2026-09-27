import type { FullConfig } from "@playwright/test";

// The server container has no shell, so compose cannot healthcheck it; poll here instead.
export default async function waitForServer(config: FullConfig) {
  const url = new URL("/api/health", config.projects[0].use.baseURL).toString();
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1_000));
  }
  throw new Error(`${url} not healthy after 60s`);
}
