import type { Metadata } from "next";
import { Section } from "@/components/primitives/Section";
import { Reveal } from "@/components/primitives/Reveal";
import {
  apiIntro,
  endpoints,
  errorEnvelope,
  formatSample,
  type Endpoint,
} from "@/content/api";

export const metadata: Metadata = {
  title: "API — Morten Nordbye",
  description:
    "The public JSON API this site serves: endpoints, authentication, caching and example responses.",
};

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-[2px] border border-line bg-bg-2/60 p-4 font-mono text-xs leading-relaxed text-fg-2">
      <code>{children}</code>
    </pre>
  );
}

// Ink on paper: the sheet's version of the dark Code block above.
function PaperCode({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-[2px] border border-[rgba(58,46,29,0.35)] bg-[rgba(58,46,29,0.05)] p-3 font-mono text-[0.7rem] leading-relaxed text-[color:var(--paper-ink-2)]">
      <code>{children}</code>
    </pre>
  );
}

function EndpointEntry({ endpoint }: { endpoint: Endpoint }) {
  return (
    <div className="border-t border-[rgba(58,46,29,0.35)] py-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <code className="font-mono text-[0.82rem] text-[color:var(--paper-ink)]">
          {endpoint.method} {endpoint.path}
        </code>
        <span className="font-mono text-[0.64rem] tracking-[0.14em] text-[color:var(--paper-ink-3)] uppercase">
          {endpoint.auth}
        </span>
      </div>

      <h3 className="mt-3 text-lg font-semibold text-[color:var(--paper-ink)]">
        {endpoint.summary}
      </h3>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[color:var(--paper-ink-2)]">
        {endpoint.detail}
      </p>

      <p className="mt-3 font-mono text-[0.68rem] text-[color:var(--paper-ink-3)]">
        cache-control: {endpoint.caching}
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 font-mono text-[0.62rem] tracking-[0.16em] text-[color:var(--paper-ink-3)] uppercase">
            request
          </p>
          <PaperCode>{endpoint.curl}</PaperCode>
        </div>
        <div>
          <p className="mb-2 font-mono text-[0.62rem] tracking-[0.16em] text-[color:var(--paper-ink-3)] uppercase">
            response
          </p>
          <PaperCode>{formatSample(endpoint.sample)}</PaperCode>
        </div>
      </div>
    </div>
  );
}

export default function ApiPage() {
  return (
    <main className="pt-32">
      <Section
        eyebrow="api"
        heading="This site has a public API."
        description={apiIntro.blurb}
      >
        <div className="grid gap-8 md:grid-cols-2 md:gap-12">
          <div>
            <p className="eyebrow mb-2">base url</p>
            <Code>{apiIntro.base}</Code>
          </div>
          <div>
            <p className="eyebrow mb-2">error envelope</p>
            <Code>{formatSample(errorEnvelope)}</Code>
          </div>
        </div>

        <p className="mt-8 text-sm text-fg-2 leading-relaxed">
          The whole surface is also published as an{" "}
          <a
            href="/api/v1/openapi.json"
            className="focus-ring text-fg underline decoration-accent decoration-2 underline-offset-4 hover:text-accent"
          >
            OpenAPI 3.1 document
          </a>
          , generated from the same definitions as this page, so it can be
          imported straight into Postman, Bruno or a client generator.
        </p>
      </Section>

      <Section
        eyebrow="reference"
        heading="Endpoints."
        description={`${endpoints.length} routes. Start at the discovery index if you would rather read it as JSON.`}
        className="border-t border-line"
      >
        {/* The reference is a specification, so it is printed as one:
            a single sheet, one ruled entry per route (DECISIONS.md §13). */}
        <Reveal>
          <article className="sheet mx-auto max-w-4xl px-6 py-10 sm:px-12 sm:py-14">
            <header className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-[color:var(--paper-ink)] pb-3">
              <p className="font-mono text-[0.66rem] tracking-[0.2em] text-[color:var(--paper-ink-3)] uppercase">
                nordbye.it — API specification · v1
              </p>
              <p className="font-mono text-[0.66rem] text-[color:var(--paper-ink-3)]">
                {endpoints.length} routes
              </p>
            </header>

            {endpoints.map((endpoint) => (
              <EndpointEntry key={endpoint.path} endpoint={endpoint} />
            ))}

            <footer className="border-t border-[rgba(58,46,29,0.35)] pt-4 font-mono text-[0.64rem] text-[color:var(--paper-ink-3)]">
              generated from the same definitions as /api/v1/openapi.json
            </footer>
          </article>
        </Reveal>
      </Section>
    </main>
  );
}
