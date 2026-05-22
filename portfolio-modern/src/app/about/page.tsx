import { Dumbbell, Wifi } from "lucide-react";
import type { Metadata } from "next";
import { Section } from "@/components/primitives/Section";
import { Reveal } from "@/components/primitives/Reveal";
import { CareerPath } from "@/components/sections/CareerPath";
import { Stat } from "@/components/primitives/Stat";
import { interests, type Interest } from "@/content/interests";

export const metadata: Metadata = {
  title: "About — Morten Nordbye",
  description: "How I got here, what I work with, and what I build after hours.",
};

const interestIcon: Record<Interest["icon"], React.ReactNode> = {
  fitness: <Dumbbell size={20} />,
  homelab: <Wifi size={20} />,
};

export default function AboutPage() {
  return (
    <main className="pt-32">
      <Section
        eyebrow="about"
        heading="From the operations centre to platform engineering."
        description="The route I took to cloud and platform work, the stack I lean on, and what I build when I'm not on a clock."
      >
        <div className="grid grid-cols-12 gap-8 md:gap-12">
          <div className="col-span-12 md:col-span-7">
            <p className="text-fg-2 leading-relaxed">
              Skilled ICT Service Operator by trade. Started on the front line
              in an Operations Centre, monitoring alarms and running incidents
              across customer environments, then moved into platform and cloud
              engineering as the workloads followed. Scripting led to
              automation, automation led to infrastructure as code, and the
              work shifted from reacting to alerts to building the platforms
              that produce them.
            </p>
            <p className="mt-4 text-fg-2 leading-relaxed">
              Today I work as a Cloud Engineer at Orange Business, on Azure
              platforms for customers across a range of regulated sectors. On
              the side I run a homelab cluster that doubles as my proving
              ground for anything I want to try before it touches production.
            </p>
          </div>
          <div className="col-span-12 md:col-span-5 grid grid-cols-2 gap-x-8 gap-y-6">
            <Stat value="4+" label="Years in production cloud" accent />
            <Stat value="5" label="Active certifications" caption="incl. CKA, AZ-305" />
            <Stat value="33M+" label="Req / day peak" caption="Betting platform on AKS" />
            <Stat value="6-node" label="Talos cluster" caption="Homelab, prod-grade" />
          </div>
        </div>
      </Section>

      <Section eyebrow="career" heading="The route here." className="border-t border-line">
        <CareerPath />
      </Section>

      <Section eyebrow="off the clock" heading="Outside work." className="border-t border-line">
        <div className="grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-2">
          {interests.map((it, i) => (
            <Reveal key={it.title} delay={i * 0.08}>
              <div className="flex h-full flex-col gap-4 bg-bg p-8">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-line-2 bg-surface/40 text-accent">
                  {interestIcon[it.icon]}
                </span>
                <h3 className="text-h3 text-fg">{it.title}</h3>
                <p className="text-sm text-fg-2 leading-relaxed">{it.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>
    </main>
  );
}
