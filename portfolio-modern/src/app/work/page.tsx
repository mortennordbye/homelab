import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Tag } from "@/components/primitives/Tag";
import { Reveal } from "@/components/primitives/Reveal";
import { getAllWork } from "@/lib/work";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Work",
  description: `Selected case studies by ${site.firstName} ${site.lastName} — Kubernetes platforms, sovereign-cloud migrations, RHEL automation, and more.`,
  alternates: { canonical: "/work/" },
  openGraph: {
    title: `Work — ${site.firstName} ${site.lastName}`,
    description: `Selected case studies by ${site.firstName} ${site.lastName}, Cloud Engineer & Architect in Oslo.`,
    url: `${site.url}/work/`,
    type: "website",
  },
};

export default function WorkIndex() {
  const all = getAllWork();
  const professional = all.filter((w) => w.kind === "professional");
  const homelab = all.filter((w) => w.kind === "homelab");

  return (
    <div className="mx-auto max-w-7xl px-5 pt-36 pb-24 md:px-8 md:pt-48">
      <p className="font-display text-xs uppercase tracking-[0.3em] text-fg-3">
        work
      </p>
      <h1 className="mt-6 max-w-3xl text-display-lg font-display text-fg leading-[1]">
        Things I&apos;ve built — at work and at home.
      </h1>
      <p className="mt-6 max-w-2xl text-fg-2">
        Two tracks. <em>Client</em> covers work I have delivered for paying
        engagements. <em>Homelab</em> is the personal lab where I try ideas out
        before they reach client work.
      </p>

      <Section title="Client" items={professional} />
      <Section title="Homelab" items={homelab} />
    </div>
  );
}

function Section({
  title,
  items,
}: {
  title: string;
  items: ReturnType<typeof getAllWork>;
}) {
  return (
    <section className="mt-24">
      <div className="flex items-baseline justify-between border-b border-line pb-4">
        <h2 className="font-display text-xs uppercase tracking-[0.2em] text-fg-3">
          {title}
        </h2>
        <span className="font-mono text-xs text-fg-3">
          {String(items.length).padStart(2, "0")} entries
        </span>
      </div>

      <ul className="divide-y divide-line">
        {items.map((w, i) => (
          <Reveal key={w.slug} delay={i * 0.05} as="li">
            <Link
              href={`/work/${w.slug}/`}
              className="group flex flex-col gap-5 py-8 md:flex-row md:items-start md:gap-8"
            >
              <span className="font-mono text-xs text-fg-3 md:w-8 md:shrink-0 md:pt-3">
                {String(i + 1).padStart(2, "0")}
              </span>

              <figure className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-md border border-line bg-surface/40 md:aspect-[4/3] md:w-44">
                <Image
                  src={w.cover}
                  alt={`${w.title} — cover`}
                  fill
                  sizes="(max-width: 768px) 100vw, 176px"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                />
              </figure>

              <div className="flex-1">
                <h3 className="text-h2 font-display text-fg transition-colors group-hover:text-accent">
                  {w.title}
                </h3>
                <p className="mt-2 max-w-2xl text-fg-2">{w.summary}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {w.stack.slice(0, 6).map((s) => (
                    <Tag key={s}>{s}</Tag>
                  ))}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-4 md:flex-col md:items-end md:pt-2">
                <span className="font-display text-xs text-fg-3">{w.period}</span>
                <span className="inline-flex items-center justify-center rounded-full border border-line-2 bg-surface/40 p-3 text-fg-2 transition-all group-hover:border-accent group-hover:text-accent group-hover:translate-x-1">
                  <ArrowUpRight size={14} />
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
