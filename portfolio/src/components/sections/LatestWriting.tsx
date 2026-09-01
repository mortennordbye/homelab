import { preconnect } from "react-dom";
import { Section } from "@/components/primitives/Section";
import { Reveal } from "@/components/primitives/Reveal";
import { Button } from "@/components/primitives/Button";
import { getLatestBlogPosts } from "@/lib/blog";

/**
 * The three newest posts, as prints lying on the desk (DECISIONS.md §12).
 * No bounding box — the covers carry their own black, and a second ground a
 * hairline from `--bg` reads as a pasted rectangle. The frame declares the
 * covers' native 1200x630 OG ratio; cropping to 16/9 cuts their straplines
 * (§8). Hover is copper: §2 spends green once per view, on "Read the blog".
 */
export async function LatestWriting() {
  const posts = await getLatestBlogPosts(3);
  if (posts.length === 0) return null;

  // The covers are served by the blog rather than this origin and load lazily,
  // so the first one to scroll into view pays for a DNS lookup and a TLS
  // handshake before the image starts. Opening that connection while the
  // visitor is still at the top takes it off the path.
  preconnect("https://blog.nordbye.it");

  return (
    <Section
      id="blog"
      heading="Blog."
      description="Long-form notes from running cloud infrastructure, including migrations, post-mortems and the occasional hot take. Lives at blog.nordbye.it."
      align="between"
      className="section-rule"
      cta={
        <Button href="https://blog.nordbye.it" variant="primary">
          Read the blog
        </Button>
      }
    >
      <ul className="grid gap-10 md:grid-cols-3 md:gap-8">
        {posts.map((p, i) => (
          <Reveal key={p.url} delay={i * 0.08} as="li">
            <a
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring group block"
            >
              {p.cover && (
                <figure className="print relative">
                  {/* The wrapper is what `.print > *::after` cuts the well
                      into, so it has to be the positioned element. */}
                  <div className="relative aspect-[1200/630] w-full overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.cover}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </figure>
              )}
              <p className="eyebrow mt-6">{p.date}</p>
              <h3 className="mt-3 text-h3 text-fg leading-tight transition-colors group-hover:text-copper">
                {p.title}
              </h3>
              <p className="mt-3 text-sm text-fg-2 leading-relaxed">{p.excerpt}</p>
            </a>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}
