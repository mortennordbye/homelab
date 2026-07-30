# Migrating blog.nordbye.it from Blowfish to Northlight

Ordered plan for replacing the Blowfish theme on `blog/` with
[Northlight](https://github.com/mortennordbye/northlight), pinned at **v0.5.0**.

Northlight exists specifically to replace this blog's theme. `docs/SPEC.md` in that repo is an
audit of what this site actually uses, so the target is a deliberately *smaller* surface than
Blowfish — most of the work below is deleting things, not adding them.

---

## Status

| Phase | State |
|---|---|
| 1 — theme swap, mechanical | **Done** |
| 2 — params rewrite | **Done** |
| 3 — delete the overrides | **Done** |
| 4 — harden the stage gate | **Done** |
| 5 — cutover | **Done** — live on blog.nordbye.it since 2026-07-30 |
| 6 — clean up | **Done** — Blowfish submodule removed |

Phases 1–3 are one commit on `feat/blog-northlight-theme`. Two things went differently
from this plan, both in the direction of less work:

- **`markup.toml` was not touched at all.** Every setting in it is already what Northlight
  requires, including the `passthrough` block, which the theme supports.
- **`params.toml` kept most of its keys.** The plan assumed a wholesale rewrite; in fact
  v0.4.0 reads `heroStyle`, `layoutBackgroundBlur`, `list.cardView`, `taxonomy.cardView`,
  `taxonomy.showTermCount`, `header.layout`, `disableImageOptimization`,
  `defaultBackgroundImage`, `smartTOCHideUnfocusedChildren` and the whole `[footer]` block
  under the same names Blowfish used. Only the homepage block, the two related-content keys
  and the analytics/comments plumbing actually moved. Six palettes exist, not three:
  `periwinkle`, `sage`, `clay`, `plum`, `slate`, `rose`.

## Decisions already made

| Decision | Choice | Why |
|---|---|---|
| Theme version | Pin **v0.5.0** | Started at v0.4.0. v0.4.1 fixed the heading-level bug this migration found; v0.5.0 then shipped the theme's full code audit, pulled in so stage soaks once on the final theme rather than twice. |
| Staging | Reuse existing `blog-stage` | It already exists and already auto-promotes. No new infra. |
| Prod gate | Hold the Kargo-opened PR | The auto-opened prod PR is the human gate; do not merge it until phase 5 verification is done. |

### Why this version is enough

The pin started at v0.4.0 and moved to v0.4.1 when the heading-level bug found during this
migration was fixed and released. v0.4.1 differs from v0.4.0 by that one-line template fix and
its test, so everything below about the v0.4.0 parameter surface still holds.

v0.4.0 was already much larger than the migration needs. It ships **38 shortcodes** — including
`mermaid`, `figure`, `github`, `alert`, `chart` and `typeit`, i.e. the Blowfish surface — plus
KaTeX maths, series navigation, ten home-page layouts, RTL support and Firebase-backed view/like
counters. This blog uses none of it, which means the migration has no feature cliff to negotiate:
nothing has to be given up to make the swap, and anything wanted later is already there.

### Why v0.5.0 rather than v0.4.1

The theme had an open audit branch (`cleanup/audit-findings`, 76 files) that was rebased, merged
and released as v0.5.0 so the stage soak happens once against the theme prod will actually run.

Two things were worth catching there. The branch predated the heading fix and touched
`section.html`, so a careless rebase would have silently reverted it — confirmed after rebasing
that both `(dict "ctx" . "level" 2)` and its test assertion survived. And release-please proposed
**0.4.2**, a patch, because the squash title said `fix:`; the branch adds a print stylesheet,
`theme-color` meta tags and ~28 documented config keys, so it was forced to a minor with
`Release-As: 0.5.0`. Shipping features in a patch would break the version contract for a theme
published for other people.

Re-verified against v0.5.0 rather than assumed: strict build clean at 74 pages, structural sweep
69 pages / 0 problems, smoke green, and the home page renders identically to v0.4.1 with
`recentCount = 5` intact — the audit consolidated the Recent-posts section and had a documented
3-vs-6 default drift, so that one was checked specifically.

---

## What already works, and needs nothing

Verified against the six posts in `blog/content/blog/`:

- **Zero shortcodes.** `grep -rE '\{\{[<%]' blog/content/` returns nothing. This was the single
  largest migration risk and it is absent.
- **Covers need no renaming.** Posts use `featured.png`. Northlight's
  `layouts/_partials/cover.html` matches `{cover,featured}.*` explicitly *because* this blog uses
  `featured.*`; `cover.*` is merely the documented name.
- **Front matter is already theme-neutral** — `title`, `description`, `date`, `draft`, `tags`.
  No `featureimage`, no `series`, no Blowfish-only keys on any post.
- **No math and no Mermaid**, despite `markup.toml` enabling the `passthrough` extension.
- **`markup.toml` is already correct.** `goldmark.renderer.unsafe`, `parser.attribute.block`,
  `highlight.noClasses = false` and TOC 2–4 are all exactly what Northlight requires.
- **CI needs no change.** `build-blog.yaml` already checks out with `submodules: recursive` and
  `fetch-depth: 0`.
- **No CSP.** `blog/nginx.conf` sets none, so Northlight's inline `application/json` strings
  block and the giscus/Cloudflare third-party scripts all load.

## URL and SEO invariants

Northlight sets no custom `permalinks`, so every public URL is preserved:
`/blog/<slug>/`, `/tags/<tag>/`, `/index.xml` (RSS), `/index.json` (search index).

The only URL that disappears is `/series/`, which has zero posts. No redirect needed.

---

## Phase 1 — theme swap, mechanical

**Verify:** `docker build -t blog:ci ./blog` succeeds.

1. Add the submodule and pin it to the v0.4.0 commit. A submodule gitlink is a SHA, so the pin
   holds regardless of the `branch =` key in `.gitmodules`:

   ```bash
   git submodule add https://github.com/mortennordbye/northlight.git blog/themes/northlight
   git -C blog/themes/northlight checkout v0.4.0
   git add blog/themes/northlight
   ```

2. **Leave the Blowfish submodule in place for this phase.** Rollback stays a one-line
   `theme =` revert until stage verification passes. Remove it in phase 6.

3. `blog/Dockerfile`:
   - Builder → `ghcr.io/gohugoio/hugo:v0.164.0`. Northlight's `theme.toml` sets
     `min_version = "0.164.0"`; the current pin is `hugo_extended_0.161.1`, which is too old.
     Using the official image (rather than the amd64 tarball) matches `HUGO_IMAGE` in
     Northlight's own `Makefile`, so CI builds the site with the exact Hugo the theme is tested
     against.
   - Delete the `nodejs`, `npm`, `libstdc++`, `gcompat` packages and the
     `if [ -f package.json ]; then npm install; fi` step. Blowfish needed a Node toolchain for
     Tailwind. Northlight has none — CSS is hand-written and goes through Hugo's asset pipeline.
     This is a meaningful image-size and attack-surface reduction.

4. `blog/config/_default/config.toml`:
   - `theme = "northlight"`
   - `languageCode` → `locale` (`languageCode` is deprecated as of Hugo 0.158)
   - Drop `series` from `[taxonomies]`. Note this is now a *choice*, not a forced loss: v0.4.0
     supports a series taxonomy and renders series navigation when it is registered. Drop it
     because zero posts use it, and re-register it the day a post needs it.
   - Add a `[related]` block. **Required**, and easy to miss: Hugo's default related-content
     config indexes `keywords`, which this theme does not use, so `article.showRelated` silently
     returns nothing without it. Index the tag taxonomy and date instead.
   - `[outputs] home = ["HTML", "RSS", "JSON"]` — already correct, JSON is the search index.

5. `blog/config/_default/markup.toml`: optionally remove the `goldmark.extensions.passthrough`
   block. No post uses maths — but v0.4.0 *does* support it, via
   `layouts/_markup/render-passthrough.html` and Hugo's built-in KaTeX at build time (no
   JavaScript, no webfont, the equation is in the served HTML). So this block is harmless if left
   in. Removing it is tidiness, not a requirement. Everything else in the file stays.

