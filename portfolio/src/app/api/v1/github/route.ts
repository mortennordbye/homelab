import { json, apiError } from "@/lib/api";
import { pinnedRepos } from "@/content/repos";
import { site } from "@/content/site";

/**
 * The pinned repositories, with live stars and forks.
 *
 * Cached for an hour (ISR) for the same reason the blog feed is, plus one that
 * matters more here: unauthenticated GitHub allows 60 requests an hour per IP.
 * Fetching from the browser would spend that budget per visitor and start
 * failing on any shared address. Server-side with revalidation it is four
 * requests an hour in total however many people are in the room.
 */
export const revalidate = 3600;

type Repo = {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  url: string;
};

type GhRepo = {
  name?: string;
  description?: string | null;
  language?: string | null;
  stargazers_count?: number;
  forks_count?: number;
  html_url?: string;
};

export async function GET() {
  const owner = site.github;

  const results = await Promise.all(
    pinnedRepos.map(async (name): Promise<Repo | null> => {
      try {
        const res = await fetch(`https://api.github.com/repos/${owner}/${name}`, {
          headers: { Accept: "application/vnd.github+json" },
          next: { revalidate },
        });
        if (!res.ok) return null;
        const r = (await res.json()) as GhRepo;
        return {
          name: r.name ?? name,
          description: r.description ?? null,
          language: r.language ?? null,
          stars: r.stargazers_count ?? 0,
          forks: r.forks_count ?? 0,
          url: r.html_url ?? `https://github.com/${owner}/${name}`,
        };
      } catch {
        // One unreachable repo must not empty the board.
        return null;
      }
    }),
  );

  const repos = results.filter((r): r is Repo => r !== null);
  if (!repos.length) return apiError(502, "github unreachable");

  return json({ owner, count: repos.length, repos });
}
