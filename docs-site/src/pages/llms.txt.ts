// The llms.txt index: every page with its Markdown copy, grouped by top folder.
import type { APIRoute } from "astro";
import { mdUrl, pages, SUMMARY } from "../llms";

export const GET: APIRoute = async () => {
  const groups = new Map<string, string[]>();
  for (const p of await pages()) {
    const top = p.id.split("/")[0];
    const line = `- [${p.data.title}](${mdUrl(p.id)})${p.data.description ? `: ${p.data.description}` : ""}`;
    groups.set(top, [...(groups.get(top) ?? []), line]);
  }
  const sections = [...groups].map(([top, lines]) => `## ${top[0].toUpperCase()}${top.slice(1)}\n\n${lines.join("\n")}`);
  const text = `# Eden docs\n\n> ${SUMMARY}\n\nThe full text of every page is in one file: https://docs.nordbye.it/llms-full.txt\n\n${sections.join("\n\n")}\n`;
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
