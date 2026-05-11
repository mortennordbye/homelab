import { ArrowRight, Mail, MapPin } from "lucide-react";
import { site } from "@/content/site";

export function CtaContact() {
  return (
    <section id="contact" className="scroll-mt-24 border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-28 md:grid-cols-12 md:gap-8 md:px-8 md:py-36">
        <div className="md:col-span-7">
          <h2 className="text-display-lg font-display text-fg leading-[1]">
            Contact.
          </h2>
          <p className="mt-6 max-w-xl text-fg-2">
            If you have any questions or would like to get in touch, feel free to reach out to me. I&apos;m always excited to connect with new people and discuss potential opportunities. Please use the contact information below to get in touch, and I&apos;ll get back to you as soon as possible.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={`mailto:${site.email}`}
              className="group inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-display text-sm text-accent-ink transition-all hover:shadow-[0_0_44px_-8px_var(--accent)]"
            >
              {site.email}
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-1"
              />
            </a>
          </div>
        </div>

        <aside className="md:col-span-5">
          <ul className="divide-y divide-line border-y border-line">
            <li className="flex items-center gap-4 py-5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line-2 text-accent">
                <Mail size={16} />
              </span>
              <div>
                <p className="font-display text-xs uppercase tracking-wider text-fg-3">email</p>
                <a href={`mailto:${site.email}`} className="text-fg hover:text-accent">
                  {site.email}
                </a>
              </div>
            </li>
            <li className="flex items-center gap-4 py-5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line-2 text-accent">
                <MapPin size={16} />
              </span>
              <div>
                <p className="font-display text-xs uppercase tracking-wider text-fg-3">based in</p>
                <p className="text-fg">{site.location}</p>
              </div>
            </li>
          </ul>
        </aside>
      </div>
    </section>
  );
}