---

## Phase 2 — rewrite `params.toml`

**Verify:** build with `--panicOnWarning` is clean; no param in the file goes unread.

This is a rewrite, not a patch. Roughly 130 lines of Blowfish params collapse to well under half
that. Mapping:

| Blowfish | Northlight v0.4.0 |
|---|---|
| `colorScheme = "github"` | `periwinkle` \| `sage` \| `clay` — no `github` equivalent |
| `defaultAppearance`, `autoSwitchAppearance` | unchanged |
| `enableSearch`, `enableCodeCopy`, `mainSections` | unchanged |
| `[params.homepage] layout/homepageImage/showRecent*` | `[params.home] layout`, `backgroundImage`, `showFeatured`, `recentCount` |
| `showRelatedContent` / `relatedContentLimit` | `showRelated` / `relatedLimit` |
| `[params.comments] enabled` + giscus block | `article.showComments` + `[params.comments.giscus]` |
| Cloudflare beacon in `extend-head.html` | `[params.analytics.cloudflare] token` |
| `showViews`, `showLikes` | same keys, still Firebase-backed — needs `[params.firebase]` |
| `heroStyle`, `layoutBackgroundBlur`, `cardView*`, `constrainItemsWidth` | no equivalent — delete |
| `disableImageOptimization`, `defaultBackgroundImage` | delete; see `defaultFeaturedImage` if wanted |
| `smartTOC`, `smartTOCHideUnfocusedChildren` | `article.showTableOfContents` (scroll-spy is built in) |
| `highlightCurrentMenuArea` | built in |
| `[sitemap] excludedKinds` | no equivalent; Northlight ships its own `sitemap.xml` |

