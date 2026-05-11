import type { Metadata } from "next";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { Reveal } from "@/components/primitives/Reveal";
import { CtaContact } from "@/components/sections/CtaContact";
import { site } from "@/content/site";
import { skills } from "@/content/skills";
import { interests } from "@/content/interests";

const fullName = `${site.firstName} ${site.lastName}`;

export const metadata: Metadata = {
  title: `About ${fullName}`,
  description: `${fullName} — Cloud Engineer & Architect in Oslo, Norway. Long-form bio, skills, certifications and how I work.`,
  alternates: { canonical: "/about/" },
  openGraph: {
    type: "profile",
    title: `About ${fullName}`,
    description: `${fullName} — Cloud Engineer & Architect in Oslo.`,
    url: `${site.url}/about/`,
    firstName: site.firstName,
    lastName: site.lastName,
    username: site.github,
  },
};

const profileJsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  "@id": `${site.url}/about/#profile`,
  url: `${site.url}/about/`,
  name: `About ${fullName}`,
  description: `${fullName} — Cloud Engineer & Architect in Oslo.`,
  inLanguage: "en-GB",
  mainEntity: { "@id": `${site.url}/#person` },
  about: { "@id": `${site.url}/#person` },
};

const skillGroups: { id: typeof skills[number]["group"]; label: string }[] = [
  { id: "platform", label: "Platform & infrastructure" },
  { id: "delivery", label: "Delivery & automation" },
  { id: "ops", label: "Operations" },
  { id: "soft", label: "Leadership" },
];

const facts: { k: string; v: string }[] = [
  { k: "Born", v: "Oslo, Norway" },
  { k: "Mother tongue", v: "Norwegian — works in English daily" },
  { k: "Currently at", v: "Orange Business · Cloud Engineer" },
  { k: "Latest cert", v: "Azure Solutions Architect Expert · 2026" },
  { k: "Daily driver", v: "Linux + Talos K8s home cluster" },
  { k: "On call", v: "Yes — rare but ready" },
  { k: "Reads", v: "Stoics, systems thinking, Sapir-Whorf" },
  { k: "Trains", v: "5×/week — running, lifting, climbing" },
];

