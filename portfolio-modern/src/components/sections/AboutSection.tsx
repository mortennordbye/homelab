"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { ChevronRight, Dumbbell, Wifi } from "lucide-react";
import { SectionHeading } from "@/components/primitives/SectionHeading";
import { Reveal } from "@/components/primitives/Reveal";
import { site } from "@/content/site";
import { careerPath, type CareerStop } from "@/content/resume";
import { skills } from "@/content/skills";
import type { Skill } from "@/content/schemas";
import { interests, type Interest } from "@/content/interests";

const facts: { k: string; v: string; href?: string; tone?: "accent" }[] = [
  { k: "City", v: site.location },
  { k: "Email", v: site.email, href: `mailto:${site.email}` },
  { k: "Degree", v: "Trade certificate · Skilled ICT Service Operator" },
  { k: "Freelance", v: "Available", tone: "accent" },
];

const skillGroups: { id: Skill["group"]; label: string }[] = [
  { id: "platform", label: "Platform & infrastructure" },
  { id: "delivery", label: "Delivery & automation" },
  { id: "ops", label: "Operations" },
  { id: "soft", label: "Leadership" },
];

const interestIcon: Record<Interest["icon"], React.ReactNode> = {
  fitness: <Dumbbell size={20} />,
  homelab: <Wifi size={20} />,
};