`[params.author]` carries over as-is — `name`, `headline`, `bio`, `image` and the
`links = [{ linkedin = "…" }, …]` array all use the same shape in both themes.
`sharingLinks = ["linkedin", "reddit"]` is also unchanged.

New surface worth considering while the file is open: `enableLightbox`, `enableA11y`,
`showZenMode`, `showAuthorBottom`, `header.showSubNav`, `list.showSummary`, `defaultSocialImage`,
and the wider `sharingLinks` set (`mastodon`, `bluesky`, `hackernews`, `email`). All default off
or backwards-compatible — opt in deliberately, do not bulk-enable.

`menus.en.toml` needs no change: `[[main]]` and `[[footer]]` work identically.

---

## Phase 3 — delete the three local overrides

**Verify:** render a post cover at 375px / 768px / 1440px and confirm zero crop at each; giscus
loads and follows the theme toggle, not just the OS.

- **`blog/layouts/partials/hero/basic.html` → delete.** This override exists because Blowfish
  rendered covers in a fixed-height band (`h-36`/`h-56`/`h-72`) with `object-cover`, cropping the
  top and bottom off 1200×630 covers that have the title baked into the artwork. Northlight's
  `cover.html` renders an exact `aspect-ratio` box with `object-fit: contain` and declares real
  `width`/`height` so the box is reserved before the bytes arrive. **This override is the single
  reason Northlight was built** — deleting it is the point of the migration, not a side effect.
- **`blog/layouts/partials/comments.html` → delete.** giscus is built into Northlight and driven
  entirely by `[params.comments.giscus]`. The built-in version also follows the site's own
  appearance toggle rather than only `prefers-color-scheme`.
- **`blog/layouts/partials/extend-head.html` → delete.** The Cloudflare beacon token is
  currently hardcoded in a template; it becomes `[params.analytics.cloudflare] token`.
  Northlight builds the `data-cf-beacon` attribute with `jsonify` rather than string
  concatenation.
