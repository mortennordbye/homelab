import { ArrowUpRight, Rss } from "lucide-react";
import { Section } from "@/components/primitives/Section";
import { Reveal } from "@/components/primitives/Reveal";
import { Button } from "@/components/primitives/Button";
import { getLatestBlogPosts } from "@/lib/blog";

export async function LatestWriting() {
  const posts = await getLatestBlogPosts(3);
  if (posts.length === 0) return null;

  return (
    <Section
      id="blog"
      heading="Blog."
      description="Long-form notes from running cloud infrastructure, including migrations, post-mortems and the occasional hot take. Lives at blog.nordbye.it."
      align="between"
      className="section-rule"
      cta={
        <Button href="https://blog.nordbye.it" variant="ghost" iconLeft={<Rss size={14} aria-hidden />} iconRight={<ArrowUpRight size={16} aria-hidden />}>
          Read the blog
        </Button>
      }
    >
      <ul className="grid gap-6 md:grid-cols-3">
        {posts.map((p, i) => (
          <Reveal key={p.url} delay={i * 0.08} as="li">
            <a
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring group relative flex h-full flex-col overflow-hidden rounded-xl border border-line bg-bg transition-colors hover:border-accent/60"
            >
              {p.cover && (
                <figure className="relative aspect-[16/9] w-full overflow-hidden border-b border-line bg-surface/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.cover}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                </figure>
              )}
              <div className="flex flex-1 flex-col gap-4 p-6">
                <p className="eyebrow">{p.date}</p>
                <h3 className="text-h3 text-fg leading-tight transition-colors group-hover:text-accent">
                  {p.title}
                </h3>
                <p className="flex-1 text-sm text-fg-2 leading-relaxed">{p.excerpt}</p>
                <span className="inline-flex items-center gap-2 text-sm text-fg-2 transition-colors group-hover:text-accent">
                  Read post
                  <ArrowUpRight
                    size={14}
                    className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </span>
              </div>
            </a>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}
