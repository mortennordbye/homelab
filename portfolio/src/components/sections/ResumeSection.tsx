import { Section } from "@/components/primitives/Section";
import { ResumeBody } from "@/components/sections/ResumeBody";
import { ResumePdfButtons } from "@/components/sections/ResumePdfButtons";

export function ResumeSection() {
  return (
    <Section
      id="resume"
      heading="Resume."
      className="border-t border-line bg-bg-2/40"
    >
      <ResumePdfButtons />
      <div className="mt-16">
        <ResumeBody />
      </div>
    </Section>
  );
}
