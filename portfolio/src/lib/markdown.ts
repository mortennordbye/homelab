import { site } from "@/content/site";
import { pageMeta } from "@/content/pages";
import { certs, education, experience, summary } from "@/content/resume";
import { services } from "@/content/services";
import { skills } from "@/content/skills";
import { interests } from "@/content/interests";
import { deployPath, platform, requestPath } from "@/content/infrastructure";
import { apiIntro, endpoints } from "@/content/api";
import * as brand from "@/content/brand";
import { getAllWork, type WorkMeta } from "@/lib/work";

/**
 * Markdown copies of the pages, for AI agents. Built from the same content
 * modules as the HTML, so a copy cannot say what its page does not.
 */

export type MarkdownPage = {
  /** Route segments under /md, e.g. ["work", "k8s-homelab"]. */
  segments: string[];
  /** The HTML page this copy mirrors. */
  html: string;
  /** The public .md URL (next.config.ts rewrites it to /md/...). */
  md: string;
  title: string;
  render: () => string;
};

const list = (items: readonly string[]) => items.map((i) => `- ${i}`).join("\n");

function table(head: string[], rows: (string | number)[][]): string {
  const line = (cells: (string | number)[]) => `| ${cells.join(" | ")} |`;
  return [line(head), line(head.map(() => "---")), ...rows.map(line)].join("\n");
}

