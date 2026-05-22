import type { Metadata } from "next";
import { Section } from "@/components/primitives/Section";
import { ResumeBody } from "@/components/sections/ResumeBody";
import { ResumePdfButtons } from "@/components/sections/ResumePdfButtons";

export const metadata: Metadata = {
  title: "Resume — Morten Nordbye",
  description:
    "Senior Cloud Engineer & Architect — Azure, Kubernetes, Terraform, GitOps, observability. Full résumé, certifications, education.",
};

export default function ResumePage() {
  return (
    <main className="pt-32">
      <Section
        eyebrow="resume"
        heading="Curriculum vitae."
        description="The full record — current and past roles, certifications, education. Customise the printable PDF before you download."
      >
        <ResumePdfButtons />
        <div className="mt-16">
          <ResumeBody />
        </div>
      </Section>
    </main>
  );
}
