import type { Metadata } from "next";
import { Section } from "@/components/primitives/Section";
import { Reveal } from "@/components/primitives/Reveal";
import { Tag } from "@/components/primitives/Tag";
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
    <pre className="overflow-x-auto rounded-lg border border-line bg-bg-2/60 p-4 font-mono text-xs leading-relaxed text-fg-2">
      <code>{children}</code>
    </pre>
  );
}

function EndpointBlock({ endpoint }: { endpoint: Endpoint }) {
  return (
    <div className="flex flex-col gap-4 bg-bg p-8">
      <div className="flex flex-wrap items-center gap-3">
        <Tag variant={endpoint.method === "POST" ? "warm" : "accent"}>
          {endpoint.method}
        </Tag>
        <code className="font-mono text-sm text-fg">{endpoint.path}</code>
        <Tag variant="muted">{endpoint.auth}</Tag>
      </div>

      <div>
        <h3 className="text-h3 text-fg">{endpoint.summary}</h3>
        <p className="mt-3 max-w-2xl text-sm text-fg-2 leading-relaxed">
          {endpoint.detail}
        </p>
      </div>

      <dl className="font-mono text-xs text-fg-3">
        <dt className="sr-only">Cache policy</dt>
        <dd>cache-control: {endpoint.caching}</dd>
      </dl>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="eyebrow mb-2">request</p>
          <Code>{endpoint.curl}</Code>
        </div>
        <div>
          <p className="eyebrow mb-2">response</p>
          <Code>{formatSample(endpoint.sample)}</Code>
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
        <div className="grid gap-px overflow-hidden rounded-lg border border-line bg-line">
          {endpoints.map((endpoint, i) => (
            <Reveal key={endpoint.path} delay={i * 0.05}>
              <EndpointBlock endpoint={endpoint} />
            </Reveal>
          ))}
        </div>
      </Section>
    </main>
  );
}
