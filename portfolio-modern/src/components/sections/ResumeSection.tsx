import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SectionHeading } from "@/components/primitives/SectionHeading";
import { ResumeBody } from "@/components/sections/ResumeBody";
import { ResumePdfButtons } from "@/components/sections/ResumePdfButtons";

/**
 * Resume as a section on the home page. The same `ResumeBody` is rendered
 * under a different page-level header on the standalone /resume route.
 */
export function ResumeSection() {
  return (
    <section
      id="resume"
      className="scroll-mt-24 border-t border-line bg-bg-2/40"
    >
      <div className="mx-auto max-w-7xl px-5 py-28 md:px-8 md:py-36">
        <SectionHeading
          eyebrow="resume"
          title="Resume."
          description="Highly skilled IT professional with extensive experience in system consulting and technical support. Proven expertise in managing cloud and on-premises infrastructures, implementing advanced automation solutions, and providing exceptional customer service. Committed to continuous learning and staying updated with the latest technologies to ensure optimal performance and strategic growth for clients."
          align="between"
          cta={
            <Link
              href="/resume/"
              className="group inline-flex items-center gap-2 font-display text-sm text-fg-2 hover:text-fg"
            >
              Open standalone resume
              <ArrowUpRight
                size={16}
                className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </Link>
          }
        />

        <ResumePdfButtons className="mt-10" />

        <div className="mt-16">
          <ResumeBody />
        </div>
      </div>
    </section>
  );
}
