import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { MDXRemote } from "next-mdx-remote/rsc";
import { Tag } from "@/components/primitives/Tag";
import { mdxComponents } from "@/components/work/mdx-components";
import { CoverImage, Gallery } from "@/components/work/Gallery";
import { ArchitectureSection } from "@/components/work/ArchitectureSection";
import { getAllWork, getWorkBySlug } from "@/lib/work";
import { site } from "@/content/site";

export function generateStaticParams() {
  return getAllWork().map((w) => ({ slug: w.slug }));
}

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const w = getWorkBySlug(slug);
  if (!w) return {};
  const ogImage = {
    url: w.cover,
    width: 1200,
    height: 630,
    alt: `${w.title} — architecture diagram`,
  };
  return {
    title: w.title,
    description: w.summary,
    alternates: { canonical: `/work/${w.slug}/` },
    openGraph: {
      title: w.title,
      description: w.summary,
      type: "article",
      url: `${site.url}/work/${w.slug}/`,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: w.title,
      description: w.summary,
      images: [ogImage.url],
    },
  };
}

export default async function WorkDetail({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const w = getWorkBySlug(slug);
  if (!w) notFound();

  const all = getAllWork();
  const idx = all.findIndex((x) => x.slug === slug);
  const next = all[(idx + 1) % all.length];

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: site.url },
      { "@type": "ListItem", position: 2, name: "Work", item: `${site.url}/work/` },
      {
        "@type": "ListItem",
        position: 3,
        name: w.title,
        item: `${site.url}/work/${w.slug}/`,
      },
    ],
  };

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: w.title,
    description: w.summary,
    image: `${site.url}${w.cover}`,
    url: `${site.url}/work/${w.slug}/`,
    inLanguage: "en-GB",
    author: { "@id": `${site.url}/#person` },
    creator: { "@id": `${site.url}/#person` },
    publisher: { "@id": `${site.url}/#person` },
    mainEntityOfPage: `${site.url}/work/${w.slug}/`,
    keywords: w.stack,
  };

  return (
    <article className="mx-auto max-w-4xl px-5 pt-36 pb-24 md:px-8 md:pt-44">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <Link
        href="/work/"
        className="group inline-flex items-center gap-2 font-display text-xs uppercase tracking-[0.2em] text-fg-3 hover:text-fg"
      >
        <ArrowLeft
          size={14}
          className="transition-transform group-hover:-translate-x-0.5"
        />
        all work
      </Link>

      <header className="mt-10 border-b border-line pb-10">
        <p className="font-display text-xs uppercase tracking-[0.3em] text-accent">
          {w.kind === "professional" ? "client engagement" : "personal project"}
        </p>
        <h1 className="mt-6 text-display-lg font-display text-fg leading-[1]">
          {w.title}
        </h1>
        <p className="mt-6 max-w-2xl text-fg-2 text-lg leading-relaxed">
          {w.summary}
        </p>

        <dl className="mt-10 grid gap-8 md:grid-cols-4">
          <div>
            <dt className="font-display text-xs uppercase tracking-wider text-fg-3">
              Category
            </dt>
            <dd className="mt-2 text-fg capitalize">{w.kind}</dd>
          </div>
          <div>
            <dt className="font-display text-xs uppercase tracking-wider text-fg-3">
              Client
            </dt>
            <dd className="mt-2 text-fg">{w.client}</dd>
          </div>
          <div>
            <dt className="font-display text-xs uppercase tracking-wider text-fg-3">
              Role
            </dt>
            <dd className="mt-2 text-fg">{w.role}</dd>
          </div>
          <div>
            <dt className="font-display text-xs uppercase tracking-wider text-fg-3">
              Period
            </dt>
            <dd className="mt-2 text-fg">{w.period}</dd>
          </div>
        </dl>
      </header>

      {!w.arch && <CoverImage src={w.cover} title={w.title} />}

      {w.arch && <ArchitectureSection arch={w.arch} />}

      <section className="mt-16 grid gap-12 md:grid-cols-12">
        <aside className="md:col-span-4">
          <div className="sticky top-32 flex flex-col gap-8 border-l border-line pl-6">
            <div>
              <p className="font-display text-xs uppercase tracking-wider text-fg-3">
                stack
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {w.stack.map((s) => (
                  <Tag key={s}>{s}</Tag>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-display text-xs uppercase tracking-wider text-fg-3">
                outcomes
              </p>
              <ul className="mt-3 space-y-3">
                {w.outcomes.map((o) => (
                  <li key={o} className="flex gap-3 text-sm text-fg-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>

        <div className="md:col-span-8">
          <div className="prose-content">
            <MDXRemote source={w.body} components={mdxComponents} />
          </div>
        </div>
      </section>

      {w.gallery && w.gallery.length > 0 && (
        <Gallery images={w.gallery} title={w.title} />
      )}

      {next && (
        <footer className="mt-24 border-t border-line pt-10">
          <p className="font-display text-xs uppercase tracking-wider text-fg-3">
            up next
          </p>
          <Link
            href={`/work/${next.slug}/`}
            className="group mt-4 flex items-baseline justify-between gap-6"
          >
            <span className="text-h2 font-display text-fg transition-colors group-hover:text-accent">
              {next.title}
            </span>
            <ArrowUpRight
              size={20}
              className="shrink-0 text-fg-2 transition-all group-hover:text-accent group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </Link>
        </footer>
      )}
    </article>
  );
}