- **`blog/assets/images/background.{png,svg}` → delete** unless wired to
  `[params.home] backgroundImage`. `profile.png` stays as `author.image`.
- **`blog/content/series/_index.md` → delete**, with the taxonomy.

---

## Phase 4 — harden the stage gate *before* relying on it

**Verify:** break the theme on purpose (e.g. an empty `params.toml`) and confirm the smoke test
goes red. An assertion that cannot fail reads as coverage and is worse than none.

`blog-smoke` in `k8s/talos/infra/kargo-projects/blog.yaml` currently curls
`https://blog-stage.local.bigd.no/` and passes on any 2xx. **A visually broken Northlight build
passes that.** Since phase 5 leans on stage as the gate, the assertions have to be real:

- Grep the response for `northlight-strings` — emitted by Northlight's `baseof.html:43` and by
  nothing in Blowfish, so it proves *which theme* rendered the page.

  **Grep for the bare string, not `id="northlight-strings"`.** The build runs `--minify`, which
  strips attribute quotes, so the served markup reads `id=northlight-strings`. An assertion
  written with the quotes fails against production output while passing against an unminified
  local build — which is the worst possible failure mode for a gate. This was caught by writing
  the quoted version first and having it report zero matches on a page that plainly contained
  the block.
- Add 200 checks for `/blog/`, `/tags/` and `/index.json` (the search index — an empty or missing
  one is a silent search outage).

Keep the existing `--retry 10 --retry-delay 6`, which covers the KEDA scale-from-zero cold start.

**Done**, in the same PR as the swap rather than a separate one — the assertions were verified by
running the script directly against built output, which turned out to be stronger evidence than
landing it against Blowfish first would have been.

The script curls `/` with the long retry (which also wakes the deployment), greps for
`northlight-strings`, requests `/blog/`, `/tags/`, `/404.html` and `/index.xml`, asserts
`/index.json` contains `"title"`, and finally requests an article page whose slug it *derives from
the index* rather than hardcoding — so renaming a post cannot silently stop that check running.
`set -eu`, so any failure fails the Job.

Proven to fail, not just to pass. Against the real built site it reports
`smoke OK (theme, 4 kinds, search index, /blog/lawless-waf/)`. Against a copy with the theme
marker renamed it stops at the grep and exits 1; against a copy with `/tags/` and `/index.json`
removed it stops at the `/tags/` request and exits 22.

**The first version of this gate was too slow for its own Job deadline.** `activeDeadlineSeconds`
was 180, sized for the single curl it replaced. Eight requests with generous retries put the
worst-case retry delay alone at 132s before a byte moves, on top of the KEDA cold start, so the
Job hit its deadline and stage verification failed — which is why no prod PR opened for 0.0.88.
The site was fine; the gate was not. Fixed by raising the deadline to 300s, bounding every
request with `--max-time`, and cutting the follow-up retries from 3x4s to 2x3s, since the
deployment is already awake after the first request and long retries there buy nothing. Worst
case is now 78s of retry delay inside a 300s budget.

The requests that get grepped also send `Accept-Encoding: identity`. The stage route runs through
a Traefik compress middleware; curl sends no `Accept-Encoding` by default so it should never have
been compressed, but a `grep` against a gzipped body fails in a way that looks like a missing
string rather than an encoding problem, and that is an expensive hour for whoever hits it.

**`blog-prod-smoke` was deliberately left as the single one-line curl.** The same assertions would
be just as valuable there, but prod is served through Cloudflare while stage goes straight to
Traefik, so the response reaching the check may not be byte-identical to what nginx emitted —
edge minification or Rocket Loader would break a `grep` for markup, and a gate that fails for a
reason unrelated to the deploy is worse than the weak one it replaced. Hardening it means
confirming each assertion against the real prod response first. Recorded in `BACKLOG.md`.

---

## Phase 5 — cutover

**Verify:** all six posts plus home, `/blog/`, `/tags/`, a term page and 404, in **both** colour
modes, at 375px with no horizontal overflow. Contrast measured, not eyeballed.

