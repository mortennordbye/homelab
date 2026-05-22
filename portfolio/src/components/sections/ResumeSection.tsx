import { ArrowUpRight } from "lucide-react";
import { Section } from "@/components/primitives/Section";
import { Button } from "@/components/primitives/Button";
import { ResumeBody } from "@/components/sections/ResumeBody";
import { ResumePdfButtons } from "@/components/sections/ResumePdfButtons";

export function ResumeSection() {
  return (
    <Section
      id="resume"
      heading="Resume."
      className="border-t border-line bg-bg-2/40"
      cta={
        <Button
          href="/resume"
          variant="secondary"
          iconRight={<ArrowUpRight size={16} aria-hidden />}
        >
          Open standalone resume
        </Button>
      }
      align="between"
    >
      <ResumePdfButtons />
      <div className="mt-16">
        <ResumeBody />
      </div>
    </Section>
  );
}
