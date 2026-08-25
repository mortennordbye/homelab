import { Section } from "@/components/primitives/Section";
import { ResumeBody } from "@/components/sections/ResumeBody";
import { ResumeObject } from "@/components/resume/ResumeObject";
import { certs, education, experience } from "@/content/resume";
import { skills } from "@/content/skills";
import { getAllWork } from "@/lib/work";

/**
 * The resume, in the two states branding/DECISIONS.md §4 separates: the
 * object you take a copy from, and the sheet you read.
 *
 * The counts are measured here rather than in the client component, because
 * the work index is read off the filesystem and the sheet in the render is
 * only honest if its page length comes from the same content the LaTeX build
 * sets.
 */
export function ResumeSection() {
  const work = getAllWork();
  return (
    <Section id="resume" heading="Resume." className="section-rule bg-bg-2/40">
      <ResumeObject
        counts={{
          skills: skills.length,
          experience: experience.length,
          clientProjects: work.filter((w) => w.kind !== "homelab").length,
          homelab: work.filter((w) => w.kind === "homelab").length,
          education: education.length,
          certifications: certs.length,
        }}
      />
      <div className="mt-20">
        <ResumeBody />
      </div>
    </Section>
  );
}
