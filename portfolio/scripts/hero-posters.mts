/**
 * Re-capture the hero posters from the live scenes: globe-poster.webp and
 * globe-poster-mobile.jpg from the hero globe, room-poster.jpg from /fun.
 * Run with `make hero-posters`.
 */
import path from "node:path";
import { chromium, type Page } from "@playwright/test";
import sharp from "sharp";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = path.join(import.meta.dirname, "..", "public", "images");

const deadline = Date.now() + 60_000;
while (!(await fetch(`${BASE_URL}/api/health`).then((r) => r.ok, () => false))) {
  if (Date.now() > deadline) throw new Error(`${BASE_URL} not healthy after 60s`);
  await new Promise((r) => setTimeout(r, 1_000));
}

// Headless Chromium has no GPU; WebGL only renders through SwiftShader.
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

/** Hide everything painted around `el`, so a screenshot shows only its render. */
async function isolate(page: Page, selector: string) {
  await page.evaluate((sel) => {
    let el = document.querySelector(sel)!;
    while (el.parentElement) {
      for (const sib of el.parentElement.children) {
        if (sib === el) continue;
        // The header has transition-all, which would hold it visible for 300ms.
        (sib as HTMLElement).style.transition = "none";
        (sib as HTMLElement).style.visibility = "hidden";
      }
      el = el.parentElement;
    }
  }, selector);
}

async function globe() {
  // 1430x900 is the box the hero draws at this width; any other aspect and
  // object-cover crops the still away from the render it hands over to. 2x and
  // scaled down, because at 1x SwiftShader aliases the globe into a cross-hatch.
  const page = await browser.newPage({ viewport: { width: 1430, height: 900 }, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/`);
  await page.mouse.move(700, 450);
  await page.mouse.move(710, 460);
  const canvas = page.locator("section canvas").first();
  await canvas.waitFor();
  // Long enough for the textures, short enough that the globe has barely
  // turned from its Atlantic-facing start.
  await page.waitForTimeout(4_000);
  // Mark the fade wrapper: the backdrop's own child holding the canvas. r3f adds
  // a div of its own, so canvas.closest("div") is the wrong node.
  await canvas.evaluate((c) => {
    let el = c as Element;
    while (el.parentElement!.parentElement!.tagName !== "SECTION") el = el.parentElement!;
    el.id = "globe-layer";
  });
  await page.waitForFunction(() => document.getElementById("globe-layer")!.style.opacity === "1");
  await isolate(page, "#globe-layer");
  const box = (await page.locator("#globe-layer").boundingBox())!;

  // The Oslo pin keys Morse, so take a few frames and keep the one where it is lit.
  let frame: Buffer | null = null;
  let brightest = -1;
  for (let i = 0; i < 5; i++) {
    const shot = await page.screenshot({ clip: { x: box.x, y: box.y, width: 1430, height: 900 } });
    const { channels } = await sharp(shot).stats();
    const mean = channels.reduce((sum, c) => sum + c.mean, 0);
    if (mean > brightest) [frame, brightest] = [shot, mean];
  }

  await sharp(frame!)
    .resize(1430, 900)
    .webp({ quality: 90, effort: 6, smartSubsample: true })
    .toFile(path.join(OUT, "globe-poster.webp"));

  // Phones never mount the scene, so their still is cut from this frame: globe
  // low and right, dark room above it for the copy.
  await sharp(frame!)
    .extract({ left: 518 * 2, top: 5 * 2, width: 780 * 2, height: 807 * 2 })
    .resize(780, 807)
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(path.join(OUT, "globe-poster-mobile.jpg"));
  await page.close();
}

async function room() {
  // Twice the poster's size, then scaled down for cleaner edges.
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${BASE_URL}/fun/`);
  // Ready means compiled and drawing from the opening camera pose. The screens
  // power on after that and fade in slowly under SwiftShader.
  await page.getByText("click or press any key to enter").waitFor({ timeout: 180_000 });
  await page.waitForTimeout(6_000);
  await isolate(page, "#fun-lock-target");
  const shot = await page.screenshot();
  await sharp(shot)
    .resize(640, 450)
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(path.join(OUT, "room-poster.jpg"));
  await page.close();
}

await globe();
await room();
await browser.close();
