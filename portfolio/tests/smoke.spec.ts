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

// Third-party requests hang on some runners and would make the suite depend on
// the internet; only the server under test is reachable.
test.beforeEach(async ({ page, baseURL }) => {
  await page.route((url) => !url.href.startsWith(baseURL!), (route) => route.abort());
});

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
    await page.waitForLoadState("load");
    expect(errors).toEqual([]);
  });
}

// WebGL is not guaranteed in CI, so only the page shell is checked.
test("/fun/ shell loads without errors", async ({ page }) => {
  const errors = collectErrors(page);
  const res = await page.goto("/fun/");
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "The room" })).toBeAttached();
  await page.waitForLoadState("load");
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

test("every nordbye.it link in /llms.txt resolves", async ({ request }) => {
  const res = await request.get("/llms.txt");
  expect(res.status()).toBe(200);
  const links = [...(await res.text()).matchAll(/https:\/\/nordbye\.it(\/[^\s)]*[^\s).,])/g)].map((m) => m[1]);
  expect(links.filter((l) => l.endsWith(".md")).length).toBeGreaterThan(10);
  for (const path of new Set(links)) {
    // POST-only; the /mcp test below covers it.
    if (path === "/mcp") continue;
    const r = await request.get(path);
    expect(r.status(), path).toBe(200);
    if (path.endsWith(".md")) expect(r.headers()["content-type"], path).toContain("text/markdown");
  }
});

test("/mcp lists the tools and answers a call", async ({ request }) => {
  const rpc = (method: string, params?: object) =>
    request.post("/mcp", {
      headers: { accept: "application/json, text/event-stream" },
      data: { jsonrpc: "2.0", id: 1, method, params },
    });
  const list = await (await rpc("tools/list")).json();
  expect(list.result.tools.map((t: { name: string }) => t.name)).toEqual([
    "get_profile",
    "list_case_studies",
    "get_case_study",
    "search_blog",
    "cluster_status",
  ]);
  const call = await (await rpc("tools/call", { name: "get_case_study", arguments: { slug: "k8s-homelab" } })).json();
  expect(call.result.content[0].text).toContain("# Kubernetes Home Lab");
});
