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
            {/* The brass rule, not the bare .eyebrow. Every other page and
                section on the site opens with it, and a case study was the one
                place that did not — including against its own two headed
                sections further down. */}
            <p>
              <span className="section-label">
                {w.kind === "professional" ? "client" : "homelab"} · case study
              </span>
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

      {/* 2. Outcomes — lit sheets, one per outcome */}
      {w.outcomes && w.outcomes.length > 0 && (
        <Section
          width="wide"
          eyebrow="results"
          heading="What shipped."
          className="section-rule bg-bg-2/40"
        >
          {/* Was a `gap-px` grid over `bg-line`, faking dividers with the
              container's own background. Four outcomes in three columns leaves
              two empty cells, and the gutter colour filled them as a slab. A
              plain gap between lit sheets cannot do that, and §12 wanted the
              card grid converted anyway — the /01 counters go with it. */}
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {w.outcomes.map((o, i) => (
              <li key={i} className="lit p-5">
                <div className="lit-rule mb-4" />
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
          className="section-rule"
        >
          <ArchitectureSection arch={w.arch} />
        </Section>
      )}

      {/* Static cover image fallback for case studies without arch data */}
      {!w.arch && w.cover && (
        <Section width="wide" className="section-rule">
          <CoverImage src={w.cover} title={w.title} />
        </Section>
      )}

      {/* 4. The write-up, as a sheet of paper on the desk.

          It was a 65ch column centred in the viewport, so the reading edge
          jumped about 340px right of every edge above it and the page stopped
          being the same page. It is now the fourth material instead: §12 has
          it that everything is either an object or a document, and §13 settled
          that the object is the way to the artifact while reading happens in
          the document. The shelf is the object; this is what you opened.

          Left-aligned in the wide container with its own measure, so the sheet
          sets the line length without moving the edge. */}
      <Section
        width="wide"
        eyebrow="the write-up"
        heading="How it went."
        className="section-rule"
      >
        <article className="sheet max-w-[47rem] px-8 py-10 md:px-16 md:py-14">
          <p className="paper-head">{w.title} · case study</p>
          <div className="paper-prose mt-7">
            <MDXRemote source={w.body} components={mdxComponents} />
          </div>
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
