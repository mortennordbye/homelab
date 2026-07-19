/**
 * The repositories pinned on the GitHub profile.
 *
 * Only the names live here. Description, language, stars and forks all come
 * from the API at request time, so this file cannot drift out of date on any of
 * the things that actually change — and a repo that gets renamed or made
 * private drops off the board rather than displaying a stale card.
 *
 * The names are curated rather than fetched because GitHub does not expose pins
 * through the REST API at all; reading them needs an authenticated GraphQL
 * call, and a personal access token is not worth introducing to render four
 * cards on a wall. Keep this list in step with the pins on the profile.
 */
export const pinnedRepos: readonly string[] = [
  "homelab",
  "headroom",
  "lawless-waf",
  "logeverylift",
];
