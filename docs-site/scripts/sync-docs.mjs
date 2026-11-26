// Copies ../docs into Starlight's content folder, because the docs have no front matter
// (GitHub renders front matter as a table) and Starlight needs a title on every page.
// Run before every build: `node scripts/sync-docs.mjs [--watch]`.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO = path.resolve(SITE, "..");
const DOCS = path.join(REPO, "docs");
const OUT_MD = path.join(SITE, "src/content/docs");
const OUT_STATIC = path.join(SITE, "public");
const GITHUB = "https://github.com/mortennordbye/homelab";
// Off the site, as exclude_docs did; links to it go to GitHub.
const EXCLUDED = ["backlog/"];
const DESCRIPTION_MAX = 160;
const LINK = /(\]\()([^)\s#]+)(#[^)\s]*)?(\))/g;

const excluded = (rel) => EXCLUDED.some((p) => rel.startsWith(p));

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

// "platform/backups/README.md" -> "/platform/backups/", "platform/backups/pbs.md" -> "/platform/backups/pbs/"
function pageUrl(rel) {
  const noExt = rel.replace(/\.md$/, "");
  const parts = noExt.split("/");
  if (parts.at(-1) === "README") parts.pop();
  return "/" + parts.join("/") + (parts.length ? "/" : "");
}

// One git call for all pages: the newest commit date per file. Without git, pages get no date.
function gitDates() {
  const dates = new Map();
  try {
    const out = execFileSync("git", ["log", "--format=#%cs", "--name-only", "--", "docs"], { cwd: REPO, encoding: "utf8", maxBuffer: 64 << 20 });
    let date = null;
    for (const line of out.split("\n")) {
      if (line.startsWith("#")) date = line.slice(1);
      else if (line && !dates.has(line)) dates.set(line, date);
    }
  } catch {
    // no git history: Starlight shows no "last updated"
  }
  return dates;
}

function firstParagraph(md) {
  for (let block of md.split(/\n\s*\n/)) {
    block = block.trim();
    if (!block || "#|-*>!<`[".includes(block[0]) || /^\d/.test(block)) continue;
    let text = block.replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[`*_]/g, "");
    text = text.split(/\s+/).join(" ");
    if (text.length <= DESCRIPTION_MAX) return text;
    return text.slice(0, DESCRIPTION_MAX - 1).replace(/\s+\S*$/, "").replace(/[,;:]$/, "") + "…";
  }
  return null;
}

function rewriteLinks(md, relFile) {
  const pageDir = path.dirname(path.join(DOCS, relFile));
  return md.replace(LINK, (all, open, target, hash = "", close) => {
    if (/^[a-z]+:/.test(target) || target.startsWith("/")) return all;
    const abs = path.normalize(path.join(pageDir, decodeURI(target)));
    const relDocs = path.relative(DOCS, abs).split(path.sep).join("/");
    const inDocs = !relDocs.startsWith("..");
    if (inDocs && !excluded(relDocs)) {
      if (relDocs.endsWith(".md") && fs.existsSync(abs)) return `${open}${pageUrl(relDocs)}${hash}${close}`;
      if (fs.existsSync(abs) && fs.statSync(abs).isDirectory() && fs.existsSync(path.join(abs, "README.md"))) {
        return `${open}${pageUrl(relDocs + "/README.md")}${hash}${close}`;
      }
      if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return `${open}/${relDocs}${hash}${close}`;
    }
    // Leave a missing target alone, so the link checker reports it.
    if (!fs.existsSync(abs)) return all;
    const kind = fs.statSync(abs).isDirectory() ? "tree" : "blob";
    const relRepo = path.relative(REPO, abs).split(path.sep).join("/");
    return `${open}${GITHUB}/${kind}/main/${relRepo}${hash}${close}`;
  });
}

const yamlString = (s) => JSON.stringify(s);
const SITE_URL = "https://docs.nordbye.it";

// The old site served /sitemap.xml with git dates, and robots.txt points to it.
function sitemapXml(entries) {
  const urls = [["/", null], ...entries].map(([u, d]) => `  <url><loc>${SITE_URL}${u}</loc>${d ? `<lastmod>${d}</lastmod>` : ""}</url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

// Write only what changed and delete only what is stale: the dev server restarts on mass churn.
function writeIfChanged(dest, data) {
  if (fs.existsSync(dest) && Buffer.compare(fs.readFileSync(dest), Buffer.from(data)) === 0) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, data);
}

function prune(dir, keep) {
  if (!fs.existsSync(dir)) return;
  for (const abs of walk(dir)) if (!keep.has(abs)) fs.rmSync(abs);
}

function titleCase(slug) {
  const s = slug.replace(/-/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function sync() {
  const out = new Map();
  // Theme files (logos, topography) kept with the site, not in docs/.
  const STATIC = path.join(SITE, "static");
  for (const abs of walk(STATIC)) out.set(path.join(OUT_STATIC, path.relative(STATIC, abs)), fs.readFileSync(abs));
  const dates = gitDates();
  const sitemap = [];
  let pages = 0;
  for (const abs of walk(DOCS)) {
    const rel = path.relative(DOCS, abs).split(path.sep).join("/");
    if (excluded(rel)) continue;
    if (!rel.endsWith(".md")) {
      out.set(path.join(OUT_STATIC, rel), fs.readFileSync(abs));
      continue;
    }
    const raw = fs.readFileSync(abs, "utf8");
    const h1 = raw.match(/^# (.+)$/m);
    const title = h1 ? h1[1].trim() : path.basename(rel, ".md");
    const body = rewriteLinks(h1 ? raw.slice(0, h1.index) + raw.slice(h1.index + h1[0].length).replace(/^\n/, "") : raw, rel);
    const isIndex = path.basename(rel) === "README.md";
    const fm = [`title: ${yamlString(title)}`];
    const description = firstParagraph(body);
    if (description) fm.push(`description: ${yamlString(description)}`);
    const date = dates.get(`docs/${rel}`);
    if (date) fm.push(`lastUpdated: ${date}`);
    fm.push(`editUrl: ${yamlString(`${GITHUB}/edit/main/docs/${rel}`)}`);
    // Folder pages carry the folder name in the sidebar, as the old site did.
    if (isIndex) fm.push(`sidebar:\n  label: ${yamlString(titleCase(path.basename(path.dirname(rel))))}\n  order: 0`);
    const outRel = isIndex ? rel.replace(/README\.md$/, "index.md") : rel;
    out.set(path.join(OUT_MD, outRel), `---\n${fm.join("\n")}\n---\n${body}`);
    sitemap.push([pageUrl(rel), date]);
    pages++;
  }
  out.set(path.join(OUT_STATIC, "sitemap.xml"), sitemapXml(sitemap.sort()));
  out.set(path.join(OUT_STATIC, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
  for (const [dest, data] of out) writeIfChanged(dest, data);
  const keep = new Set(out.keys());
  prune(OUT_MD, keep);
  prune(OUT_STATIC, keep);
  console.log(`sync-docs: ${pages} pages`);
}

// --watch only watches: the dev script runs one sync first, before Astro starts.
if (!process.argv.includes("--watch")) sync();
else {
  let timer;
  for (const dir of [DOCS, path.join(SITE, "static")]) {
    fs.watch(dir, { recursive: true }, () => {
      clearTimeout(timer);
      timer = setTimeout(sync, 150);
    });
  }
}
