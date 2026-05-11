import type { Metadata } from "next";
import { ResumeBody } from "@/components/sections/ResumeBody";
import { ResumePdfButtons } from "@/components/sections/ResumePdfButtons";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Resume",
  description: `${site.firstName} ${site.lastName} — Cloud Engineer & Architect at Orange Business, based in Oslo. Career, certifications and education.`,
  alternates: { canonical: "/resume/" },
  openGraph: {
    title: `Resume — ${site.firstName} ${site.lastName}`,
    description: `Career, certifications and education for ${site.firstName} ${site.lastName}, Cloud Engineer & Architect in Oslo.`,
    url: `${site.url}/resume/`,
    type: "profile",
  },
};

export default function Resume() {
  return (
    <div className="mx-auto max-w-7xl px-5 pt-32 pb-24 md:px-8 md:pt-44">
      <p className="font-display text-xs uppercase tracking-[0.3em] text-fg-3">
        resume
      </p>
      <div className="mt-6 grid gap-8 md:grid-cols-12 md:items-end">
        <h1 className="text-display-lg font-display text-fg leading-[1] md:col-span-8">
          A career in <span className="gradient-text">production.</span>
        </h1>
        <p className="text-fg-2 md:col-span-4">
          IT professional with experience across cloud and on-premises
          infrastructure, automation and customer delivery. Always learning,
          and not fond of surprise downtime.
        </p>
      </div>

      <ResumePdfButtons className="mt-10" />

      <div className="mt-16">
        <ResumeBody />
      </div>
    </div>
  );
}
