import { ArrowRight } from "lucide-react";
import { Button } from "@/components/primitives/Button";
import { ContactCard } from "@/components/sections/ContactCard";
import { site } from "@/content/site";

export function CtaContact() {
  return (
    <section
      id="contact"
      className="scroll-mt-24 section-rule"
      style={{ paddingTop: "var(--space-section-y)", paddingBottom: "var(--space-section-y)" }}
    >
      <div className="mx-auto grid max-w-[var(--container-wide)] items-center gap-12 px-6 md:grid-cols-12 md:gap-8 md:px-8">
        <div className="md:col-span-6">
          <p className="eyebrow flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />
            Available · Oslo &amp; remote
          </p>
          <h2 className="mt-6 text-display-lg text-fg leading-[1]">Contact.</h2>
          <p className="mt-6 max-w-xl text-fg-2">
            Reach out about cloud engineering, platform work or consulting
            engagements. I read everything that lands in the inbox and reply
            within a couple of working days.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Button
              href={`mailto:${site.email}`}
              variant="primary"
              size="lg"
              iconRight={<ArrowRight size={16} aria-hidden />}
            >
              Write to me
            </Button>
            <Button href={`https://www.linkedin.com/in/${site.linkedin}`} variant="link">
              LinkedIn
            </Button>
          </div>
        </div>

        {/* The card is the second way to take the contact details, and the
            only one that leaves you with a file. It is not the only one:
            everything on it is also in the mailto above and in the page's
            structured data, so a browser that refuses the download or a
            reader who never discovers the gesture loses nothing. */}
        <aside className="md:col-span-6 md:justify-self-end">
          <ContactCard />
        </aside>
      </div>
    </section>
  );
}
