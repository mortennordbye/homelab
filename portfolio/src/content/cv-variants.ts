/**
 * Declarative variant matrix for the LaTeX CV export.
 *
 * The build pipeline (`scripts/build-cv.ts`) emits one LaTeX entry-point per
 * variant; the resume object (`components/resume/ResumeObject`) maps the user's
 * toggle state to the matching PDF URL via the generated manifest.
 *
 * Always-on sections: summary, experience, education, certifications.
 * User-toggleable: skills, client projects, home-lab projects, photo.
 */

export type SectionId =
  | "summary"
  | "skills"
  | "experience"
  | "projects"
  | "homelab"
  | "education"
  | "certifications";

export type ToggleFlags = {
  skills: boolean;
  clientProjects: boolean;
  homeLab: boolean;
  photo: boolean;
};

export type Variant = {
  /** Stable id used as the .tex filename stem and PDF filename stem. */
  id: string;
  /** `\input` paths, in render order, relative to the LaTeX root. */
  sections: SectionId[];
  /** Include the circular profile photo in the header. */
  photo: boolean;
  /** Footer center label printed on every page. */
  footerLabel: string;
  /** Flags this variant was generated from (resume entry is null). */
  flags: ToggleFlags | null;
};

export const RESUME_VARIANT: Variant = {
  id: "resume",
  sections: ["summary", "experience", "education", "certifications"],
  photo: false,
  footerLabel: "Oslo~~~·~~~Resume",
  flags: null,
};

function cvVariant(flags: ToggleFlags): Variant {
  const sections: SectionId[] = ["summary"];
  if (flags.skills) sections.push("skills");
  sections.push("experience");
  if (flags.clientProjects) sections.push("projects");
  if (flags.homeLab) sections.push("homelab");
  sections.push("education", "certifications");

  // Bitmask order: skills, clientProjects, homeLab, photo (most-significant first)
  const id = `cv-${flags.skills ? 1 : 0}${flags.clientProjects ? 1 : 0}${flags.homeLab ? 1 : 0}${flags.photo ? 1 : 0}`;

  return {
    id,
    sections,
    photo: flags.photo,
    footerLabel: "Oslo~~~·~~~CV",
    flags,
  };
}

/**
 * Enumerate the full set of LaTeX entry-points the build emits:
 *   - 1 résumé (fixed)
 *   - 16 CV variants (2^4 toggle combinations)
 */
export function enumerateVariants(): Variant[] {
  const out: Variant[] = [RESUME_VARIANT];
  for (const skills of [true, false]) {
    for (const clientProjects of [true, false]) {
      for (const homeLab of [true, false]) {
        for (const photo of [true, false]) {
          out.push(cvVariant({ skills, clientProjects, homeLab, photo }));
        }
      }
    }
  }
  return out;
}

/** Default state shown when the customizer opens — every section on. */
export const DEFAULT_FLAGS: ToggleFlags = {
  skills: true,
  clientProjects: true,
  homeLab: true,
  photo: true,
};
