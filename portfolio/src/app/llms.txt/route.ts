import { site } from "@/content/site";
import { getAllWork } from "@/lib/work";
import { certs } from "@/content/resume";

// Generated, not a static file in public/, so the case-study list cannot drift
// from src/content/work the way a hand-maintained copy would.
export const dynamic = "force-static";

export function GET() {
  const work = getAllWork();

  const body = `# ${site.firstName} ${site.lastName}

> ${site.description}

${site.role} based in ${site.location}. Available through Orange Business and for
direct engagements. Contact: ${site.email}

## Case studies

${work
  .map(
    (w) =>
      `- [${w.title}](${site.url}/work/${w.slug}/): ${w.summary} Client: ${w.client}. Period: ${w.period}. Stack: ${w.stack.join(", ")}.`,
  )
  .join("\n")}

## Site

- [Portfolio](${site.url}/): background, career timeline, services and contact.
- [Infrastructure](${site.url}/infrastructure/): the self-hosted Talos Kubernetes cluster this site runs on, its request path and deploy pipeline.
- [API](${site.url}/api/): public key-free JSON API, documented as OpenAPI 3.1 at ${site.url}/api/v1/openapi.json.
- [Blog](https://blog.nordbye.it/): long-form writing on Kubernetes, infrastructure and homelab engineering.

## Certifications

${certs.map((c) => `- ${c.title} — ${c.issuer}, ${c.date}`).join("\n")}

## Profiles

${site.socials.map((s) => `- ${s.label}: ${s.href}`).join("\n")}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