1. Merge the theme swap to `main`.
2. `build-blog.yaml` builds `ghcr.io/mortennordbye/homelab/blog:0.0.<run>`.
3. The Kargo Warehouse picks it up (SemVer, `strictSemvers`), auto-promotes to `stage`, and runs
   the hardened smoke test.
4. **Soak and review on `blog-stage.local.bigd.no`.** Kargo will have auto-opened the prod PR by
   now — leave it sitting. That PR is the gate.
5. Walk every page in both modes. Palette choice (`periwinkle` / `sage` / `clay`) is a one-line
   change here, so decide it on stage rather than up front.
6. Merge the prod PR → Argo CD syncs `k8s/talos/apps/blog` → `blog-prod-smoke` runs against
   `https://blog.nordbye.it/`.
7. Purge the Cloudflare cache. Fingerprinted CSS/JS is served `immutable, max-age=31536000` by
   `nginx.conf`, and HTML at the edge will otherwise serve stale Blowfish markup referencing
   assets that no longer exist.

**Rollback:** revert the merge commit. Blowfish's submodule is still present until phase 6, so
the revert is complete and needs no separate restore.

---

## Phase 6 — clean up

Only after prod has been on Northlight long enough to trust it.

- `git submodule deinit` and remove `blog/themes/blowfish` and its `.gitmodules` entry.
- Delete `/data/repos/blowfish` locally if it is only a working copy of the submodule.
- Consider a `git-submodules` manager entry in `renovate.json`. It currently manages neither
  submodules nor the Hugo version, so both Blowfish and the Hugo pin have been bumped by hand.
  Adding it turns future Northlight releases into reviewable PRs.

---

## Phase 6 found a regression in another app

Removing the submodule meant grepping for what still referenced Blowfish, and one hit was not in
the blog at all: `portfolio/src/lib/blog.ts` parses the blog's RSS to build its cards, and read
covers out of `<media:content url="...">` — a Blowfish-ism. **Northlight emits a standard RSS
`<enclosure>` and declares no media namespace**, so from the moment prod cut over, `cover` was
`undefined` for every post and the portfolio's blog cards silently lost their images. Nothing
threw and nothing logged; the field just stopped being populated.

Measured against the live feed: the old pattern matched **0 of 6** items, the new one matches
**6 of 6**. The fix matches either shape, so the feed's cover convention is no longer something
that file has to be right about.

Worth remembering as the general lesson: the blog's output is an API that another app in this
repo consumes, and a theme swap changes it. Grepping for the old theme's name is what surfaced
it — a build-and-look pass on the blog never would have.

---

## Open items

### Fixed upstream: heading level skipped h1 → h3 on `/blog/`

