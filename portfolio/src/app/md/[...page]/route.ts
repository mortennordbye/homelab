import { getMarkdownPages } from "@/lib/markdown";

// Served at the public .md URLs through the rewrites in next.config.ts.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return getMarkdownPages().map((p) => ({ page: p.segments }));
}

export async function GET(_: Request, ctx: { params: Promise<{ page: string[] }> }) {
  const { page } = await ctx.params;
  const md = getMarkdownPages().find((p) => p.segments.join("/") === page.join("/"));
  if (!md) return new Response(null, { status: 404 });

  return new Response(md.render(), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
      // The HTML page stays the one search engines index.
      Link: `<${md.html}>; rel="canonical"`,
    },
  });
}
