import { expect, test, type Page } from "@playwright/test";

// The Cloudflare analytics beacon cannot load outside nordbye.it.
const ALLOWED = [/cloudflareinsights\.com/];

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const text = `${m.text()} ${m.location().url}`;
    if (!ALLOWED.some((re) => re.test(text))) errors.push(`console: ${text}`);
  });
  return errors;
}

const pages = [
  { path: "/", heading: /Morten/ },
  { path: "/infrastructure/", heading: /The machinery behind the page/ },
  { path: "/brand/", heading: /One place for every colour, face and rule/ },
  { path: "/work/k8s-homelab/", heading: /Kubernetes Home Lab/ },
];

for (const { path, heading } of pages) {
  test(`${path} renders without errors`, async ({ page }) => {
    const errors = collectErrors(page);
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(errors).toEqual([]);
  });
}

// WebGL is not guaranteed in CI, so only the page shell is checked.
test("/fun/ shell loads without errors", async ({ page }) => {
  const errors = collectErrors(page);
  const res = await page.goto("/fun/");
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "The room" })).toBeAttached();
  await page.waitForLoadState("networkidle");
  expect(errors).toEqual([]);
});

test("/api/v1/infra serves the snapshot", async ({ request }) => {
  const res = await request.get("/api/v1/infra");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toMatchObject({
    source: "snapshot",
    argocd: { sync: expect.any(String), health: expect.any(String) },
    nodes: { ready: expect.any(Number), total: expect.any(Number) },
  });
});
