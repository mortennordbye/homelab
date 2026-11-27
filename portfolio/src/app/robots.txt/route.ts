import { site } from "@/content/site";

// A route, not robots.ts: MetadataRoute.Robots has no field for Content-Signal.
export const dynamic = "force-static";

export function GET() {
  // /api itself is the docs page; only the JSON endpoints under it are kept out of search.
  const body = `User-Agent: *
Content-Signal: search=yes, ai-input=yes, ai-train=yes
Allow: /
Disallow: /api/v1/
Disallow: /api/health

Sitemap: ${site.url}/sitemap.xml
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
