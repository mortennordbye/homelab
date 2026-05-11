import { ArrowUpRight, Rss } from "lucide-react";
import { SectionHeading } from "@/components/primitives/SectionHeading";
import { Reveal } from "@/components/primitives/Reveal";
import { getLatestBlogPosts } from "@/lib/blog";

export async function LatestWriting() {
  const posts = await getLatestBlogPosts(3);
  if (posts.length === 0) return null;

  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-7xl px-5 py-28 md:px-8 md:py-36">
        <SectionHeading
          eyebrow="writing"
          title="From the blog."
          description="Long-form notes from running cloud infrastructure — migrations, post-mortems, and the occasional hot take. Lives at blog.nordbye.it."
          align="between"
          cta={
            <a
              href="https://blog.nordbye.it"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 font-display text-sm text-fg-2 hover:text-fg"
            >
              <Rss size={14} /> Read the blog
              <ArrowUpRight
                size={16}
                className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </a>
          }
        />

        <ul className="mt-16 grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-3">
          {posts.map((p, i) => (
            <Reveal key={p.url} delay={i * 0.08}>
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex h-full flex-col gap-5 bg-bg p-8 transition-colors hover:bg-surface"
              >
                <p className="font-display text-xs uppercase tracking-[0.18em] text-fg-3">
                  {p.date}
                </p>
                <h3 className="text-h3 font-display text-fg leading-tight transition-colors group-hover:text-accent">
                  {p.title}
                </h3>
                <p className="flex-1 text-sm text-fg-2 leading-relaxed">{p.excerpt}</p>
                <span className="inline-flex items-center gap-2 font-display text-sm text-fg-2 transition-colors group-hover:text-accent">
                  Read post
                  <ArrowUpRight
                    size={14}
                    className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </span>
                <span
                  aria-hidden
                  className="pointer-events-none absolute right-3 top-3 font-display text-fg-3/30 group-hover:text-accent/40 transition-colors"
                >
                  +
                </span>
              </a>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
