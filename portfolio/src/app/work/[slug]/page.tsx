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
    <main className="pt-28">
      {/* 1. Header — wide, no top border (page top) */}
      <Section
        eyebrow={`${w.kind === "professional" ? "client" : "homelab"} · case study`}
        heading={w.title}
        description={w.summary}
        width="wide"
      >
        <div className="mb-10">
          <Button
            href="/#portfolio"
            variant="ghost"
            size="sm"
            iconLeft={<ArrowLeft size={14} aria-hidden />}
          >
            All work
          </Button>
        </div>

        <dl className="grid gap-6 border-y border-line py-6 md:grid-cols-3">
          <Row label="Role">{w.role}</Row>
          <Row label="Client">{w.client}</Row>
          <Row label="Period">{w.period}</Row>
        </dl>

        <StackTiles stack={w.stack} />
      </Section>

      {/* 2. Outcomes — numbered card grid */}
      {w.outcomes && w.outcomes.length > 0 && (
        <Section
          width="wide"
          eyebrow="results"
          heading="What shipped."
          className="border-t border-line bg-bg-2/40"
        >
          <ul className="grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-2">
            {w.outcomes.map((o, i) => (
              <li
                key={i}
                className="flex gap-5 bg-bg p-7 transition-colors hover:bg-surface/40"
              >
                <span className="shrink-0 font-mono text-xs text-accent">
                  /{String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-fg-2 leading-relaxed">{o}</p>
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
