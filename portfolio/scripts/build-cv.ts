/**
 * Generate Awesome-CV LaTeX source files from the website's TS content.
 *
 * Usage: `npx tsx scripts/build-cv.ts` (or `make cv:gen`).
 *
 * Emits, into `latex/`:
 *   - One entry-point .tex per variant defined by enumerateVariants():
 *       resume.tex            (fixed résumé)
 *       cv-SCHP.tex × 16      (S=skills, C=clientProjects, H=homeLab, P=photo)
 *   - Shared section .tex files under resume/ and cv/.
 *
 * And, into `src/content/generated/cv-manifest.json`, a frontend-friendly
 * map from toggle state → public URL so the customizer popover can resolve
 * the right pre-built PDF without hardcoding the matrix.
 *
 * Intentional design: TS data is single source of truth — any hand edits
 * to generated .tex files will be replaced on every run.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

import { site } from "@/content/site";
import { certs, education, experience, summary } from "@/content/resume";
import { skills } from "@/content/skills";
import { workFrontmatterSchema, type WorkFrontmatter } from "@/content/schemas";
import { enumerateVariants, type Variant } from "@/content/cv-variants";
import {
  renderCertifications,
  renderEducation,
  renderEntryPoint,
  renderExperience,
  renderProjects,
  renderSkills,
  renderSummary,
} from "./lib/templates";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const LATEX_DIR = path.join(ROOT, "latex");
const WORK_DIR = path.join(ROOT, "src", "content", "work");
// Manifest lives in public/ alongside the PDFs so it's a runtime fetch,
// not a build-time TS import. That keeps Next.js builds working even when
// the manifest doesn't exist on the host (local dev with no CV pipeline).
const MANIFEST_PATH = path.join(ROOT, "public", "cv-manifest.json");

/**
 * Load the project frontmatter from src/content/work/*.mdx, sorted by `order`.
 * Decoupled from src/lib/work.ts to avoid pulling in the .arch.ts imports
 * (those are for the website's diagram rendering, not LaTeX).
 */
function loadProjects(): WorkFrontmatter[] {
  return fs
    .readdirSync(WORK_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(WORK_DIR, file), "utf8");
      const { data } = matter(raw);
      return workFrontmatterSchema.parse(data);
    })
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

function write(rel: string, content: string) {
  const target = path.join(LATEX_DIR, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
  console.log(`  · wrote ${path.relative(ROOT, target)}`);
}

function writeManifest(variants: Variant[]) {
  const cvVariants = variants
    .filter((v) => v.flags !== null)
    .map((v) => ({
      id: v.id,
      // Non-null by construction (filtered above), assert for the JSON shape.
      flags: v.flags!,
      url: `/${v.id}.pdf`,
    }));

  const manifest = {
    resume: "/resume.pdf",
    variants: cvVariants,
  };

  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log(`  · wrote ${path.relative(ROOT, MANIFEST_PATH)}`);
}

function main() {
  console.log("→ Generating LaTeX from src/content/*\n");

  const siteForLatex = {
    firstName: site.firstName,
    lastName: site.lastName,
    role: site.role,
    cvAddress: site.cvAddress,
    phoneLatex: site.phoneLatex,
    email: site.email,
    homepage: site.homepage,
    github: site.github,
    linkedin: site.linkedin,
  };

  // Section .tex — shared across all CV variants.
  const allProjects = loadProjects();
  const clientProjects = allProjects.filter((p) => p.kind === "professional");
  const homelabProjects = allProjects.filter((p) => p.kind === "homelab");

  // Résumé sections
  write("resume/summary.tex", renderSummary(summary));
  write("resume/experience.tex", renderExperience(experience));
  write("resume/education.tex", renderEducation(education));
  write("resume/certifications.tex", renderCertifications(certs));

  // Full CV sections (consumed selectively by variants based on flags).
  write("cv/summary.tex", renderSummary(summary));
  write("cv/experience.tex", renderExperience(experience));
  write("cv/projects.tex", renderProjects(clientProjects, { title: "Client Projects" }));
  write("cv/homelab.tex", renderProjects(homelabProjects, { title: "Home Lab Projects" }));
  write("cv/education.tex", renderEducation(education));
  write("cv/certifications.tex", renderCertifications(certs));
  write("cv/skills.tex", renderSkills(skills));

  // Entry-point .tex per variant — 1 résumé + 16 CV variants.
  const variants = enumerateVariants();
  for (const v of variants) {
    write(`${v.id}.tex`, renderEntryPoint(v, siteForLatex));
  }

  // Frontend manifest — toggle state → /public PDF URL.
  writeManifest(variants);

  console.log(`\n✓ done — ${variants.length} entry points + manifest. Run \`make cv-pdf\` next.`);
}

try {
  main();
} catch (err) {
  console.error("✗ generation failed:", err);
  process.exitCode = 1;
}