**Resolved in Northlight v0.4.1** ([#28](https://github.com/mortennordbye/northlight/pull/28)).
The pin here moved from v0.4.0 to v0.4.1, the blog was rebuilt, and the structural sweep now
reports **69 pages, 0 problems, 0 dead internal links** — down from 1. `/blog/` renders
`h1` → `h2 class=card-title`. The record of what it was follows.

Found by running the theme's own `tests/structure.py` over the built output: 69 pages, 0 dead
internal links, **1 problem** — `blog/index.html: heading level jumps h1 to h3`.

It is a bug in Northlight, not in this configuration. `card.html` and `post-item.html` both take
a `level` parameter for exactly this reason, and `layouts/term.html:15` passes `"level" 2`
correctly. `layouts/section.html:24` calls `{{ partial "card.html" . }}` with a bare page, so
`$level` falls back to its default of `3` and every card title on a section index becomes an `h3`
directly under the page `h1`. The fix is one line — pass `(dict "ctx" . "level" 2)`, matching
`term.html`.

It only bites when `list.cardView = true`, which is what this blog uses (carried over from
Blowfish). Northlight's own `exampleSite` never sets it, so the card branch of `section.html` is
unreachable there and `make check` stays green — a coverage gap in the theme's suite, so the
upstream fix should also turn `cardView` on somewhere in `exampleSite` or the test cannot catch
a regression.

The fix was one line: `section.html` now passes `(dict "ctx" . "level" 2)` to `card.html`,
matching what `term.html` already did. The theme's suite gained a source assertion for it, which
was confirmed to fail on the unfixed template before being kept. The underlying gap — that no page
in the theme's own `exampleSite` sets `list.cardView`, so the card branch of `section.html` is
never built by `make check` — is recorded in that repo's `BACKLOG.md`.

### Settled: giscus `data-strict` costs nothing

The theme hardcodes `data-strict="1"` where Blowfish had `strict = false`, which looked like it
would orphan existing comments. It does not. Querying the giscus discussions API for four posts
with `strict=false` and `strict=true` returns **identical** results: three are
`404 Discussion not found` under both settings, and `blog/i-have-a-blog/` returns 200 with a
comment count of 0 under both. There are no comments on the blog to lose, and `strict` is not
what produces those 404s. No action needed.

### Raw `<img>` tags bypass the render hooks

Thirteen raw `<img src="/images/…" style="width:NN%">` tags across four posts:

| Post | Count | Widths |
|---|---|---|
| `observability-stack` | 5 | 100%, 90% |
| `lawless-waf` | 3 | 100% |
| `cilium-network-policy-rollout` | 2 | 100%, 30% |
| `kubernetes-quick-start` | 2 | 70%, 30% |

Raw HTML bypasses `layouts/_markup/render-image.html`, so these lose Northlight's figure/caption
treatment, its light/dark image variants (`diagram-dark.png` beside `diagram.png`) and lightbox
support. They will still render — `goldmark.renderer.unsafe` is on — but the inline percentage
widths were tuned against Blowfish's prose measure, not Northlight's.

Converting them to Markdown images is mechanical for the eight at 90–100%. The four at 30% and
70% (the Cilium and Kubernetes logos, the architecture diagrams) would go full-width, which is a
visual judgement call, not a find-and-replace. **Decide during the phase 5 stage soak**, when the
new measure is visible.

### Palette has no direct equivalent

Blowfish's `colorScheme = "github"` with `defaultAppearance = "dark"` maps to no specific
Northlight palette. Start on `periwinkle` (the default, and the closest in hue) with
`defaultAppearance = "dark"` to preserve the current first impression, and compare all three on
stage.

### Small losses to accept

Shorter than expected. v0.4.0 turned out to cover almost everything Blowfish did:

- giscus `strict`, `emitMetadata`, `inputPosition`, `lang` — Northlight drives `theme` from its
  own appearance toggle and does not expose the rest.
- `heroStyle`, `layoutBackgroundBlur`, `cardView*`, `constrainItemsWidth` — Blowfish layout knobs
  with no counterpart. The list and term pages are opinionated here.
- `[sitemap] excludedKinds` — Northlight ships its own `sitemap.xml`, so taxonomy and term pages
  will appear in it. Check whether that matters before cutover.
- `homepage.showMoreLink` / `showMoreLinkDest` — no equivalent, so the home page no longer has a
  "see all posts" link under the recent list. The `Blog` item in the main nav covers it, but it is
  a real difference. With `recentCount = 5` and six posts, exactly one post is reachable only via
  the nav.
- `home.backgroundImage` renders, but **only visibly in light mode.** The image
  (`assets/images/background.png`) is dark art, so in light mode it reads as a distinct dark hero
  band and in dark mode it blends into the page background and effectively disappears. Worth
  deciding on stage whether the home page wants a different layout in dark, a lighter image, or
  no background at all.

`blog/assets/images/background.svg` is not referenced by any config key and looks unused. Left in
place rather than deleted — it pre-dates this work.

`author.bio`, the homepage background image (`[params.home] backgroundImage`), `showViews` /
`showLikes`, the `series` taxonomy and KaTeX maths are all **not** losses — v0.4.0 supports every
one of them.
