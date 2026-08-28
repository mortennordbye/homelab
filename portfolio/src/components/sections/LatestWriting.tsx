import { preconnect } from "react-dom";
import { Section } from "@/components/primitives/Section";
import { Reveal } from "@/components/primitives/Reveal";
import { Button } from "@/components/primitives/Button";
import { getLatestBlogPosts } from "@/lib/blog";

/**
 * The three newest posts, as prints lying on the desk.
 *
 * Converted from the card grid under branding/DECISIONS.md §12. The entry in
 * BACKLOG.md described this as a border problem, and it was not one: the
 * covers are the loudest thing on the front page, and swapping `rounded-xl`
 * for `.lit` would have changed the frame and left the picture.
 *
 * Two things were wrong and both are fixed here.
 *
 * The card gave each cover its own bounding box, and each cover carries its
 * own black, which is not `--bg`. Two grounds a hairline apart is what made
 * them read as rectangles pasted onto the desk. There is no box now: the
 * cover is mounted in paper with a deeper margin at the foot than the head,
 * which is what makes it a print rather than a bordered image, and it casts
 * down and to the right like everything else the lamp reaches. The type sits
 * on the ground beside it.
 *
 * And the covers are 1200x630 — the Open Graph ratio, because they are
 * authored to blog/IMAGE-STYLE.md to survive a feed. The old figure was
 * 16/9, so a sixth of every cover's width was thrown away; the observability
 * post lost the end of its own strapline. The frame declares the native ratio
 * and nothing is cropped. §8 records the same finding about the shelf, where
 * it is why the `cover` frontmatter field went unused.
 *
 * Hover is copper rather than green. §2 spends green once per view as a lit
 * point, and it goes on "Read the blog", which is the one action here.
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
