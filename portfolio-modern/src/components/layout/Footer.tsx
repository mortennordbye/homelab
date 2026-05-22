import { site } from "@/content/site";
import { FooterStamp } from "@/components/FooterStamp";

const buildSha = (process.env.NEXT_PUBLIC_BUILD_SHA ?? "dev").slice(0, 7);
const buildYear = new Date().getFullYear();

export function Footer() {
  return (
    <footer className="mt-32 border-t border-line bg-bg-2">
      <div className="mx-auto grid max-w-[var(--container-wide)] gap-12 px-6 py-16 md:grid-cols-12 md:gap-8 md:px-8">
        <div className="md:col-span-7">
          <p className="eyebrow">colophon</p>
          <h2 className="mt-4 text-h2 text-fg">
            Built and shipped from a six-node Talos cluster in Oslo.
          </h2>
          <p className="mt-4 max-w-md text-fg-2">
            Next.js, Tailwind, served by hardened nginx in Kubernetes.
            Reconciled by ArgoCD from{" "}
            <a
              href="https://github.com/mortennordbye/Homelab"
              className="focus-ring text-fg underline decoration-accent decoration-2 underline-offset-4 hover:text-accent"
            >
              this repo
            </a>
            .
          </p>
        </div>

        <div className="md:col-span-5">
          <p className="eyebrow">elsewhere</p>
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

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[var(--container-wide)] flex-col gap-2 px-6 py-6 font-mono text-xs text-fg-3 md:flex-row md:items-center md:justify-between md:px-8">
          <p>
            © {buildYear} {site.name}. {site.location}.
          </p>
          <FooterStamp buildSha={buildSha} />
        </div>
      </div>
    </footer>
  );
}
