/**
 * Generate Awesome-CV LaTeX source files from the website's TS content.
 *
 * Usage: `npx tsx scripts/build-cv.ts` (or `make cv:gen`).
 *
 * Reads `src/content/{site,resume,skills}.ts` and overwrites:
 *   latex/CV_2025/resume.tex
 *   latex/CV_2025/cv.tex
 *   latex/CV_2025/resume/{summary,experience,education,certifications}.tex
 *   latex/CV_2025/cv/{summary,skills,experience,education,certifications}.tex
 *
 * Intentional design: TS data is single source of truth — any hand edits
 * to the listed .tex files will be replaced on every run.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { site } from "@/content/site";
import { certs, education, experience, summary } from "@/content/resume";
import { skills } from "@/content/skills";
import {
  renderCertifications,
  renderEducation,
  renderEntryPoint,
  renderExperience,
  renderSkills,
  renderSummary,
} from "./lib/templates";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const LATEX_DIR = path.join(ROOT, "latex/CV_2025");

function write(rel: string, content: string) {
  const target = path.join(LATEX_DIR, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
  console.log(`  · wrote ${path.relative(ROOT, target)}`);
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

  // Entry-point .tex files
  write("resume.tex", renderEntryPoint("resume", siteForLatex));
  write("cv.tex", renderEntryPoint("cv", siteForLatex));

  // Résumé sections
  write("resume/summary.tex", renderSummary(summary));
  write("resume/experience.tex", renderExperience(experience));
  write("resume/education.tex", renderEducation(education));
  write("resume/certifications.tex", renderCertifications(certs));

  // Full CV sections (same content + skills)
  write("cv/summary.tex", renderSummary(summary));
  write("cv/experience.tex", renderExperience(experience));
  write("cv/education.tex", renderEducation(education));
  write("cv/certifications.tex", renderCertifications(certs));
  write("cv/skills.tex", renderSkills(skills));

  console.log("\n✓ done — run `make cv-pdf` (or `make cv` for the full pipeline).");
}

try {
  main();
} catch (err) {
  console.error("✗ generation failed:", err);
  process.exitCode = 1;
}
