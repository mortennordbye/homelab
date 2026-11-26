// Every page in one file, for agents that read the whole site at once.
import type { APIRoute } from "astro";
import { absolute, pages, pageUrl, SUMMARY } from "../llms";

export const GET: APIRoute = async () => {
  const parts = (await pages()).map((p) => `# ${p.data.title}\n\nSource: ${pageUrl(p.id)}\n\n${absolute(p.body ?? "").trim()}`);
  return new Response(`# Eden docs\n\n> ${SUMMARY}\n\n${parts.join("\n\n---\n\n")}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
