import { json, apiError } from "@/lib/api";

// Latest posts from the Hugo blog's RSS feed. Cached for an hour (ISR): posts
// change rarely and this keeps the blog origin from being hit per request.
export const revalidate = 3600;

const FEED_URL = "https://blog.nordbye.it/index.xml";
const LIMIT = 5;

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    // &amp; last: unescaping it earlier would double-unescape inputs like
    // "&amp;lt;" into "<" (CodeQL js/double-escaping).
    .replace(/&amp;/g, "&")
    .trim();
}

function tag(item: string, name: string): string | null {
  const m = item.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1]) : null;
}

export async function GET() {
  let xml: string;
  try {
    const res = await fetch(FEED_URL, { next: { revalidate } });
    if (!res.ok) return apiError(502, `blog feed returned ${res.status}`);
    xml = await res.text();
  } catch {
    return apiError(502, "blog feed unreachable");
  }

  const posts = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map((m) => m[1])
    .map((item) => {
      const pub = tag(item, "pubDate");
      return {
        title: tag(item, "title"),
        url: tag(item, "link"),
        publishedAt: pub ? new Date(pub).toISOString() : null,
        published: pub,
      };
    })
    .filter((p) => p.title && p.url)
    .slice(0, LIMIT);

  return json({ source: FEED_URL, count: posts.length, posts });
}
