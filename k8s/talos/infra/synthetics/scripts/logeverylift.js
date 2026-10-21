// Signs in to logeverylift as the synthetic user and logs and un-logs one set, the
// flow ported from the app's e2e suite (e2e/auth.setup.ts, e2e/log-set.spec.ts).
// The un-log step must stay: without it every run leaves a logged set behind.
import { browser } from "k6/browser";
import { check, fail } from "k6";

const BASE = "https://logeverylift.com";

export const options = {
  scenarios: {
    journey: {
      executor: "shared-iterations",
      iterations: 1,
      options: {
        browser: {
          type: "chromium",
        },
      },
    },
  },
  tags: {
    journey: "logeverylift",
  },
  thresholds: {
    checks: ["rate==1"],
  },
};

// Each step is one check named after it, so a failure shows which step broke. A step
// that throws counts as failed and ends the run: later steps depend on it.
async function step(page, name, fn) {
  let ok = false;
  try {
    await fn();
    ok = true;
  } catch (e) {
    console.error(`step ${name} failed at ${page.url()}: ${e}`);
  }
  check(ok, { [name]: (v) => v });
  if (!ok) fail(`journey stopped at ${name}`);
}

export default async function () {
  const context = await browser.newContext({
    viewport: {
      width: 393,
      height: 852,
    },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);

  try {
    await step(page, "login", async () => {
      await page.goto(`${BASE}/login`);
      await page.getByLabel("Email").fill(__ENV.SYNTHETIC_EMAIL);
      await page.getByLabel("Password").fill(__ENV.SYNTHETIC_PASSWORD);
      await Promise.all([
        page.waitForURL(`${BASE}/`),
        page.getByRole("button", { name: "Sign In" }).click(),
      ]);
    });

    await step(page, "dashboard", async () => {
      await page.getByRole("heading", { name: "LogEveryLift", exact: true }).waitFor();
    });

    await step(page, "open-workout", async () => {
      await page.goto(`${BASE}/new-workout`);
      // On a day the active cycle schedules a program, the list hides behind this.
      const showAll = page.getByRole("button", { name: "Different program" });
      if (await showAll.isVisible()) await showAll.click();
      const workout = page.locator('a[href^="/programs/"][href$="/workout"]').first();
      await page.goto(BASE + (await workout.getAttribute("href")));
      await page.locator('a[href*="/exercises/"]').first().waitFor();
      const skip = page.getByRole("button", { name: "Skip" });
      if (await skip.isVisible()) await skip.click();
    });

    await step(page, "open-exercise", async () => {
      const link = page.locator('a[href*="/exercises/"]').first();
      const href = await link.getAttribute("href");
      await Promise.all([page.waitForURL(`**${href}`), link.click()]);
    });

    const toggle = page.locator("button.w-7.h-7.rounded-full").first();
    const setIs = (cls) =>
      page.waitForFunction(
        (c) => document.querySelector("button.w-7.h-7.rounded-full")?.className.includes(c),
        { polling: "raf" },
        cls,
      );
    // The UI updates before the Server Action lands; wait for the write itself, or a
    // reload or close can cancel it mid-flight.
    const tapAndSave = async () => {
      const saved = page.waitForResponse(
        (r) => r.request().method() === "POST" && Boolean(r.request().headers()["next-action"]),
      );
      await toggle.click();
      if ((await saved).status() !== 200) throw new Error("set toggle did not save");
    };

    await step(page, "log-set", async () => {
      await toggle.waitFor();
      // A run that died between the two taps leaves the set logged; undo it first.
      if (/bg-primary/.test(await toggle.getAttribute("class"))) {
        await tapAndSave();
        await setIs("bg-transparent");
      }
      await tapAndSave();
      await setIs("bg-primary");
      await page.getByText(/^REST \d{2}:\d{2}$/).first().waitFor();
    });

    await step(page, "unlog-set", async () => {
      await tapAndSave();
      await setIs("bg-transparent");
    });
  } finally {
    await page.close();
    await context.close();
  }
}