export function AboutSection() {
  return (
    <section id="about" className="scroll-mt-24 border-t border-line">
      <div className="mx-auto max-w-7xl px-5 py-28 md:px-8 md:py-36">
        <SectionHeading
          title="About me."
          description="The career arc, the stack I reach for, and what I do once the day is done."
        />

        {/* Sub-block 1 — the path here (career timeline + prose + facts) */}
        <CareerPath />

        <div className="mt-20 grid grid-cols-12 gap-8 md:gap-12">
          <div className="col-span-12 md:col-span-7">
            <p className="text-fg-2 leading-relaxed">
              Skilled ICT Service Operator by trade. Started in IT operations
              where the work was on-prem and the failures were physical, then
              slid into platform and cloud engineering as the workloads
              followed. The route went through scripting, then automation,
              then infrastructure as code, then the realisation that the
              platform is the product and the dashboards are the contract.
            </p>
            <p className="mt-4 text-fg-2 leading-relaxed">
              Today I work as a Cloud Engineer at Orange Business on Azure
              platforms for customer environments — and on the side I run a
              homelab cluster that doubles as my proving ground for anything
              I want to try before it touches production.
            </p>
          </div>

          <div className="col-span-12 md:col-span-5">
            <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line text-sm sm:grid-cols-2">
              {facts.map((f) => (
                <div key={f.k} className="bg-bg p-5 transition-colors hover:bg-surface">
                  <dt className="flex items-center gap-2 font-display text-[12px] uppercase tracking-[0.18em] text-fg-3">
                    <ChevronRight size={11} className="text-accent" /> {f.k}
                  </dt>
                  <dd className="mt-2">
                    {f.href ? (
                      <a
                        href={f.href}
                        className="text-fg hover:text-accent break-all"
                        {...(f.href.startsWith("http")
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                      >
                        {f.v}
                      </a>
                    ) : f.tone === "accent" ? (
                      <span className="inline-flex items-center gap-2 text-accent">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />
                        {f.v}
                      </span>
                    ) : (
                      <span className="text-fg break-words">{f.v}</span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Sub-block 2 — the stack (skills chips) */}
        <SubHeading className="mt-24">the stack</SubHeading>
        <div className="mt-8 grid gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-4">
          {skillGroups.map((g, gi) => {
            const items = skills.filter((s) => s.group === g.id);
            if (!items.length) return null;
            return (
              <Reveal key={g.id} delay={gi * 0.05}>
                <h3 className="border-l-2 border-accent pl-3 font-display text-xs uppercase tracking-[0.18em] text-fg-2">
                  {g.label}
                </h3>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {items.map((s) => (
                    <li
                      key={s.label}
                      className="group inline-flex items-center gap-2 rounded-full border border-line-2 bg-surface/60 px-4 py-1.5 font-display text-sm text-fg shadow-[0_0_0_0_var(--accent)] transition-all hover:border-accent hover:bg-surface hover:shadow-[0_0_18px_-6px_var(--accent)]"
                    >
                      <span className="h-1 w-1 rounded-full bg-accent/70 transition-all group-hover:bg-accent group-hover:shadow-[0_0_8px_var(--accent)]" />
                      {s.label}
                    </li>
                  ))}
                </ul>
              </Reveal>
            );
          })}
        </div>

        {/* Sub-block 3 — off the clock (interests) */}
        <SubHeading className="mt-24">off the clock</SubHeading>
        <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-2">
          {interests.map((it, i) => (
            <Reveal key={it.title} delay={i * 0.08}>
              <div className="flex h-full flex-col gap-4 bg-bg p-8">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-line-2 bg-surface/40 text-accent">
                  {interestIcon[it.icon]}
                </span>
                <h3 className="font-display text-h3 text-fg">{it.title}</h3>
                <p className="text-sm text-fg-2 leading-relaxed">{it.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function SubHeading({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={
        "flex items-center gap-2 font-display text-[12px] uppercase tracking-[0.18em] text-fg-3 " +
        className
      }
    >
      <ChevronRight size={11} className="text-accent" />
      {children}
    </p>
  );
}

function CareerPath() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15%" });

  return (
    <div ref={ref} className="mt-16">
      <SubHeading>the route</SubHeading>

      {/* Mobile: vertical stops */}
      <ol className="mt-6 space-y-6 sm:hidden">
        {careerPath.map((stop, i) => (
          <motion.li
            key={`${stop.year}-${stop.role}`}
            initial={{ opacity: 0, x: -8 }}
            animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
            transition={{ duration: 0.45, delay: 0.1 + i * 0.08 }}
            className="relative flex items-start gap-4"
          >
            <span
              className={
                "mt-1.5 inline-block h-3 w-3 shrink-0 rounded-full border " +
                (stop.current
                  ? "border-accent bg-accent shadow-[0_0_14px_var(--accent)]"
                  : "border-line-2 bg-bg")
              }
            />
            <StopLabel stop={stop} />
          </motion.li>
        ))}
      </ol>

      {/* Desktop: horizontal stops with connector line */}
      <div className="relative mt-8 hidden sm:block">
        {/* Connector: drawn left → right on scroll-in */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-[6px] right-[6px] top-[5px] h-px"
        >
          <motion.div
            initial={{ scaleX: 0 }}
            animate={inView ? { scaleX: 1 } : { scaleX: 0 }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            style={{ transformOrigin: "left" }}
            className="h-px w-full bg-gradient-to-r from-accent via-accent/60 to-line-2"
          />
        </div>

        <ol
          className="grid gap-x-6"
          style={{
            gridTemplateColumns: `repeat(${careerPath.length}, minmax(0, 1fr))`,
          }}
        >
          {careerPath.map((stop, i) => (
            <motion.li
              key={`${stop.year}-${stop.role}`}
              initial={{ opacity: 0, y: 10 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
              className="relative"
            >
              <span
                className={
                  "relative z-10 inline-block h-3 w-3 rounded-full border " +
                  (stop.current
                    ? "border-accent bg-accent shadow-[0_0_16px_var(--accent)]"
                    : "border-line-2 bg-bg")
                }
              />
              <div className="mt-4">
                <StopLabel stop={stop} />
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function StopLabel({ stop }: { stop: CareerStop }) {
  return (
    <div>
      <p className="flex items-baseline gap-2 font-display text-[12px] uppercase tracking-[0.18em] text-fg-3">
        {stop.year}
        {stop.current && (
          <span className="inline-flex items-center gap-1 text-accent">
            <span className="h-1 w-1 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" />
            now
          </span>
        )}
      </p>
      <p
        className={
          "mt-1.5 font-display text-sm " + (stop.current ? "text-fg" : "text-fg-2")
        }
      >
        {stop.role}
      </p>
      <p className="mt-0.5 text-xs text-fg-3">{stop.company}</p>
      {stop.note && (
        <p className="mt-2 text-xs leading-relaxed text-fg-3">{stop.note}</p>
      )}
    </div>
  );
}