export default function About() {
  return (
    <div className="mx-auto max-w-6xl px-5 pt-32 pb-24 md:px-8 md:pt-44">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(profileJsonLd) }}
      />
      <p className="font-display text-xs uppercase tracking-[0.3em] text-fg-3">
        about
      </p>

      {/* Editorial header — portrait + headline */}
      <section className="mt-8 grid grid-cols-12 gap-8">
        <div className="col-span-12 md:col-span-7">
          <h1 className="text-display-lg font-display text-fg leading-[1]">
            Cloud engineer.{" "}
            <span className="gradient-text">Stubborn pragmatist.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-fg-2 leading-relaxed">
            I build cloud platforms for organisations that need them to be
            reliable. I rebuild the same kind of setup at home so I learn what
            actually works before recommending it to customers.
          </p>
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-line-2 bg-surface/40 px-4 py-2 font-display text-xs text-fg-2 backdrop-blur">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />
            Currently in Oslo · open to consulting through Orange Business or directly
          </div>
        </div>

        <div className="col-span-12 md:col-span-5">
          <figure className="group relative overflow-hidden rounded-lg border border-line bg-surface/40">
            <div className="relative aspect-[4/5] w-full">
              <Image
                src="/profile.webp"
                alt="Portrait of Morten Nordbye"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 40vw"
                className="object-cover saturate-[0.95] contrast-[1.05] transition-transform duration-700 group-hover:scale-[1.02]"
                style={{ objectPosition: "center top" }}
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-bg/85 via-transparent to-transparent"
              />
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(120% 60% at 0% 100%, rgba(var(--accent-rgb), 0.20), transparent 60%)",
                }}
              />
              <span
                aria-hidden
                className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full border border-line-2 bg-bg/70 px-3 py-1 font-display text-[11px] uppercase tracking-[0.2em] text-fg-2 backdrop-blur"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-accent" /> 59.9°N · 10.7°E
              </span>
            </div>
            <figcaption className="grid grid-cols-3 divide-x divide-line border-t border-line bg-bg-2/60 text-center font-display text-xs">
              <div className="px-2 py-3">
                <p className="text-fg">04+</p>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-fg-3">years cloud</p>
              </div>
              <div className="px-2 py-3">
                <p className="text-fg">06</p>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-fg-3">case studies</p>
              </div>
              <div className="px-2 py-3">
                <p className="text-fg">01</p>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-fg-3">homelab rack</p>
              </div>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Cloud Engineer details card — old-portfolio-style structured info */}
      <section className="mt-24">
        <div className="grid grid-cols-12 gap-12">
          <div className="col-span-12 md:col-span-5">
            <p className="font-display text-xs uppercase tracking-[0.2em] text-fg-3">
              the short version
            </p>
            <h2 className="mt-5 text-h1 font-display text-fg leading-tight">Cloud Engineer.</h2>
            <p className="mt-5 text-fg-2 leading-relaxed">
              Cloud Engineer at Orange Business, working on Azure infrastructure
              for customer environments. Terraform and CI/CD pipelines for the
              deployments. AKS, GitOps with ArgoCD, and Azure networking (vWAN,
              ExpressRoute, Front Door). Observability through Azure Monitor and
              Managed Grafana.
            </p>
          </div>

          <dl className="col-span-12 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line text-sm sm:grid-cols-2 md:col-span-7">
            {[
              { k: "City", v: site.location },
              { k: "Email", v: site.email, href: `mailto:${site.email}` },
              { k: "Degree", v: "Trade certificate · Skilled ICT Service Operator" },
              { k: "Freelance", v: "Available", tone: "accent" },
            ].map((item) => (
              <div
                key={item.k}
                className="bg-bg p-5 transition-colors hover:bg-surface"
              >
                <dt className="flex items-center gap-2 font-display text-[12px] uppercase tracking-[0.18em] text-fg-3">
                  <ChevronRight size={11} className="text-accent" /> {item.k}
                </dt>
                <dd className="mt-2">
                  {item.href ? (
                    <a
                      href={item.href}
                      className="text-fg hover:text-accent break-all"
                      {...(item.href.startsWith("http")
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                    >
                      {item.v}
                    </a>
                  ) : item.tone === "accent" ? (
                    <span className="inline-flex items-center gap-2 text-accent">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />
                      {item.v}
                    </span>
                  ) : (
                    <span className="text-fg break-words">{item.v}</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Long-form bio */}
      <section className="mt-24 grid grid-cols-12 gap-12">
        <div className="col-span-12 md:col-span-8 space-y-6 text-fg-2 leading-relaxed text-lg">
          <p>
            I&apos;m a Cloud Engineer in the Public Cloud Transformation team
            at <strong className="text-fg">Orange Business</strong>, working
            directly with customers on the Azure infrastructure that runs their
            environments. Most days I am shaping AKS platforms, configuring
            Azure networking (Virtual WAN, ExpressRoute, Front Door) and setting
            up observability with Azure Monitor, Managed Grafana and
            OpenTelemetry. The whole thing runs behind Terraform and a CI/CD
            pipeline, so infrastructure changes become pull requests you can
            read at a glance.
          </p>
          <p>
            I came up through operations. My first role at Basefarm /
            Orange Business was in the Operations Center, doing first-line
            support across day, evening and solo night shifts. Linux first,
            Windows when I had to. From there it was Kubernetes, GitOps and
            the platform pieces that keep a serious cluster running: Traefik,
            External Secrets Operator, cert-manager, Prometheus. Spending
            those years on the alarm end is why my designs lean towards
            operability now. The systems I build are the ones I would have
            wanted to answer for at 03:00.
          </p>
          <p>
            Between civilian roles I spent a year as a{" "}
            <strong className="text-fg">Sea Survival, Ship Safety, Fire and
            Accident instructor</strong> in the Royal Norwegian Navy. The job
            was teaching sailors and officers to keep their head when something
            on board is on fire or filling with water. It turned out to be good
            training for incident response, too: small actions in the right
            order, done calmly by people who knew their roles before the alarm
            went off.
          </p>
          <p>
            The work I look for now is where the platform matters: healthcare,
            public-sector data, regulated SaaS. Places where &ldquo;what happens
            if this goes down&rdquo; is a more interesting question than
            &ldquo;the dashboard is briefly 404ing&rdquo;. I am at my best when
            a customer needs both architectural judgement and someone who is
            happy to SSH in at 02:00 to figure out what the kubelet is doing.
          </p>
          <p>
            Outside of work I run a six-node Talos cluster in my apartment in
            Oslo. It runs the same kind of stack I would ship to a customer:
            Cilium, ArgoCD, External Secrets, OpenTelemetry. It is where I try
            new ideas before bringing them to client work. This site runs on
            it.
          </p>
        </div>

        {/* Side: facts + values */}
        <aside className="col-span-12 md:col-span-4">
          <div className="sticky top-32 flex flex-col gap-6">
            <div className="rounded-lg border border-line bg-bg-2/40 p-6">
              <p className="font-display text-xs uppercase tracking-[0.18em] text-fg-3">
                facts &amp; figures
              </p>
              <dl className="mt-4 divide-y divide-line">
                {facts.map((f) => (
                  <div
                    key={f.k}
                    className="grid grid-cols-3 gap-3 py-2.5 font-mono text-xs"
                  >
                    <dt className="text-fg-3">{f.k}</dt>
                    <dd className="col-span-2 text-fg-2">{f.v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-lg border border-line bg-bg-2/40 p-6">
              <p className="font-display text-xs uppercase tracking-[0.18em] text-fg-3">
                principles
              </p>
              <ul className="mt-4 space-y-3 text-sm text-fg-2">
                <li className="flex gap-3">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
                  Boring is a feature. Surprises belong in birthdays, not in production.
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
                  The cluster is whatever the repo says it is.
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
                  Document for the engineer who arrives at 03:00, not for the auditor.
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
                  Hand work over so well that the customer forgets I was there.
                </li>
              </ul>
            </div>
          </div>
        </aside>
      </section>

      {/* Skills */}
      <section className="mt-32">
        <p className="font-display text-xs uppercase tracking-[0.2em] text-fg-3">
          skills
        </p>
        <h2 className="mt-5 text-h1 font-display text-fg">What I work in.</h2>

        <div className="mt-12 grid gap-12 md:grid-cols-2">
          {skillGroups.map((g) => {
            const groupSkills = skills.filter((s) => s.group === g.id);
            if (!groupSkills.length) return null;
            return (
              <Reveal key={g.id}>
                <h3 className="font-display text-xs uppercase tracking-wider text-fg-3">
                  {g.label}
                </h3>
                <ul className="mt-4 space-y-4">
                  {groupSkills.map((s) => (
                    <li key={s.label}>
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="text-fg">{s.label}</span>
                        <span className="font-mono text-xs text-fg-3">
                          {String(s.level).padStart(2, "0")}
                        </span>
                      </div>
                      <div className="mt-2 h-px w-full bg-line">
                        <div
                          className="h-px bg-accent"
                          style={{ width: `${s.level}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Interests */}
      <section className="mt-32">
        <p className="font-display text-xs uppercase tracking-[0.2em] text-fg-3">
          off the cluster
        </p>
        <h2 className="mt-5 text-h1 font-display text-fg">When I&apos;m not at a terminal.</h2>

        <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-3">
          {interests.map((it) => (
            <div key={it.title} className="bg-bg p-8">
              <h3 className="font-display text-h3 text-fg">{it.title}</h3>
              <p className="mt-3 text-sm text-fg-2 leading-relaxed">{it.body}</p>
            </div>
          ))}
        </div>
      </section>

      <CtaContact />
    </div>
  );
}
