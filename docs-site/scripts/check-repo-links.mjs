// Alerts, dashboards and the README link to exact docs.nordbye.it pages and #anchors.
// Fails when a built page or heading those links need is missing. Run after `astro build`.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO = path.resolve(SITE, "..");
const DIST = path.join(SITE, "dist");
const URL_RE = /https:\/\/docs\.nordbye\.it(\/[^\s"'`<>)\]]*)?/g;

const files = execFileSync("git", ["grep", "-l", "docs.nordbye.it", "--", ".", ":!docs-site"], { cwd: REPO, encoding: "utf8" })
  .split("\n")
  .filter(Boolean);

const failures = [];
let checked = 0;
for (const file of files) {
  const text = fs.readFileSync(path.join(REPO, file), "utf8");
  for (const [url, rest = "/"] of text.matchAll(URL_RE)) {
    const [pathname, hash] = rest.split("#");
    // A templated anchor ({{ .Labels.alertname }}) has no fixed value to check.
    if (hash?.startsWith("{{")) continue;
    const clean = pathname.replace(/[.,;:]+$/, "");
    const target = path.extname(clean) ? path.join(DIST, clean) : path.join(DIST, clean, "index.html");
    checked++;
    if (!fs.existsSync(target)) {
      failures.push(`${file}: ${url} (no page)`);
      continue;
    }
    if (hash && !fs.readFileSync(target, "utf8").includes(`id="${hash}"`)) failures.push(`${file}: ${url} (no #${hash})`);
  }
}

console.log(`check-repo-links: ${checked} links in ${files.length} files`);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
