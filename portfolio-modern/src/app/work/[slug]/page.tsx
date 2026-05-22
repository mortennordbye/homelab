import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";
import { Section } from "@/components/primitives/Section";
import { Tag } from "@/components/primitives/Tag";
import { Callout } from "@/components/primitives/Callout";
import { Button } from "@/components/primitives/Button";
import { Gallery, CoverImage } from "@/components/work/Gallery";
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
    <main className="pt-32">
      <Section
        eyebrow={`${w.kind === "professional" ? "client" : "homelab"} · case study`}
        heading={w.title}
        description={w.summary}
      >
        <div className="mb-10">
          <Button href="/#portfolio" variant="ghost" size="sm" iconLeft={<ArrowLeft size={14} aria-hidden />}>
            All work
          </Button>
        </div>

        <dl className="grid gap-6 border-y border-line py-6 md:grid-cols-3">
          <Row label="Role">{w.role}</Row>
          <Row label="Client">{w.client}</Row>
          <Row label="Period">{w.period}</Row>
        </dl>

        <div className="mt-6 flex flex-wrap gap-2">
          {w.stack.map((s) => (
            <Tag key={s}>{s}</Tag>
          ))}
        </div>

        {w.outcomes && w.outcomes.length > 0 && (
          <Callout tone="result" title="Outcomes">
            <ul className="space-y-2">
              {w.outcomes.map((o, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-copper" />
                  <span>{o}</span>
                </li>
              ))}
            </ul>
          </Callout>
        )}

        {w.cover && <CoverImage src={w.cover} title={w.title} />}

        {w.arch && <ArchitectureSection arch={w.arch} />}

        <article className="prose mt-12 max-w-[var(--container-prose)]">
          <MDXRemote source={w.body} components={mdxComponents} />
        </article>

        {w.gallery && w.gallery.length > 0 && (
          <Gallery images={w.gallery} title={w.title} />
        )}
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