function homeMarkdown(): string {
  const work = getAllWork();
  return `# ${site.firstName} ${site.lastName}

> ${site.description}

${site.hero.sub}

## About

${site.about.join("\n\n")}

${summary}

## Skills

${list(skills.map((s) => s.label))}

## Interests

${interests.map((i) => `### ${i.title}\n\n${i.body}${i.activities ? `\n\n${list(i.activities)}` : ""}`).join("\n\n")}

## Experience

${experience
  .map((e) => {
    const desc = Array.isArray(e.description) ? e.description : [e.description];
    return `### ${e.role}, ${e.company}\n\n${[e.location, e.period].filter(Boolean).join(" · ")}\n\n${desc.join("\n\n")}`;
  })
  .join("\n\n")}

## Education

${education.map((e) => `### ${e.title}\n\n${e.institution} · ${e.period}${e.detail ? `\n\n${e.detail}` : ""}`).join("\n\n")}

## Certifications

${list(certs.map((c) => `${c.title}, ${c.issuer}, ${c.date}${c.url ? ` (${c.url})` : ""}`))}

## Case studies

${list(work.map((w) => `[${w.title}](${site.url}/work/${w.slug}.md): ${w.summary}`))}

## Services

${services
  .map(
    (s) =>
      `### ${s.title}\n\n${s.summary}\n\n${list(s.bullets)}${s.proof ? `\n\nProof: ${s.proof.label}${s.proof.workSlug ? ` ([case study](${site.url}/work/${s.proof.workSlug}.md))` : ""}` : ""}`,
  )
  .join("\n\n")}

## Contact

- Email: ${site.email}
- Location: ${site.location}
${list(site.socials.map((s) => `${s.label}: ${s.href}`))}
`;
}

function workMarkdown(w: WorkMeta): string {
  return `# ${w.title}

> ${w.summary}

- Author: ${site.firstName} ${site.lastName}, ${site.role}
- Type: ${w.kind === "professional" ? "client case study" : "homelab case study"}
- Client: ${w.client}
- Role: ${w.role}
- Period: ${w.period}
- Stack: ${w.stack.join(", ")}

## Outcomes

${list(w.outcomes)}

${w.body.trim()}
`;
}

function infrastructureMarkdown(): string {
  const hops = (path: typeof requestPath) =>
    path.map((h, i) => `${i + 1}. ${h.name}: ${h.desc}${h.meta ? ` (${h.meta})` : ""}`).join("\n");
  return `# ${pageMeta.infrastructure.title}

> ${pageMeta.infrastructure.description}

## Request path

${hops(requestPath)}

## Deploy path

${hops(deployPath)}

## Platform

${list(platform.map((p) => `${p.name}: ${p.role}`))}

## Live status

The current cluster state is JSON at ${site.url}/api/v1/infra. The source is the public repository https://github.com/mortennordbye/homelab.
`;
}

function apiMarkdown(): string {
  return `# ${pageMeta.api.title}

> ${pageMeta.api.description}

${apiIntro.blurb}

Base URL: ${apiIntro.base}. OpenAPI 3.1: ${site.url}/api/v1/openapi.json

${endpoints
  .map(
    (e) =>
      `## ${e.method} ${e.path}\n\n${e.summary}\n\n${e.detail}\n\n- Auth: ${e.auth}\n- Caching: ${e.caching}\n\n\`\`\`sh\n${e.curl}\n\`\`\``,
  )
  .join("\n\n")}
`;
}

function funMarkdown(): string {
  const work = getAllWork();
  return `# ${pageMeta.fun.title}

> ${pageMeta.fun.description}

The room is a WebGL scene, and it holds the same content as the rest of the site. Each object below has a plain page.

## On the shelf

${list(work.map((w) => `[${w.title}](${site.url}/work/${w.slug}.md)`))}

## Elsewhere in the room

- Certifications and career timeline: ${site.url}/index.md
- Brand system: ${site.url}/brand.md
`;
}

function brandMarkdown(): string {
  const t = brand.theme;
  return `# ${pageMeta.brand.title}

> ${pageMeta.brand.description}

## Theme: ${t.name}

${t.gloss}. ${t.rule}

${t.line}

${t.intro}

${t.register.intro.join("\n\n")}

### What it is

${list(t.register.is)}

### What it is not

${list(t.register.isNot)}

### Materials

${table(["Name", "Hex", "Use"], t.materials.map((m) => [m.name, m.hex, m.use]))}

### Light

${table(["Name", "Hex", "Use"], t.light.map((m) => [m.name, m.hex, m.use]))}

### How the page behaves

${t.page.map((p) => `- ${p.rule}: ${p.detail}`).join("\n")}

### Never

${list(t.never)}

${t.tension}

## Colour

Brand hue ${brand.brandHue}, material hue ${brand.materialHue}.

${brand.colorGroups
  .map(
    (g) =>
      `### ${g.title}\n\n${g.intro ? `${g.intro}\n\n` : ""}${table(
        ["Token", "Hex", "Contrast", "Use"],
        g.swatches.map((s) => [s.name, s.hex, s.cr ?? "", s.use ?? ""]),
      )}`,
  )
  .join("\n\n")}

### Semantic

${table(
  ["Name", "Light", "Dark", "Contrast light", "Contrast dark", "Note"],
  brand.semantic.map((s) => [s.name, s.light, s.dark, s.crLight, s.crDark, s.note]),
)}

### Data series

${table(["Series", "Label", "Light", "Dark"], brand.dataSeries.map((d) => [d.name, d.label, d.light, d.dark]))}

## Type

${brand.fonts.map((f) => `### ${f.family} (${f.role})\n\n${f.why}\n\n- Weights: ${f.weights}\n- Licence: ${f.license}\n- Source: ${f.source}`).join("\n\n")}

### Scale

${table(
  ["Role", "Size", "Weight", "Line height", "Tracking", "Face"],
  brand.typeScale.map((s) => [s.role, s.size, s.weight, s.lh, s.tracking, s.face]),
)}

## Spacing, radii and motion

${table(["Spacing token", "px"], brand.spacing.map((s) => [s.token, s.px]))}

${table(["Radius token", "px", "Use"], brand.radii.map((r) => [r.token, r.px, r.use]))}

${table(["Motion token", "ms", "Easing", "Use"], brand.motion.map((m) => [m.token, m.ms, m.ease, m.use]))}

## Imagery

${brand.imagery.intro}

### On the site

${brand.imagery.onsite.intro}

${list(brand.imagery.onsite.rules)}

### Off the site

${brand.imagery.offsite.intro}

${list(brand.imagery.offsite.rules)}

## Accessibility

${brand.a11y.map((a) => `- ${a.rule}: ${a.detail}`).join("\n")}

## Licensing

${table(["Item", "Licence", "Commercial use", "Note"], brand.licensing.cleared.map((l) => [l.item, l.license, l.commercial, l.note]))}
`;
}

export function getMarkdownPages(): MarkdownPage[] {
  const page = (segments: string[], html: string, md: string, title: string, render: () => string) => ({
    segments,
    html: `${site.url}${html}`,
    md: `${site.url}${md}`,
    title,
    render,
  });
  return [
    page(["index"], "/", "/index.md", `${site.firstName} ${site.lastName}`, homeMarkdown),
    ...getAllWork().map((w) =>
      page(["work", w.slug], `/work/${w.slug}/`, `/work/${w.slug}.md`, w.title, () => workMarkdown(w)),
    ),
    page(["infrastructure"], "/infrastructure/", "/infrastructure.md", pageMeta.infrastructure.title, infrastructureMarkdown),
    page(["api"], "/api/", "/api.md", pageMeta.api.title, apiMarkdown),
    page(["fun"], "/fun/", "/fun.md", pageMeta.fun.title, funMarkdown),
    page(["brand"], "/brand/", "/brand.md", pageMeta.brand.title, brandMarkdown),
  ];
}
