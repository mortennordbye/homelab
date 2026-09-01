import { json, apiError } from "@/lib/api";
import { pinnedRepos } from "@/content/repos";
import { site } from "@/content/site";

/**
 * Pinned repos with live stars/forks. ISR hourly: unauthenticated GitHub
 * allows 60 req/h per IP, so this must stay server-side — four requests an
 * hour total rather than per visitor.
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
