/**
 * The repos pinned on the GitHub profile. Names only — everything else is
 * fetched at request time. Curated by hand because pins need an authenticated
 * GraphQL call; keep in step with the profile.
 */
export const pinnedRepos: readonly string[] = [
  "homelab",
  "headroom",
  "lawless-waf",
  "logeverylift",
];
