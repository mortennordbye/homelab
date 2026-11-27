import { getMarkdownPages } from "@/lib/markdown";

export const dynamic = "force-static";

export function GET() {
  const body = getMarkdownPages()
    .map((p) => `<!-- ${p.html} -->\n\n${p.render().trim()}`)
    .join("\n\n---\n\n");

  return new Response(`${body}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
