import { site } from "@/content/site";
import { getAllWork } from "@/lib/work";
import { certs } from "@/content/resume";
import { pageMeta } from "@/content/pages";
import { mcp } from "@/content/api";

// Generated, not a static file in public/, so the case-study list cannot drift
// from src/content/work the way a hand-maintained copy would.
export const dynamic = "force-static";

export function GET() {
  const work = getAllWork();

  const body = `# ${site.firstName} ${site.lastName}

> ${site.description}

${site.role} based in ${site.location}. Available for engagements through
Nimtech. Contact: ${site.email}

MCP server (read-only, no key): ${mcp.url}. Tools: ${mcp.tools.map((t) => t.name).join(", ")}.

Every page has a Markdown copy at the .md link below. All of them in one file: ${site.url}/llms-full.txt

## Case studies

${work
  .map(
    (w) =>
      `- [${w.title}](${site.url}/work/${w.slug}.md): ${w.summary} Client: ${w.client}. Period: ${w.period}. Stack: ${w.stack.join(", ")}.`,
  )
  .join("\n")}

## Site

- [Portfolio](${site.url}/index.md): background, full experience, education, services and contact.
- [Infrastructure](${site.url}/infrastructure.md): the self-hosted Talos Kubernetes cluster this site runs on, its request path and deploy pipeline.
- [API](${site.url}/api.md): public key-free JSON API, documented as OpenAPI 3.1 at ${site.url}/api/v1/openapi.json.
- [The room](${site.url}/fun.md): ${pageMeta.fun.description}
- [Brand system](${site.url}/brand.md): the colour, type, spacing and imagery rules this site is built to.
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
