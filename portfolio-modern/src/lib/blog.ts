/**
 * Tiny RSS reader for blog.nordbye.it. Fetched at build time and cached for
 * the lifetime of the build. Defensive: if the fetch fails or the feed is
 * malformed we return an empty array so the build still succeeds.
 *
 * No rss-parser dep on purpose — Hugo's RSS 2.0 output is small and stable,
 * a handful of regexes is enough.
 */

const FEED_URL = "https://blog.nordbye.it/index.xml";

export type BlogPost = {
  title: string;
  url: string;
  date: string;
  excerpt: string;
};

let cached: BlogPost[] | null = null;

export async function getLatestBlogPosts(limit = 3): Promise<BlogPost[]> {
  if (cached) return cached.slice(0, limit);

  let xml: string;
  try {
    const res = await fetch(FEED_URL, { next: { revalidate: false } });
    if (!res.ok) throw new Error(`feed ${res.status}`);
    xml = await res.text();
  } catch (err) {
    console.warn(`[blog] could not fetch ${FEED_URL}: ${(err as Error).message}`);
    cached = [];
    return cached;
  }

  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) =>
    parseItem(m[1]),
  );
  cached = items.filter((p): p is BlogPost => Boolean(p));
  return cached.slice(0, limit);
}

function parseItem(itemXml: string): BlogPost | null {
  const title = pick(itemXml, "title");
  const link = pick(itemXml, "link");
  const pub = pick(itemXml, "pubDate");
  const desc = pick(itemXml, "description");
  if (!title || !link) return null;
  return {
    title: decode(title).trim(),
    url: link.trim(),
    date: pub ? formatDate(pub) : "",
    excerpt: snippet(desc, 160),
  };
}

function pick(xml: string, tag: string): string {
  // Hugo wraps some fields in CDATA, others not — handle both.
  const cdata = xml.match(
    new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`),
  );
  if (cdata) return cdata[1];
  const plain = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return plain ? plain[1] : "";
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&rsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&hellip;/g, "…");
}

function snippet(html: string, maxLen: number): string {
  // RSS descriptions arrive HTML-entity-encoded (`&lt;h1&gt;...`). Decode
  // first so the tag stripper can actually see the angle brackets.
  let body = decode(html);

  // Hugo embeds the post's <h1> at the top of the body — skip past it so
  // the excerpt is the actual lede, not the title repeated.
  const firstP = body.indexOf("<p");
  if (firstP > 0) body = body.slice(firstP);

  const text = body
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).replace(/\s+\S*$/, "") + "…";
}

function formatDate(rfc822: string): string {
  const d = new Date(rfc822);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
