import { json, apiError } from "@/lib/api";
import { pinnedRepos, projectRepos } from "@/content/repos";
import { site } from "@/content/site";

/**
 * Pinned and project repos with live stars/forks. ISR hourly: unauthenticated
 * GitHub allows 60 req/h per IP, so this must stay server-side, and it is one
 * list request an hour rather than one per repo.
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

  let list: GhRepo[];
  try {
    // One page holds 100. Past that, the later repos silently drop out.
    const res = await fetch(`https://api.github.com/users/${owner}/repos?per_page=100&type=owner`, {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate },
    });
    if (!res.ok) return apiError(502, "github unreachable");
    list = (await res.json()) as GhRepo[];
  } catch {
    return apiError(502, "github unreachable");
  }

  const byName = new Map(list.map((r) => [r.name?.toLowerCase(), r]));
  const pick = (names: readonly string[]): Repo[] =>
    names.flatMap((name) => {
      const r = byName.get(name.toLowerCase());
      if (!r) return [];
      return [
        {
          name: r.name ?? name,
          description: r.description ?? null,
          language: r.language ?? null,
          stars: r.stargazers_count ?? 0,
          forks: r.forks_count ?? 0,
          url: r.html_url ?? `https://github.com/${owner}/${name}`,
        },
      ];
    });

  const repos = pick(pinnedRepos);
  const projects = pick(projectRepos.map((p) => p.name));
  if (!repos.length && !projects.length) return apiError(502, "github unreachable");

  return json({ owner, count: repos.length, repos, projects });
}
