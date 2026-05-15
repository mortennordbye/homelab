import { SectionHeading } from "@/components/primitives/SectionHeading";
import { ResumeBody } from "@/components/sections/ResumeBody";
import { ResumePdfButtons } from "@/components/sections/ResumePdfButtons";

export function ResumeSection() {
  return (
    <section
      id="resume"
      className="scroll-mt-24 border-t border-line bg-bg-2/40"
    >
      <div className="mx-auto max-w-7xl px-5 py-28 md:px-8 md:py-36">
        <SectionHeading
          title="Resume."
          description="Cloud and infrastructure engineer working with regulated customers across healthcare, aviation, transport, public sector and finance. The work spans Kubernetes, Azure, automation and the platform pieces a production cluster relies on, with observability that catches problems before customers do."
        />

        <ResumePdfButtons className="mt-10" />

        <div className="mt-16">
          <ResumeBody />
        </div>
      </div>
    </section>
  );
}
