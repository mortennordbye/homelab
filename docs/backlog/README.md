# Backlog

Known gaps that the team agreed to leave for later. Each entry has four parts: **what**, **why deferred**, **what unblocks**, **where**.

## Backups & monitoring

### Immutable snapshots for the k8s-volumes share
- **What:** decide if `k8s-volumes` gets immutable Btrfs snapshots like `k8s-backups`, and data checksumming. Synology allows checksumming only on a new share.
- **Why deferred:** the backup work shipped with this question open. The backups themselves are protected on `k8s-backups`.
- **Unblock:** a decision on whether live volumes need point-in-time protection in addition to the nightly VolSync copies. A migration to a new share also needs a maintenance window.
- **Where:** DSM Snapshot Replication and Shared Folder settings. Record the result in `docs/platform/backups/README.md` under "Configured outside Git".

### Grafana Git Sync down until 13.3.1
- **What:** upgrade Grafana to 13.3.1, remove the temporary dashboard copies, and check that Git Sync restores them. GitHub rejects the `nanogit/0` User-Agent. Grafana reports this as `secure.token: not authorized` and skips the sync, so changes under `grafana/` do not reach Grafana.
- **Why deferred:** the fix is not released. Until then the 7 dashboards are imported through the API into the `homelab-temp` folder. They do not follow `main` and cannot save back to git.
- **Unblock:** Grafana 13.3.1 ([issue](https://github.com/grafana/grafana/issues/136913), [fix](https://github.com/grafana/grafana/pull/136929)). Roll it out and delete the `homelab-temp` folder and its dashboards. Then confirm that the `homelab` Repository is healthy, that the dashboards are back in the Homelab folder, and that SPOG has no Live architecture row. Delete `homelab-temp` only after the new version runs, so the dashboards are missing for the shortest time.
- **Where:** Grafana image tag in `k8s/talos/infra/kube-prometheus-stack/`, `k8s/talos/infra/kube-prometheus-stack/git-sync.yaml`, `grafana/`.

## Platform

### Non-root image for verksted
- **What:** replace the `verksted-restricted` exception on the app image with an image that starts as non-root and drops all capabilities. The `docker:*-dind` sidecar keeps its exception.
- **Why deferred:** the backend starts every agent process as `vk-agent`, which needs root. The change is to how verksted runs agents, in its own repo. The exception let the restricted policy enforce without that change.
- **Unblock:** a verksted release that starts agents without root. Then remove `ghcr.io/mortennordbye/verksted:*` from the exception and check that admission still accepts a server-side dry-run of the Deployment.
- **Where:** `k8s/talos/infra/kyverno/policyexception-host-access.yaml`, `k8s/talos/apps/verksted/deployment.yaml`, the verksted repo.

### OpenCost rates come from an estimated 100 W
- **What:** the OpenCost rates assume the cluster draws 100 W, split 85/15 between CPU and memory. Replace that with a measured draw, then recompute both rates.
- **Why deferred:** no host has a power meter, and OpenCost was useful without one. The page labels the value as an estimate.
- **Unblock:** a smart plug or meter on the three hosts, read for one week that includes night transcodes. The formula is in `docs/platform/observability/costs.md`.
- **Where:** `k8s/talos/infra/opencost/values.yaml` (`customPricing`), `docs/platform/observability/costs.md`.

### Image provenance beyond the stage portfolio
- **What:** `verify-first-party-images` audits one image in one namespace. Extend attestation to the blog, headroom, innestemme, logeverylift, reelsmith and verksted builds. Widen the policy to prod and to those images, with each repo's workflow as an identity. Then decide on `Deny`.
- **Why deferred:** each matched Pod takes 4 to 5 seconds to verify. That is about 5 of the 26 seconds of a stage wake from zero, and whether KEDA apps can accept that is a decision. Prod needs an attested image first, and portfolio's prod promotions wait on a manual merge.
- **Unblock:** merge a portfolio prod promotion at or after 0.0.743. Add the attest steps from `build-portfolio.yaml` to the other builds. Decide `Deny` per app. Before `Deny`, test what a GHCR or Sigstore outage does to a wake.
- **Where:** `k8s/talos/infra/kyverno/policies/verify-first-party-images.yaml`, `.github/workflows/build-portfolio.yaml`, `.github/workflows/build-blog.yaml`, each app repo's build workflow, `docs/platform/policy/README.md`.

### Rootless images for the media stack
- **What:** replace the linuxserver images (sonarr, radarr, radarr-4k, bazarr, bazarr-4k, plex, tautulli, and qBittorrent and Prowlarr in the gluetun pod) with images that start as non-root, then drop them from `policyexception-media-root.yaml`.
- **Why deferred:** the exception was chosen over a migration while the restricted work shipped. Each swap restarts an app whose seeding and config must survive, so the work goes one app at a time. When started as non-root, the s6 init fails with `unable to set supplementary group list`.
- **Unblock:** a rootless image per app that reads the existing `/config`. Test it on a copy of the config PVC first. tdarr has no rootless build and keeps the exception.
- **Where:** `k8s/talos/apps/{arr-stack,plex-media-stack,gluetun-vpn}/`, `k8s/talos/infra/kyverno/policyexception-media-root.yaml`.

### Kyverno ClusterPolicy to ValidatingPolicy
- **What:** move the four policies from the deprecated `kyverno.io/v1` `ClusterPolicy` to the CEL `ValidatingPolicy`. Move the `kyverno.io/v2` `PolicyException` to the `policies.kyverno.io` one at the same time.
- **Why deferred:** the Pod Security policies use `validate.podSecurity`, which has no single `ValidatingPolicy` equivalent. Kyverno 1.19 still runs `ClusterPolicy` and only warns.
- **Unblock:** a Kyverno release that announces `ClusterPolicy` removal or ships a Pod Security equivalent for `ValidatingPolicy`. The Kyverno CLI (`kyverno apply`) checks the rewritten policies against rendered manifests.
- **Where:** `k8s/talos/infra/kyverno/policies/`, `k8s/talos/infra/kyverno/policyexception-monitoring.yaml`.

## AI / RAG POC

### Eval harness
- **What:** Add a small labelled QA set against the committed fixture corpus (the four `contract_<slug>.pdf` files) and a `make eval` target that scores precision@k.
- **Why deferred:** Pipeline shape, multi-document loading and the refusal prompt are validated against the fixtures in interactive runs. Quality measurement is the next layer. It needs a labelled set and a metric choice (precision@k or LLM-as-judge), and that decision did not fit in the middle of the POC.
- **Unblock:** Write 15–25 QA pairs against the four fixtures: single-doc and cross-doc questions, plus some out-of-corpus refusals. Pick the metric. Wire `make eval` to the existing chain.
- **Where:** `ai/projects/local-rag-poc/main.py`, `ai/projects/local-rag-poc/Makefile`, plus a new `ai/projects/local-rag-poc/evals/` directory.

## Infrastructure page

### Second consumer for the cluster status card

- **What:** The status card in the README reads `/api/v1/infra`, which the `status-publisher` CronJob fills. Two things were left out on purpose. The publisher still lives in the `portfolio` namespace and carries its name, although it now collects cluster-wide facts. The `/infrastructure` page still renders only the original four items (nodes, versions, ArgoCD, cert), while the payload now also carries `gitops`, `apps`, `security`, `observability`, `resources` and `storage`.
- **Why deferred:** A move of the publisher to its own namespace needs a new component to serve the JSON, because the portfolio pod serves it today. With one in-cluster consumer, that gives tidiness and no new capability. A rewrite of the `/infrastructure` page is its own design job, not part of the card.
- **Unblock:** A second in-cluster consumer (the homepage widget is the likely one). Then extract the CronJob and its RBAC into `k8s/talos/infra/` with a small nginx and a route of its own, and point the portfolio at the shared URL. The page can adopt the new keys at any time and needs no move.
- **Where:** `k8s/talos/apps/portfolio/status-publisher.yaml`, `portfolio/src/app/api/v1/infra/route.ts`, `portfolio/src/components/infrastructure/LiveStatus.tsx`, `scripts/render-status-card.mjs`, `.github/workflows/status-card.yaml`.

### The cabinet object covers only the Kubernetes hosts

- **What:** The homepage infrastructure section renders the whole estate as the BESTÅ cabinet it lives in: modem, gateway, Home Assistant box, NAS, switch, Hue bridge and the three ThinkCentres. A click on each device opens its spec. Only the three ThinkCentres have live data. The other six are drawn with their lights on and never change, because `status-publisher` reads only the Kubernetes API, ArgoCD and cert-manager. Each of those six says so in its detail panel, and `hardware.ts` carries a `live: false` flag for this.
- **Why deferred:** The NAS, the UniFi gear and the Home Assistant box each need a separate collector with separate credentials (the Synology DSM API, the UniFi controller, the Home Assistant REST API). The publisher's ServiceAccount cannot reach any of them today. That is a full integration per device, not an extension of the existing jq.
- **Unblock:** Decide which of the six to wire. The NAS is the strongest case: it holds every PV in the cluster, and DSM exposes volume and drive health over its API. That needs a credential in Bitwarden, an `ExternalSecret`, and a second collector next to the CronJob. When a device reports, set its `live` flag and drive its LEDs from the feed instead of the constant.
- **Where:** `portfolio/src/content/hardware.ts` (the `live` flag and `DEVICES`), `portfolio/src/components/infrastructure/BenchScene.tsx` (`Nas`, `Switch8`, `DeviceBox` LED constants), `k8s/talos/apps/portfolio/status-publisher.yaml`.

### Outside-in probing for the 30-day health strip
- **What:** The `/infrastructure` page renders a 30-day health strip from the per-day sample counts that the status publisher accumulates in `status.json` (`history` array). The label is "observed in-cluster" because that is all it shows. Days when the publisher never ran show as gaps. The strip cannot see when the site is unreachable from the internet while the cluster is fine, and self-reported health proves less than an external probe.
- **Why deferred:** True availability needs an external prober (Uptime Kuma on another host, healthchecks.io, or a GitHub Actions schedule that requests the site). It must publish daily results to a place the static page can fetch.
- **Unblock:** Pick the prober. Publish the daily results as JSON that the page can fetch, as a second file next to `status.json` or merged into it. Then change the strip's data source and remove the "observed in-cluster" label.
- **Where:** `portfolio/src/components/infrastructure/LiveStatus.tsx` (`buildUptime`), `k8s/talos/apps/portfolio/status-publisher.yaml` (history merge step).

## Portfolio

### SEO: the content-shaped half of the 2026-09-16 audit
- **What:** A 132-finding search/AI-visibility audit of nordbye.it was acted on for metadata only. The content and component findings were left out on purpose, except the case-study byline. The gaps are these. No direct-answer paragraph under the "How it went." heading: the first extractable block is the case-study title card on all 13 pages. No key-facts summary near the top of the 3,262-word homepage, which also has zero question-shaped headings. No outbound links to third-party authorities: every external link on the site is self-owned, while the pages state facts about GDPR, Microsoft's WAF Application Landing Zone and Norsk Helsenett. No figures on `healthcare-rhel-migration` or `postgres-tls-healthcare`: they carry zero numbers, while their siblings on the same template carry 7-8 substantive numbers each.
- **Why deferred:** The user limited the work to metadata and config: "minimal function/visualizer changes, meta data and all of that is 100% allowed". Every item above is copy or component work. Several need facts that only the author has: host counts, migration windows, measured downtime, and whether client confidentiality permits publication at all.
- **Unblock:** Decide per item whether a content pass is worth it. The numbers need the author's own recall and a confidentiality judgement. To leave them out is a valid answer. Do not let a tool invent a downtime figure to close the finding.
- **Where:** `portfolio/src/content/work/*.mdx` (copy), `portfolio/src/components/sections/` (homepage sections). Full findings: the audit run is saved at `~/.claude/plugins/data/claude-seo-ai-claude-seo-ai/runs/nordbye.it/2026-09-16T05-49-53Z/report.md`.

### Fun room: real-device pass, printer switches and melody
- **What:** The printer's rocker switches show their prompt correctly under the crosshair, but a press of `E` was reported to make no visible change in the ON/OFF pill. This was never reproduced in a browser with working pointer lock, so it can be a headless-harness artifact and not a real fault.

  Two more open items in `/fun`. The third line of the synthesised rickroll ("never gonna run around and desert you") is the least certain transcription, and nobody has listened to it. Nothing here has run on real hardware. Mouse-look and the cold-load loading bar have never run in a browser with working pointer lock. The touch controls added 2026-07-20 (drag-to-look, tap-to-activate, walk stick, entry gate) were verified only with synthetic `TouchEvent`s in headless Chromium. That proves the wiring and says nothing about feel: look sensitivity, stick size and placement, and the tap slop threshold are all guesses. Two newer pieces are in the same state: the wardrobe mirrors that swap between the live reflector and their dark stand-in half a metre outside the bedroom door, and the phone loading screen that lights the lantern, desk lamp and stove over the poster stage by stage. Both were checked in emulated headless Chromium only.
- **Why deferred:** Both need a human: one at a real browser with sound, one on a real phone. Headless Chromium cannot check either.
- **Unblock:** Open `/fun` in a real browser, look at a printer switch, press `E`, and watch the pill. If it does not flip, instrument `onActivate` in `Interactive`. The registry gives activation the ref payload, so the suspect is the hover resolution or the `enabled` gate of the keydown listener. Open `/fun` on a desktop, listen to the melody, and hard-reload with cache disabled to see the loading bar. Then open it on a phone and tune `LOOK_SENS`, `TAP_SLOP_PX` and `STICK_R` in `Touch.tsx` against the real feel.
- **Where:** `portfolio/src/components/fun/Printer.tsx` (`Switch`), `portfolio/src/components/fun/interaction.tsx`; `portfolio/src/components/fun/Sonos.tsx` (`MELODY`), `portfolio/src/components/fun/Touch.tsx`, `docs/apps/portfolio/fun-room.md`.

### Fun flat: the post marked P on the plan is not modelled
- **What:** `/fun` is the real apartment. All four spaces are walkable, the doors are hung, and the two built-ins in the entré are modelled. The one item on the floor plan that is not built is the **P** marked in the living room, a post or a flue.
- **Why deferred:** It does not change whether the flat is navigable or reads correctly, and nobody has confirmed what it is.
- **Unblock:** Confirm in the flat what the P is and its size. Then add it to `WALLS` or as a solid box, so the walker collides with it.
- **Where:** `portfolio/src/components/fun/flat.ts` (`WALLS`), `portfolio/src/components/fun/Room.tsx`.

### Fun room: content parity gaps
- **What:** `/fun` carries the site's materials, light and annotation language, but three sections of the site still have no object in the room. The hero's positioning (`site.hero.headline` / `.sub`: "I am a Cloud Engineer", Oslo, Nimtech) is never stated, so the room never says who owns it. The About narrative (the two bio paragraphs) and the portrait have no object either. Skills, interests and career all have one. `/brand` is reachable only through the terminal's `brand` command and the command palette, and no object in the room represents it.
- **Why deferred:** Left out on purpose. The re-skin, the annotation language and the shared geometry were the agreed job. New content objects are a separate design question about the shape of each one, and the room is already at about 90% content parity without them.
- **Unblock:** Decide the object for each before you model anything. `docs/apps/portfolio/brand/decisions.md` §4 rejects "click to open" as a toll gate, so each object must read at a glance from where a visitor stands. The hero is the difficult one: a room that announces a job title is a poster, not a study.
- **Where:** `portfolio/src/content/site.ts` (`hero`), `portfolio/src/components/sections/AboutSection.tsx` (the prose), `portfolio/src/app/brand/page.tsx`, `portfolio/src/components/fun/Room.tsx` (placement), `portfolio/src/components/fun/Objects.tsx` (the existing object patterns).

### Fun room: textured panels still draw one mesh each
- **What:** Door and drawer leaves draw through shared `BatchedMesh`es. The book spines and certificate frames merge, with a lit copy shown on hover. The status LEDs draw as one instanced `LedField`. The canvas-textured panels (screens, cards, paintings) still draw one mesh per piece in the measured views, each with its own texture.
- **Why deferred:** The panels differ by texture, which no batch can share.
- **Unblock:** An atlas per group of panels that share a material. Measure the four positions (spawn, then W 1.5s, A 1.5s, S 3s) before and after, as in the leaf batching PR.
- **Where:** `portfolio/src/components/fun/{Screen,Paintings,PrintedPosts}.tsx`, `portfolio/src/components/fun/StaticMerge.tsx`.

### Fun room: the hall cabinet holds 13 case studies and no more
- **What:** The case studies stand in the three bays behind the open sliding door of the hall cabinet. The career album takes the start of the top bay. With the current 13 books every bay is full. `ShelvedBooks` skips a book that finds no bay and does not report it, so a 14th case study would show in the terminal's `ls work` but never appear in the room.
- **Why deferred:** 13 is what exists today. The cabinet matches the real one in the flat, so a larger cabinet changes an object the owner chose.
- **Unblock:** When a case study is added, pick one option in order of cost: move the album out of the top bay (about three more books), lower the bay pitch to fit a fourth bay, or split the books across both halves and slide the other door open.
- **Where:** `portfolio/src/components/fun/Bookshelf.tsx` (`ShelvedBooks`), `portfolio/src/components/fun/Hallway.tsx` (`CABINET`), `portfolio/src/components/fun/Room.tsx` (the cabinet group).

### Fun room: the repo shelf holds 12 projects and no more
- **What:** The shelf has 4 x 3 compartments and `RepoShelf` draws the first 12 entries of `projectRepos`. A 13th project would be listed in the `/fun` text alternative but never appear in the room. The shelf also adds about 75 draw calls and 35k triangles in view: moving parts cannot join the static merge, and twelve icon palettes give many distinct materials.
- **Why deferred:** 12 is what exists today, and the wall between the blog covers and the hall cabinet has no room for a wider shelf.
- **Unblock:** When a 13th project is added, add a fourth row (the shelf can grow down to the toolbox) or retire an older project from the list. If the draw calls matter, merge each object's moving parts per material inside its own group.
- **Where:** `portfolio/src/components/fun/RepoShelf.tsx` (`REPO_SHELF`, `COLS`, `ROWS`), `portfolio/src/content/repos.ts` (`projectRepos`).

### Fun room: building the scene still blocks the main thread
- **What:** On a phone-class profile (4x CPU throttling, 8Mbps, cache disabled) the room still blocks the main thread while it builds behind the loading screen. The longest task is 0.63 to 0.90s (total about 1s). Most of it is the crease pass for the rounded boxes with unique sizes, which the geometry cache in `components/scene/RoundedBox.tsx` cannot share. The composer's programs now go into the parallel compile, and the first composer frame renders behind the loading screen (`compilePost` in `FunRoom.tsx`). That was verified in headless SwiftShader by the time each program links, not timed on a GPU with `KHR_parallel_shader_compile`.
- **Why deferred:** The crease pass needs a structural change: it must move off the main thread or be precomputed. A timing of the composer change needs a real GPU, which the headless harness does not have.
- **Unblock:** Compute the rounded-box normals analytically instead of with `toCreasedNormals`, or build the geometries in a worker. Measure with long tasks split at the first WebGL draw, under the profile above, in a browser with a real GPU. Check that the first frame after `SceneReady` no longer carries a long task.
- **Where:** `portfolio/src/components/scene/RoundedBox.tsx`, `portfolio/src/components/fun/FunRoom.tsx` (`SceneReady`, `compilePost`).

### Fun room: assets are served from the home uplink
- **What:** A cold `/fun` is about 2MB compressed against the production build, 1.2MB of it JavaScript. The cluster serves it with no CDN in front (Cloudflare is DNS only). Every megabyte is home-uplink bandwidth per cold visitor. Touch visitors are asked before the download, and machines without WebGL download none of it, but neither is a fix.
- **Why deferred:** The payload is small enough today and has not caused a problem. The room's models and textures are static and immutable, so a move is simple when it is worth it.
- **Unblock:** Put `public/models/fun/`, `public/textures/` and the JS chunks behind a CDN or an object store with long cache headers. Measure a cold `/fun` again against `make run-prod`. This is required before any large asset is added to the room.
- **Where:** `portfolio/public/models/fun/`, `portfolio/public/textures/`, `portfolio/next.config.ts`, `k8s/talos/apps/portfolio/httproute.yaml`.

### Lint and the Next build still run on the TypeScript 6 API
- **What:** The portfolio type-checks with TypeScript 7 (`tsc` from `@typescript/native`, an npm alias of `typescript@^7`), but `typescript` itself is an alias of `@typescript/typescript6`. TypeScript 7 ships no JS API. typescript-eslint (via `eslint-config-next`) and `next build` import `typescript` from code, so they still run on 6.x. The peer range of typescript-eslint is still `>=4.8.4 <6.1.0`. The bridge has known weak points. Two compilers check the same code (7 in `make typecheck`, 6 in lint and `next build`), so an error can show in one and not in the other. `@typescript/typescript6` pulls in the old compiler as `@typescript/old`; its `tsc` bin loses to 7's only because npm links direct dependencies first. The key `typescript` installs 6, which misleads a reader of `package.json`. Editors that use the workspace TypeScript get 6.
- **Why deferred:** This is the side-by-side setup that the TypeScript 7 release notes recommend until 7.1 ships a new API. Nothing on npm lets those tools use TS 7 yet.
- **Unblock:** TypeScript 7.1 is out and both `typescript-eslint` and `next` accept it. Then replace both aliases with a plain `"typescript": "^7.x"` and run `make lint`, `make typecheck` and `make smoke` again. If the two compilers disagree before then, or `npx tsc --version` stops reporting 7, revert to a plain `"typescript": "^6"` instead.
- **Where:** `portfolio/package.json` (`typescript`, `@typescript/native`), `portfolio/eslint.config.mjs`, `renovate.json` (the TypeScript major rule).

### The hero globe has no polar axle
- **What:** The meridian ring is placed with `rotation={[0, Math.PI / 2, TILT]}`. The default `XYZ` Euler order of three.js composes that as `Rx·Ry·Rz`, so the tilt is applied before the quarter turn and falls inside the plane of the torus. There it spins the ring and does not lean it. The plane of the ring therefore does not contain the tilted polar axis. A polar axle drawn to the radius of the ring ended in mid-air next to it and did not seat into it. Because Oslo is at 59.9°N, the free end appeared next to the Oslo pin and read as a second pin. The axle was removed on 2026-09-01 instead of a fix to the assembly.
- **Why deferred:** A change of the ring to `ZYX` puts its plane through the axis, and the axle then meets it. But it swings the lower loop of the ring clear of the pedestal collar, so the globe no longer sits in its stand. To make the ring, axle and pedestal one consistent assembly is a modelling pass on a composition that `docs/apps/portfolio/brand/decisions.md` treats as settled. It is not a one-line reorder.
- **Unblock:** Decide whether the globe must read as mechanically correct. If yes, rebuild ring, axle and pedestal together, so the plane of the ring contains the axis and the collar still meets the lowest point of the ring. Then re-cut `globe-poster.webp`.
- **Where:** `portfolio/src/components/InlineGlobeScene.tsx` (the `TILT` constant, the meridian ring mesh and the pedestal meshes).

### Two material variants still have no callers
- **What:** `Tag variant="warm"` and `Callout tone="result"` were repainted onto wood and brass, but nothing in the app renders them, so those two paths are not exercised. Every other consumer was converted in the full sweep (2026-08-23): `Button` secondary, `ServicesGrid`, the infrastructure packet dots, the command palette, the room HUD.
- **Why deferred:** Content invented to justify a variant is the wrong order. The variants are correct and wait for a real use.
- **Unblock:** The first case study that needs a Result callout, or the first tag that must read as material and not brand. Check both against the two rules of the ramp: brass takes `--fg` only, and `--fg-3` never goes on wood.
- **Where:** `portfolio/src/components/primitives/{Tag,Callout}.tsx`.

### lucide-react still backs the marks simple-icons lacks, and the fun room
- **What:** Diagrams, card covers, stack tiles and the shelf covers draw real product marks from `work/logos.ts`. `lucide-react` stays installed for two reasons. `work/brand-icons.ts` still supplies the fallback pictogram to `StackTiles`, `ArchitectureDiagram` and the no-diagram `WorkCardCover` where simple-icons has no mark (Azure, AWS, cert-manager, Telegraf, MetalLB, Wazuh, Postfix, FreeIPA, BIND, Splunk, GitOps). The fun room imports it directly for its UI and card icons.
- **Why deferred:** The missing marks have no CC0 source (simple-icons removed the Microsoft and Amazon marks). The fun room's icons are UI glyphs, not product marks. So neither has a `logos.ts` replacement.
- **Unblock:** Hand-drawn one-tone marks for the missing products, and a move of the fun room's glyphs to `components/icons.tsx`. Then delete the `Icon` field of `brand-icons.ts` and remove `lucide-react`.
- **Size:** the fun room imports about 60 lucide glyphs (`Desktop.tsx`, `Hud.tsx`, `cardIcons.ts`). A move is not worth it until the missing brand marks exist and the package can go.
- **Where:** `portfolio/src/components/work/{brand-icons.ts,StackTiles.tsx,ArchitectureDiagram.tsx,WorkCardCover.tsx}`, `portfolio/src/components/fun/{Desktop.tsx,Hud.tsx,cardIcons.ts}`, `portfolio/package.json`.

### `Callout` has no paper variant
- **What:** The case study write-up renders on a `.sheet`, and `.paper-prose` re-inks the elements that `mdx-components.tsx` hard-codes dark: headings, prose, list bullets, links, `code`, `strong`, `blockquote`. `Callout` is not covered. Its four tones are tinted panels solved against the dark ground (`border-accent/40 bg-accent/[0.06]`, and a `bg-wood` block for `result`). Each of them would sit on cream as a dark box with `text-fg-2` inside it.
- **Why deferred:** No case study uses a callout (all thirteen bodies are `##` headings, lists and paragraphs only), so there is nothing on screen to design against. A tone ramp invented for an unused component is the same mistake that the entry above records for `Tag variant="warm"`.
- **Unblock:** The first case study that needs a callout. Solve the four tones against `--paper-2` the same way the dark ones were solved against `--bg`. Add them under `.paper-prose` next to the other overrides, not as a prop on the component.
- **Where:** `portfolio/src/app/globals.css` (`.paper-prose`), `portfolio/src/components/primitives/Callout.tsx`, `portfolio/src/components/work/mdx-components.tsx`.

## Portfolio API

### Portfolio API writes: a real endpoint, and the auth to match
- **What:** `/api/v1` serves several read routes (`blog`, `github`, `infra`, `profile`, `openapi.json`), but the only write is the stateless example `POST /api/v1/echo`. A useful write (for example a guestbook, or a "notify me" capture) needs a datastore.

  Writes authenticate with a static API key today. For per-user writes that match SSO, route the write paths through Authentik (Traefik forward-auth / OIDC) instead.
- **Why deferred:** The scope was the read API and a proven auth seam. Persistence is a separate design: schema, storage, retention, abuse handling.
- **Unblock:** Pick a store: SQLite on a PVC for a single-writer app, or a plain `postgres:18-alpine` StatefulSet like the one logeverylift uses. Add a route under `src/app/api/v1/` that `requireApiKey` guards. Wire the storage and any CiliumNetworkPolicy egress it needs. Add an Authentik provider and a Traefik forward-auth middleware on the `/api/v1` POST paths, and relax `requireApiKey` to accept the forwarded identity.
- **Where:** `portfolio/src/app/api/v1/`, `portfolio/src/lib/api.ts`; `portfolio/src/lib/api.ts`, `k8s/talos/apps/portfolio/httproute.yaml`, Authentik config.

## Secrets

### Laptop keys still in the macOS Keychain
- **What:** move the keys that agents read on a workstation from the Keychain into the Bitwarden `Homelab` project, read through `bws-token`. The keys: the Hue bridge key (`hue.env`), the Home Assistant token (`ha-api` skill, item `home-assistant-mcp`), and the Quafu token (item `quafu`).
- **Why deferred:** the agent token and `bws-token` shipped first. The Hue key has no Keychain item on the current Mac, so it must be paired again, not copied.
- **Unblock:** for Hue, a press of the bridge link button while the create command in `docs/platform/secrets/README.md#device-credentials` runs. Copy HA and Quafu from the Keychain on a machine that still has them, or create new ones.
- **Where:** `hue.env` (gitignored), `ai/skills/ha-api/ha-get`, `ai/skills/ha-api/SKILL.md`, `docs/platform/post-quantum/shor.md`, `docs/platform/secrets/README.md`.

## Cluster / infra

### Cap CPU turbo on the Proxmox hosts if the fans stay loud
- **What:** `cpu.tf` sets the `powersave` governor with `balance_power`, which lowered the average CPU temperature 5-12 °C. Cores still burst to full turbo (3.8-4.0 GHz) when work queues, and the fans follow. A turbo cap, for example `intel_pstate/max_perf_pct` at 60 on hyper1 and hyper3, would keep them near 50-55 °C without the spikes.
- **Why deferred:** the user chose to accept the current noise first. A cap slows heavy jobs (tdarr, Plex CPU transcodes) up to about 40% at peak. hyper2 has only 6 threads and was 79% busy after the governor change, so a cap there can saturate its control plane and worker.
- **Unblock:** the fans are still too loud after some days, or the BIOS fan mode change does not help. Check the burst pattern on the Host CPU temperature panel first.
- **Where:** `terraform/proxmox/hyper-cluster/datacenter/cpu.tf` (add the write to the `cpu-powersave.service` unit, scoped per host), `docs/platform/cluster/proxmox.md`.

### Renew the talosconfig certificate with a Terraform apply
- **What:** The talosconfig client certificate expires **2026-12-29**. The provider reissues it during a `terraform apply` when it is within one month of expiry, so from 2026-11-29. The kubeconfig certificate is renewed through 2027-08-09. `talos_cluster_kubeconfig` uses a `2160h` `certificate_renewal_duration`, so any apply in the 90 days before that date renews it again.
- **Why deferred:** There is nothing to fix until the window opens, and the plan is clean today. A lapse only stops `talosctl` from the laptop: workloads and `kubectl` continue to run. The provider also regenerates a certificate that has expired, but an apply after expiry is not tested and its refresh can fail.
- **Unblock:** Run `terraform apply` in this directory between 2026-11-29 and 2026-12-29. Then confirm with `grep "client-certificate-data:" kubeconfig | awk '{print $2}' | base64 -d | openssl x509 -noout -enddate` and the equivalent `crt:` line in `talosconfig`. If a certificate lapses, follow "After expiry" in `docs/platform/cluster/talos.md`.
- **Where:** `terraform/proxmox/hyper-cluster/k8s/talos/talos-cluster.tf` (`talos_cluster_kubeconfig.certificate_renewal_duration`), `docs/platform/cluster/talos.md`.

### Raise `talos_config_contract` from v1.11.6
- **What:** The cluster runs Talos v1.14.1, but `talos_config_contract` is still `v1.11.6`, so the machine configuration is generated against the 1.11 contract. `kubernetes_config_contract` was raised to `v1.36.5` and is done. Talos accepts an older-contract config, so this is drift to clean up, not a fault.
- **Why deferred:** The 1.12 contract emits a separate `HostnameConfig` document with `auto: stable`, which replaces `machine.features.stableHostname`. The `config_patches` in `talos-cluster.tf` also set a static `machine.network.hostname` per node, and Talos rejects the combination: `static hostname is already set in v1alpha1 config`. `HostnameConfig` accepts `auto` or `hostname`, and the two conflict. So the static hostname must move into that document. A plain strategic-merge patch would merge `hostname` next to the generated `auto` and not replace it. To solve that at the end of the upgrade session was not worth the risk while the cluster was healthy.
- **Already tried and ruled out (2026-08-09):** To remove `machine.network.hostname` and add a `HostnameConfig` document as a second entry in `config_patches` does **not** work. The patch merges with the generated document and does not replace it. The result has `auto: stable` and `hostname: <node>` in the same document, and Talos rejects it with `HostnameConfig: 'auto' and 'hostname' cannot be set at the same time`. `auto: null` in the patch, to delete the field, does not work either. The merge still emits `auto: stable`. Verified with a plan and `apply-config --dry-run`; no cluster changes were made.
- **Do not** drop the static hostname and let `auto: stable` name the nodes. It derives hostnames from machine identity, so every node would get a new name. That orphans the existing Node objects, the PV `nodeAffinity` and the `topology.kubernetes.io/zone` labels.
- **Unblock:** The remaining option is an RFC6902 JSON patch with a `remove` op on `/auto`, targeted at the `HostnameConfig` document. That needs correct document targeting in a multi-document config. Or wait until the provider or Talos handles the migration. Verify with `talosctl apply-config --mode=auto --dry-run` on a worker and on a control plane before the apply, as `docs/platform/cluster/talos-upgrade.md` describes. In the same change, pin `machine.install.grubUseUKICmdline = false`. The provider emits `true` from the 1.12 contract, but these nodes boot through GRUB, and their running cmdline carries `talos.platform=nocloud` and `net.ifnames=0`, which the UKI's own command line would not reproduce. The 1.11 contract does not know that field, so it can only be added together with the contract bump.
- **Worth it?** Probably not yet. It is about half a day of work with a real risk of node renames, and no functional gain: Talos accepts older-contract configs for several releases, and nothing is broken. Talos 1.14 did not force it. Leave it until the Kubernetes 1.37 round does.
- **Where:** `terraform/proxmox/hyper-cluster/k8s/talos/talos-cluster.tf` (`config_patches` in both `data.talos_machine_configuration` blocks), `terraform.tfvars` (`talos_config_contract`).

### hyper1 boots an unpinned kernel
- **What:** hyper1 runs `7.0.6-2-pve`, but the intended pin is `6.14.11-9-pve`. `GRUB_DEFAULT` and `update-grub` write the correct `set default=` line to `/boot/grub/grub.cfg`, but the host still boots 7.0.6.
- **Why deferred:** GPU passthrough works on 7.0.6, and each attempt costs a hyper1 outage (`genesis-ctrl-01` and `genesis-worker-01`).
- **Unblock:** check `grub-editenv /boot/grub/grubenv list` for a `saved_entry` or `next_entry` override. Compare the submenu id in `set default` with the `--id` values in `grub.cfg`. If that does not help, use a numeric `GRUB_DEFAULT="1>2"` or `GRUB_DEFAULT=saved` with `grub-set-default`. Append the `GRUB_DEFAULT` line, do not replace it with `sed`: when the line is missing, the `sed` does nothing.
- **Where:** hyper1 `/etc/default/grub` (host config outside Git), `docs/platform/cluster/gpu-passthrough.md`.

### Kubernetes 1.37 on Genesis
- **What:** Genesis runs Talos v1.14.1 with Kubernetes v1.36.5. Talos 1.14 supports Kubernetes up to 1.37, so only the Kubernetes target remains to raise, with the two-phase flow.
- **Why deferred:** The released Cilium (1.20.2, tested to 1.36; 1.37 only on 1.21 pre-releases), cert-manager (v1.21.2) and Argo CD (3.5.3) do not support Kubernetes 1.37 yet. KEDA 2.20.2 is tested only to 1.35, and 2.21.0 is out and not checked yet.
- **Unblock:** once Cilium 1.21 is GA and cert-manager and Argo CD list 1.37, bump those first, then raise `kubernetes_version`. That round probably also needs the `talos_config_contract` entry above and the talos provider at 0.12.0. Follow `docs/platform/cluster/talos-upgrade.md`.
- **Where:** `terraform/proxmox/hyper-cluster/k8s/talos/{terraform.tfvars,upgrade-k8s.tf}`, `k8s/talos/infra/{cilium,cert-manager,argocd,keda}/`, `docs/platform/cluster/talos-upgrade.md`.

### UniFi gateway settings (`usg`) are still console-only
- **What:** every `unifi_setting` section is in `terraform/unifi/network/settings.tf` except `usg`: conntrack timeouts, the ALG modules, UPnP, redirects and the DNS verification servers.
- **Why deferred:** the provider (0.56.1) builds `usg` from its model alone, and go-unifi always sends fields that the provider does not model (`mdns_enabled`, `lldp_enable_all`, `dhcpd_use_dnsmasq`, the DHCP relay servers). A declared section would write `false` into them and could turn off mDNS across VLANs.
- **Unblock:** a provider release that reads the live `usg` section before it writes, as it does for `mgmt` and `igmp_snooping`, or that models those fields. Then declare `usg` with the live values from `/proxy/network/api/s/default/get/setting` and diff the section before and after the first apply.
- **Where:** `terraform/unifi/network/settings.tf`, provider `ubiquiti-community/unifi` (`unifi/setting_resource.go`, the `USG` branch of `Update`).

### Proxmox-CSI detach can leave a VM disk as a pending delete
- **What:** when a PVC moves off a VM while the config of that VM is locked (reboot, backup), the CSI unplug succeeds in QEMU, but the config write times out (`can't lock file '/var/lock/qemu-server/lock-<vmid>.conf'`). The disk stays in the config as a pending delete. Every vzdump of that VM fails with `Device 'drive-scsiN' not found` until someone runs `qm set <vmid> --delete scsiN`. `pbs-backup-check` fails on it and prints that command. The root cause is still in the plugin.
- **Why deferred:** the fix belongs upstream (retry the config write on a lock timeout), and the manual clear takes one minute after the check flags it.
- **Unblock:** report it to sergelogvinov/proxmox-csi-plugin with the lock-timeout log line, or adopt a release that retries.
- **Where:** `k8s/talos/infra/proxmox-csi-plugin/`, `k8s/talos/infra/backup-check/freshness.yaml`.

### UniFi follow-ups from the IoT onboarding prep
- **What:** open items after the move of the site into `terraform/unifi/network`: (1) an unidentified Wi-Fi client `WINC-00-00` (a Microchip module in some appliance) needs the new Eden-IoT password, and then a reservation and a name in `clients.tf`; (2) the Voice PE, after it joins Eden-IoT, must get a reservation there too, like the Bluetooth proxy; (3) the old state blob `unifi/firewall.tfstate` is still in the azurerm container after the move to `unifi/network.tfstate`; (4) the wireless mesh key (`x_mesh_psk`) was printed during a session and can be regenerated, although nothing uses wireless uplinks.
- **Why deferred:** (1) and (2) wait for physical devices. (3) needs the Azure login that the user controls. (4) is low risk.
- **Unblock:** (1) identify the appliance, connect it again, add `{ mac, ip }` to `local.reservations`; (2) the same for the Voice PE after setup; (3) delete the blob after `unifi/network.tfstate` has been in use for some time; (4) regenerate the key from the console if wanted.
- **Where:** `terraform/unifi/network/clients.tf`, azurerm container `tfstate` in `sttfstatemvnhomelab`.

## innestemme

### Voice PE requests in a noisy room end late
- **What:** with background talk or a TV, innestemme's energy-based end-of-speech detection can take 7 to 9 s to decide that a request ended, and the satellite's 10 s `LISTEN_TIMEOUT` then drops it. In a quiet room, requests end about 1.3 s after the speaker stops. The first short utterance after the wake word (the device's wake sound or the tail of the wake word) is transcribed and then ignored, which costs about 0.5 s of transcription.
- **Why deferred:** needs listener work in innestemme, tuned on recordings of real runs, not on guesses.
- **Unblock:** record runs in the noisy case (`dump-utterances`; the engine saves the audio of each satellite run). Then fix end-of-speech detection in `crates/voice-assistant/src/vad.rs`, and keep the run open while speech or a transcription is in progress.
- **Where:** innestemme's `crates/voice-assistant/src/vad.rs`, `crates/voice-engine/src/satellite.rs` and `crates/voice-engine/src/assistant.rs`.

### Answers with live data take 2.5 to 5 s to synthesize
- **What:** Kokoro on the node CPU (i7-8700T, 4 threads) needs about 2.5 to 3.5 s per sentence with numbers. A long departures sentence needs about 5 s. A kept lead-in plays first, so the answer starts at once, but the data follows only when it is synthesized. Light and room confirmations are kept on first use, not rendered at start.
- **Why deferred:** the lead-ins cover most of it. The rest needs engine work or more CPU.
- **Unblock:** render the confirmations for every Home Assistant light and room at start; split long data answers into shorter sentences; or give Kokoro more CPU.
- **Where:** innestemme `crates/voice-engine/src/assistant.rs`, `crates/voice-assistant/src/speech_cache.rs`; `k8s/talos/apps/innestemme/deployment.yaml`.

### The Spotify app cannot control music innestemme starts
- **What:** innestemme plays music through Music Assistant, which streams Spotify to the Sonos itself. The Spotify app shows that session as a "custom connection" that ignores pause, skip and volume. So music started by voice can only be controlled by voice, the Music Assistant app or Home Assistant. A `spotify:` link played on the Sonos's own player does not help: the Sonos queues it itself, also out of reach of the app.
- **Why deferred:** the fix is a Spotify Connect session started through the Spotify Web API. That needs a Spotify developer app and the Spotify integration in Home Assistant, both set up by hand first.
- **Unblock:** create an app at developer.spotify.com (redirect URI `https://my.home-assistant.io/redirect/oauth`, Web API). Add the Spotify integration in Home Assistant with its client ID and secret. Then let innestemme start playback on the Living Room device through the Spotify media player (Liked Songs as the `collection` context), with Music Assistant as the fallback when Spotify does not list the Sonos. Afterwards, test again the pause for a request, which today pauses only the Music Assistant player.
- **Where:** innestemme `crates/voice-assistant/src/music.rs` and `crates/voice-engine/src/assistant.rs` (`hush`/`unhush`); Home Assistant integrations.
