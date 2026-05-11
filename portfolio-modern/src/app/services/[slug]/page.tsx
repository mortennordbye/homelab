import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { services, getService } from "@/content/services";
import { site } from "@/content/site";

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const s = getService(slug);
  if (!s) return {};
  return { title: s.title, description: s.blurb };
}

export default async function ServiceDetail({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const s = getService(slug);
  if (!s) notFound();

  return (
    <article className="mx-auto max-w-4xl px-5 pt-36 pb-24 md:px-8 md:pt-44">
      <Link
        href="/services/"
        className="group inline-flex items-center gap-2 font-display text-xs uppercase tracking-[0.2em] text-fg-3 hover:text-fg"
      >
        <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
        all services
      </Link>

      <header className="mt-10">
        <p className="font-display text-xs uppercase tracking-[0.3em] text-accent">
          service
        </p>
        <h1 className="mt-6 text-display-lg font-display text-fg leading-[1]">
          {s.title}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-fg-2 leading-relaxed">
          {s.blurb}
        </p>
      </header>

      <section className="mt-16 grid gap-12 md:grid-cols-12">
        <div className="md:col-span-7">
          <p className="text-fg-2 leading-relaxed">{s.summary}</p>
        </div>

        <div className="md:col-span-5">
          <p className="font-display text-xs uppercase tracking-wider text-fg-3">
            What&apos;s included
          </p>
          <ul className="mt-4 space-y-4">
            {s.bullets.map((b) => (
              <li key={b} className="flex gap-3 text-fg-2">
                <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <Check size={12} />
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="mt-20 flex flex-col items-start gap-4 border-t border-line pt-10 md:flex-row md:items-center md:justify-between">
        <p className="font-display text-fg max-w-md">
          Got a project in mind? Tell me what you&apos;re running and where it hurts.
        </p>
        <a
          href={`mailto:${site.email}`}
          className="group inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-display text-sm text-accent-ink transition-all hover:shadow-[0_0_44px_-8px_var(--accent)]"
        >
          Start a conversation
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </a>
      </footer>
    </article>
  );
}
