import Link from "next/link";
import { site } from "@/content/site";
import { FooterStamp } from "@/components/FooterStamp";

const buildSha = (process.env.NEXT_PUBLIC_BUILD_SHA ?? "dev").slice(0, 7);
const buildYear = new Date().getFullYear();

export function Footer() {
  return (
    <footer className="mt-32 border-t border-line bg-bg-2">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 md:grid-cols-12 md:gap-8 md:px-8">
        <div className="md:col-span-5">
          <p className="font-display text-xs uppercase tracking-[0.2em] text-fg-3">
            colophon
          </p>
          <h2 className="mt-4 text-h2 font-display text-fg">
            Built and shipped from a six-node Talos cluster in Oslo.
          </h2>
          <p className="mt-4 max-w-md text-fg-2">
            Static-exported Next.js, served by hardened nginx in Kubernetes.
            Reconciled by ArgoCD from{" "}
            <a
              href="https://github.com/mortennordbye/Homelab"
              className="text-fg underline decoration-accent decoration-2 underline-offset-4 hover:text-accent"
            >
              this repo
            </a>
            .
          </p>
        </div>

        <div className="md:col-span-3">
          <p className="font-display text-xs uppercase tracking-[0.2em] text-fg-3">
            Sitemap
          </p>
          <ul className="mt-4 space-y-2">
            {site.nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-fg-2 hover:text-fg">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-4">
          <p className="font-display text-xs uppercase tracking-[0.2em] text-fg-3">
            Elsewhere
          </p>
          <ul className="mt-4 space-y-2">
            {site.socials.map((s) => (
              <li key={s.href}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-fg-2 hover:text-fg"
                >
                  {s.label} <span aria-hidden>↗</span>
                </a>
              </li>
            ))}
            <li>
              <a
                href={`mailto:${site.email}`}
                className="text-fg-2 hover:text-fg"
              >
                {site.email}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 font-display text-xs text-fg-3 md:flex-row md:items-center md:justify-between md:px-8">
          <p>
            © {buildYear} {site.name}. {site.location}.
          </p>
          <FooterStamp buildSha={buildSha} />
        </div>
      </div>
    </footer>
  );
}
