import Link from "next/link";
import { Fragment } from "react";
import { site } from "@/content/site";
import { FooterStamp } from "@/components/FooterStamp";

const buildSha = (process.env.NEXT_PUBLIC_BUILD_SHA ?? "dev").slice(0, 7);
const buildYear = new Date().getFullYear();

const REPO = "https://github.com/mortennordbye/homelab";

const linkClass =
  "focus-ring text-fg underline decoration-accent decoration-2 underline-offset-4 hover:text-accent";
const rowLinkClass =
  "focus-ring underline decoration-line underline-offset-4 hover:text-accent hover:decoration-accent";

/**
 * The colophon, in the order a printer would give it: the type first, then the
 * press. The label above it says so in plain English instead, because a word
 * the reader has to look up is a word the section has to spend its first line
 * explaining.
 *
 * Every line here was read off the repository rather than remembered, which is
 * the only thing that makes a section like this worth having. What it replaced
 * was the opposite: a stamp claiming the page had been served by one of four
 * named Talos nodes, picked at random in the browser, none of which exists in
 * the cluster. Deliberately no version numbers either. Renovate moves those
 * every week and a colophon that has to be maintained by hand is a colophon
 * that quietly goes false; the live versions belong on /infrastructure, where
 * they are read from the cluster.
 */
const COLOPHON: { label: string; value: React.ReactNode }[] = [
  { label: "set in", value: "Source Serif 4 · Fragment Mono" },
  { label: "built with", value: "Next.js · React · Tailwind · TypeScript" },
  { label: "runs as", value: "distroless Node · non-root · read-only root" },
  {
    label: "runs on",
    value: (
      <Link href="/infrastructure" className={rowLinkClass}>
        a six-node Talos cluster in Oslo
      </Link>
    ),
  },
  { label: "delivered by", value: "GitHub Actions → GHCR → Kargo → ArgoCD" },
  {
    label: "source",
    value: (
      <a href={REPO} target="_blank" rel="noopener noreferrer" className={rowLinkClass}>
        mortennordbye/homelab
      </a>
    ),
  },
  {
    label: "readable as",
    value: (
      <Link href="/api" className={rowLinkClass}>
        JSON over the public API
      </Link>
    ),
  },
];

export function Footer() {
  return (
    <footer className="mt-32 section-rule bg-bg-2">
      <div className="mx-auto grid max-w-[var(--container-wide)] gap-12 px-6 py-16 md:grid-cols-12 md:gap-8 md:px-8">
        <div className="md:col-span-7">
          {/* The brass rule, like every other section head on the site. The
              bare .eyebrow this used to carry is the label for post dates and
              proof blocks, one level down from a section of its own. */}
          <p><span className="section-label">how this is made</span></p>
          <h2 className="mt-4 text-h2 text-fg">
            Built and shipped from a six-node Talos cluster in Oslo.
          </h2>
          <p className="mt-4 max-w-md text-fg-2">
            The note a printer leaves at the back of a book: the type, the
            press, the paper. This one is for a site that deploys itself. If
            you would rather look around than read, the same work is{" "}
            <Link href="/fun" className={linkClass}>
              a room you can walk through
            </Link>
            .
          </p>

          <dl className="mt-8 grid max-w-lg grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 font-mono text-xs">
            {COLOPHON.map((row) => (
              <Fragment key={row.label}>
                <dt className="whitespace-nowrap uppercase tracking-[0.14em] text-fg-3">
                  {row.label}
                </dt>
                <dd className="text-fg-2">{row.value}</dd>
              </Fragment>
            ))}
          </dl>
        </div>

        <div className="md:col-span-5">
          <p><span className="section-label">elsewhere</span></p>
          <ul className="mt-4 space-y-2">
            {site.socials.map((s) => (
              <li key={s.href}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ring text-fg-2 hover:text-fg"
                >
                  {s.label} <span aria-hidden>↗</span>
                </a>
              </li>
            ))}
            <li>
              <a
                href={`mailto:${site.email}`}
                className="focus-ring text-fg-2 hover:text-fg"
              >
                {site.email}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="section-rule">
        <div className="mx-auto flex max-w-[var(--container-wide)] flex-col gap-2 px-6 py-6 font-mono text-xs text-fg-3 md:flex-row md:items-center md:justify-between md:px-8">
          <p>
            © {buildYear} {site.name}. {site.location}.
          </p>
          <FooterStamp buildSha={buildSha} repo={REPO} />
        </div>
      </div>
    </footer>
  );
}
