import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";
import { Section } from "@/components/primitives/Section";
import { Button } from "@/components/primitives/Button";
import { CoverImage } from "@/components/work/Gallery";
import { StackTiles } from "@/components/work/StackTiles";
import { ArchitectureSection } from "@/components/work/ArchitectureSection";
import { mdxComponents } from "@/components/work/mdx-components";
import { getAllWork, getWorkBySlug } from "@/lib/work";
import { ArrowLeft } from "lucide-react";

export function generateStaticParams() {
  return getAllWork().map((w) => ({ slug: w.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const w = getWorkBySlug(slug);
  if (!w) return {};
  return {
    title: `${w.title} — case study`,
    description: w.summary,
  };
}

export default async function WorkDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const w = getWorkBySlug(slug);
  if (!w) notFound();

  return (
    // Case-study pages used to scroll forever — every Section had clamp(5rem,
    // 9vw, 9rem) padding top AND bottom, with a 56-64px heading-to-content
    // gap on top, and the hero left the entire right column empty. The
    // override below halves vertical padding for this route only, and the
    // hero is now a two-column grid so meta + stack share the fold with the
    // title rather than pushing the body further down.
    <main
      className="pt-20 [--space-section-y:clamp(2.5rem,5vw,4.5rem)]"
    >
      {/* 1. Header — title left, meta + stack right */}
      <Section width="wide">
        <div className="grid gap-12 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-7">
            <p className="eyebrow">
              {w.kind === "professional" ? "client" : "homelab"} · case study
            </p>
            <h1 className="mt-4 text-h1 text-fg">{w.title}</h1>
            <p className="mt-5 max-w-xl text-fg-2">{w.summary}</p>
            <div className="mt-8">
              <Button
                href="/#portfolio"
                variant="ghost"
                size="sm"
                iconLeft={<ArrowLeft size={14} aria-hidden />}
              >
                All work
              </Button>
            </div>
          </div>

          <aside className="md:col-span-5">
            <dl className="grid gap-5 sm:grid-cols-3 md:grid-cols-1 md:gap-4">
              <Row label="Role">{w.role}</Row>
              <Row label="Client">{w.client}</Row>
              <Row label="Period">{w.period}</Row>
            </dl>
            <div className="mt-6 border-t border-line pt-2">
              <StackTiles stack={w.stack} />
            </div>
          </aside>
        </div>
      </Section>

      {/* 2. Outcomes — numbered card grid, tightened */}
      {w.outcomes && w.outcomes.length > 0 && (
        <Section
          width="wide"
          eyebrow="results"
          heading="What shipped."
          className="border-t border-line bg-bg-2/40"
        >
          <ul className="grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-2 lg:grid-cols-3">
            {w.outcomes.map((o, i) => (
              <li
                key={i}
                className="flex gap-4 bg-bg p-5 transition-colors hover:bg-surface/40"
              >
                <span className="shrink-0 font-mono text-xs text-accent">
                  /{String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-sm text-fg-2 leading-snug">{o}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* 3. Architecture — interactive diagram in its own section */}
      {w.arch && (
        <Section
          width="wide"
          eyebrow="architecture"
          heading="How it fits together."
          description="Hover a node to highlight its connections. Click one to read what it does and why it is there."
          className="border-t border-line"
        >
          <ArchitectureSection arch={w.arch} />
        </Section>
      )}

      {/* Static cover image fallback for case studies without arch data */}
      {!w.arch && w.cover && (
        <Section width="wide" className="border-t border-line">
          <CoverImage src={w.cover} title={w.title} />
        </Section>
      )}

      {/* 4. Body — narrow prose column */}
      <Section width="prose" className="border-t border-line">
        <article className="prose">
          <MDXRemote source={w.body} components={mdxComponents} />
        </article>
      </Section>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1.5 text-fg">{children}</dd>
    </div>
  );
}
