# Backlog

Known gaps the team has agreed to leave for later. Each entry: **what**, **why deferred**, **what unblocks**, **where**.

## Apps

### Media dedupe run: finish and clean up
- **What:** the one-off `rdfind-dedupe` pod in `arr-stack` is hardlinking duplicate media between `/data/series`, `/data/movies` and `/data/torrents/completed` (about 1850 candidate files, 5 TB of reads). When its log shows `done`: note the before and after `df` it prints, delete the pod, and unpause the Tdarr node (`genesis-worker-01`) in the Tdarr UI, which is paused so it cannot re-encode a file rdfind is about to link.
- **Why deferred:** the read is still running; a session watcher unpauses Tdarr on completion, but only while that session stays open.
- **Unblock:** `kubectl -n arr-stack logs rdfind-dedupe | tail` shows `done`.
- **Where:** pod `arr-stack/rdfind-dedupe` (not in Git), Tdarr Nodes page at `https://tdarr.local.bigd.no`.

### Mealie still hard-logs-out every 48h (upstream)
- **What:** Mealie's frontend never refreshes its access token (`mealie-recipes/mealie#7835`) — only one `/api/auth/refresh` call appears across the whole app log. At `TOKEN_TIME` (default 48h) the token expires and the axios 401 interceptor wipes the cookie and redirects to `/login`. The replica pin fixes cold-start logouts but not this.
- **Why deferred:** The only local lever is raising `TOKEN_TIME`, which delays the logout rather than fixing it; the real fix is upstream implementing a refresh loop. Not worth changing config until we know whether a 48h re-login actually bothers anyone.
- **Unblock:** Either upstream ships automatic refresh (watch #7835), or add `TOKEN_TIME` to the Deployment env with a longer window and accept the longer-lived tokens.
- **Where:** `k8s/talos/apps/mealie/deployment.yaml` (env block).

## AI / RAG POC

### Eval harness
- **What:** Add a small labelled QA set against the committed fixture corpus (the four `contract_<slug>.pdf` files) and a `make eval` target that scores precision@k.
- **Why deferred:** Pipeline shape, multi-document loading, and the refusal prompt are all validated against the fixtures interactively. Quality measurement is the obvious next layer but requires a labelled set and a metric choice (precision@k vs. LLM-as-judge) that wasn't worth deciding mid-POC.
- **Unblock:** Author 15–25 QA pairs against the four fixtures (single-doc + cross-doc questions, plus a handful of out-of-corpus refusals), pick the metric, wire `make eval` to the existing chain.
- **Where:** `ai/projects/local-rag-poc/main.py`, `ai/projects/local-rag-poc/Makefile`, plus a new `ai/projects/local-rag-poc/evals/` directory.

## Infrastructure page

### Second consumer for the cluster status card

- **What:** The status card added to the README is drawn from `/api/v1/infra`, which the `status-publisher` CronJob fills. Two things were deliberately left out. The publisher still lives in the `portfolio` namespace and is named for it even though it now collects cluster-wide facts, and the `/infrastructure` page still renders only the original four (nodes, versions, ArgoCD, cert) while the payload now also carries `gitops`, `apps`, `security`, `observability`, `resources` and `storage`.
- **Why deferred:** Moving the publisher to its own namespace means standing up something to serve the JSON, since the portfolio pod is what serves it today, and that buys tidiness rather than capability while there is only one in-cluster consumer. Rewriting the `/infrastructure` page is its own design job, not part of shipping the card.
- **Unblock:** When a second in-cluster consumer appears (the homepage widget is the likely one), extract the CronJob and its RBAC into `k8s/talos/infra/` with a small nginx and route of its own, then repoint the portfolio at the shared URL. The page adopting the new keys can happen independently and needs no move.
- **Where:** `k8s/talos/apps/portfolio/status-publisher.yaml`, `portfolio/src/app/api/v1/infra/route.ts`, `portfolio/src/components/infrastructure/LiveStatus.tsx`, `scripts/render-status-card.mjs`, `.github/workflows/status-card.yaml`.

### The cabinet object covers only the Kubernetes hosts

- **What:** The homepage infrastructure section renders the whole estate as the BESTÅ it actually lives in — modem, gateway, Home Assistant box, NAS, switch, Hue bridge and the three ThinkCentres — and every one of them is clickable for its spec. Only the three ThinkCentres are backed by live data. The other six are drawn with their lights lit and never change, because `status-publisher` reads the Kubernetes API, ArgoCD and cert-manager and nothing else. Each of those six says so in its own detail panel, and `hardware.ts` carries a `live: false` flag for exactly this.
- **Why deferred:** The NAS, the UniFi gear and the Home Assistant box are each a separate collector with separate credentials — Synology DSM's API, the UniFi controller, the Home Assistant REST API — and none of them is reachable from the publisher's ServiceAccount today. That is a whole integration per device, not an extension of the existing jq.
- **Unblock:** Decide which of the six is worth wiring. The NAS is the one with a real story (it holds every PV in the cluster) and DSM exposes volume and drive health over its API; that needs a credential in Bitwarden, an `ExternalSecret`, and a second collector alongside the CronJob. Once a device reports, flip its `live` flag and drive its LEDs from the feed instead of the constant.
- **Where:** `portfolio/src/components/infrastructure/hardware.ts` (the `live` flag and `DEVICES`), `portfolio/src/components/infrastructure/BenchScene.tsx` (`Nas`, `Switch8`, `DeviceBox` LED constants), `k8s/talos/apps/portfolio/status-publisher.yaml`.

### Outside-in probing for the 30-day health strip
- **What:** The `/infrastructure` page now renders a 30-day health strip from per-day sample counts the status publisher accumulates in `status.json` (`history` array). It is labelled "observed in-cluster" because that is all it is: days where the publisher never ran show as gaps, but the strip cannot see the site being unreachable from the internet while the cluster is fine, and self-reported health proves less than an external probe.
- **Why deferred:** True availability needs an external prober (Uptime Kuma on another host, healthchecks.io, or a GitHub Actions schedule hitting the site) publishing daily results somewhere the static page can fetch.
- **Unblock:** Pick the prober, publish daily results as JSON the page can fetch (second file next to `status.json`, or merged into it), then swap the strip's data source and drop the "observed in-cluster" qualifier.
- **Where:** `portfolio/src/components/infrastructure/LiveStatus.tsx` (`buildUptime`), `k8s/talos/apps/portfolio/status-publisher.yaml` (history merge step).

## Portfolio

### SEO: the content-shaped half of the 2026-09-16 audit
- **What:** A 132-finding search/AI-visibility audit of nordbye.it was acted on for metadata only. The content and component findings were deliberately not done: no byline on the case-study template (first-person narrative with no visible author attribution in the body); no direct-answer paragraph under the "How it went." heading, where the first extractable block is the case-study title card on all 13 pages; no key-facts summary near the top of the 3,262-word homepage, which also has zero question-shaped headings; no outbound links to third-party authorities (every external link on the site is self-owned, while the pages assert facts about GDPR, Microsoft's WAF Application Landing Zone and Norsk Helsenett); and no figures on `healthcare-rhel-migration` or `postgres-tls-healthcare`, which carry zero numeric support while their siblings on the same template carry 7-8 substantive numbers each.
- **Why deferred:** The user scoped the work to metadata and config explicitly — "minimal function/visualizer changes, meta data and all of that is 100% allowed". Every item above is copy or component work, and several need facts only the author has (host counts, migration windows, measured downtime, and whether client confidentiality permits publishing them at all).
- **Unblock:** Decide per item whether it is worth a content pass. The byline is the highest value and the cheapest — it is the site's strongest E-E-A-T signal going unattributed. The numbers need the author's own recall plus a confidentiality judgement; leaving them out is a legitimate answer. Do not let a tool invent a downtime figure to close the finding.
- **Where:** `portfolio/src/app/work/[slug]/page.tsx` (template), `portfolio/src/content/work/*.mdx` (copy), `portfolio/src/components/sections/` (homepage sections). Full findings: the audit run persisted at `~/.claude/plugins/data/claude-seo-ai-claude-seo-ai/runs/nordbye.it/2026-09-16T05-49-53Z/report.md`.

### Fun room: real-device pass, printer switches and melody
- **What:** The printer's rocker switches read their prompt correctly under the crosshair, but pressing `E` was reported to produce no visible change in the ON/OFF pill. Never reproduced in a browser with working pointer lock, so it may be a headless-harness artifact rather than a real fault.

  Two further loose ends in `/fun`. The synthesised rickroll's third line ("never gonna run around and desert you") is the least confident transcription and has never been listened to by anyone. And nothing here has been driven on real hardware: mouse-look and the cold-load loading bar have never run in a browser with working pointer lock, and the touch controls added 2026-07-20 (drag-to-look, tap-to-activate, walk stick, entry gate) were verified only by dispatching synthetic `TouchEvent`s in headless Chromium. That proves the wiring and says nothing about feel — look sensitivity, stick size and placement, and the tap slop threshold are all guesses at this point. Two newer pieces are in the same position: the wardrobe mirrors swapping between the live reflector and their dark stand-in half a metre outside the bedroom door, and the phone loading screen lighting the lantern, desk lamp and stove over the poster stage by stage. Both were checked in emulated headless Chromium only.
- **Why deferred:** Both need a human: one at a real browser with sound, one on an actual phone. Neither is checkable from headless Chromium.
- **Unblock:** Open `/fun` in a real browser, look at a printer switch, press `E`, and watch the pill. If it does not flip, instrument `onActivate` in `Interactive` — the registry hands activation the ref payload, so the suspect is either hover resolution or the keydown listener's `enabled` gate. Open `/fun` on a desktop, listen to the melody, hard-reload with cache disabled to see the loading bar. Then open it on a phone and tune `LOOK_SENS`, `TAP_SLOP_PX` and `STICK_R` in `Touch.tsx` against how it actually feels.
- **Where:** `portfolio/src/components/fun/Printer.tsx` (`Switch`), `portfolio/src/components/fun/interaction.tsx`; `portfolio/src/components/fun/Sonos.tsx` (`MELODY`), `portfolio/src/components/fun/Touch.tsx`, `docs/fun-room-guide.md` (known gaps).

### Fun flat: the parts of the plan not yet modelled
- **What:** `/fun` is the real apartment with all four spaces walkable, the north wall glazed and the entré's two built-ins modelled, but two things on the floor plan are still not built: the **P** marked in the living room (a post, or a flue), and **door leaves** for the bedroom and bathroom — those openings are cased and lined but carry no door, so neither room can be shut.
- **Why deferred:** Neither changes whether the flat is navigable or whether it reads correctly, and the shell, the windows, the merged TV bench and the furniture were the agreed passes.
- **Unblock:** The door leaves can reuse the `Door` component the front door already uses. The post needs confirming against the flat before it is worth modelling.
- **Where:** `portfolio/src/components/fun/flat.ts` (`WALLS`, `doorOpenings`), `portfolio/src/components/fun/Room.tsx` (`Door`, `DoorLining`, `Window`), `portfolio/src/components/fun/Furniture.tsx`.

### Fun room: content parity gaps
- **What:** `/fun` now carries the site's materials, light and annotation language, but three sections of the site still have no object in the room. The hero's positioning (`site.hero.headline` / `.sub` — "I am a Cloud Engineer", Oslo, Orange Business) is never stated, so the room never says who it belongs to. The About narrative (the two bio paragraphs) and the portrait have no object either, though skills, interests and career all do. And `/brand` is reachable only through the terminal's `brand` command and the command palette, with nothing in the room representing it.
- **Why deferred:** Scoped out deliberately. The re-skin, the annotation language and the shared geometry were the agreed job; adding new content objects is a separate design question about what shape each one takes, and the room is already at roughly 90% content parity without them.
- **Unblock:** Decide the object for each before modelling anything — `branding/DECISIONS.md` §4 rejects "click to open" as a toll gate, so each has to read at a glance from where a visitor stands. The hero is the awkward one: a room that announces a job title is a poster, not a study.
- **Where:** `portfolio/src/content/site.ts` (`hero`), `portfolio/src/components/sections/AboutSection.tsx` (the prose), `portfolio/src/app/brand/page.tsx`, `portfolio/src/components/fun/Room.tsx` (placement), `portfolio/src/components/fun/Objects.tsx` (the existing object patterns).

### Fun room: the interactive subtrees still draw one mesh each
- **What:** `StaticMerge` now draws the room's static meshes as one mesh per material (281 originals into 66), which took the entry view from 594 to 511 draw calls a frame and the kitchen from 506 to 374. What is left is mostly inside `Interactive`: the sideboard's devices, the kitchen and bathroom fronts, the hall cabinet's books, the certificates. A census counted 973 meshes with 970 separate materials but only 279 distinct material looks, so those subtrees are still one draw per piece.
- **Why deferred:** Everything under an `Interactive` can move, hover-highlight or switch, so it cannot be baked once at mount the way the static shell is. Merging it needs a merge that knows which parts of each object actually change.
- **Unblock:** Per interactive object, split the parts that move (a door leaf, a drawer box, a lamp shade's emissive panel) from the carcass that does not, and put the carcass outside the `Interactive` so `StaticMerge` picks it up. The big wins are the sideboard devices and the kitchen run. For repeated identical parts (the bookshelf spines, the certificate frames), `InstancedMesh` keeps per-instance picking.
- **Where:** `portfolio/src/components/fun/StaticMerge.tsx`, `portfolio/src/components/fun/{Devices,Furniture,Bookshelf,WallCertificates}.tsx`.

### Fun room: the hall cabinet holds 13 case studies and no more
- **What:** The case studies stand in the three bays behind the hall cabinet's open sliding door, with the career album taking the start of the top bay. At the current 13 books every bay is full, and `ShelvedBooks` skips any book that finds no bay left without saying so, so a 14th case study would list in the terminal's `ls work` but never appear in the room.
- **Why deferred:** 13 is what exists today, and the cabinet was matched to the real one in the flat, so growing it changes an object the owner chose.
- **Unblock:** When a case study is added, pick one in order of cost: move the album out of the top bay (about three more books), lower the bay pitch to fit a fourth bay, or split the books across both halves and slide the other door open.
- **Where:** `portfolio/src/components/fun/Bookshelf.tsx` (`ShelvedBooks`), `portfolio/src/components/fun/Hallway.tsx` (`CABINET`), `portfolio/src/components/fun/Room.tsx` (the cabinet group).

### Fun room: building the scene still blocks the main thread
- **What:** The room's shaders now compile in the background (`compileAsync` in `SceneReady`), and on a phone-class profile (4x CPU throttling, 8Mbps) that took the time into the room from 6.3 to 6.8s down to 4.5 to 4.7s. What still blocks is the first frame drawn after compilation: texture uploads, and the post-processing passes, whose programs compile outside the scene. On that profile the page stops responding for about 1.9s, covered by the stove flickering on the compositor.
- **Why deferred:** The shader compile was the bulk of the freeze and is gone. What is left is split between texture upload and the composer, and each needs measuring on its own before a change is worth making.
- **Unblock:** Profile the first frame after `compiled`. Upload the textures during the building stage with `gl.initTexture`, and warm the `EffectComposer` by rendering it once to an offscreen target before `SceneReady` reports compiled, then re-measure the gap.
- **Where:** `portfolio/src/components/fun/FunRoom.tsx` (`SceneReady`, `Post`), `portfolio/src/components/fun/RoomLoading.tsx` (the `building` stage).

### React 19.3 and three 0.186 are blocked by the 3D stack's peer ranges
- **What:** Renovate PR #938 bundles `next`, `react`/`react-dom` and `three`. Only the `next` half is installable. `@react-three/fiber@9.7.0` declares `peer react@">=19 <19.3"` and `postprocessing@6.39.3` declares `peer three@">= 0.168.0 < 0.186.0"`, so `react@19.3.0` and `three@0.186.0` both fail to resolve. `next` and `eslint-config-next` 16.3.5 were taken on their own; `react`/`react-dom` stay at 19.2.8 and `three` at 0.185.x.
- **Why deferred:** The bounds are upstream declarations, not preferences. Forcing them with `--legacy-peer-deps` would install a combination neither library claims to support, on the globe and the whole `/fun` room.
- **Unblock:** Wait for `@react-three/fiber` to widen its react peer past 19.3 and for `postprocessing` to admit three 0.186, then take both bumps together and re-run `make lint`, `make typecheck` and a browser pass over `/` and `/fun/`. Renovate will keep #938 open and rebase it.
- **Where:** `portfolio/package.json` (`react`, `react-dom`, `three`, `@types/three`), `portfolio/package-lock.json`.

### Lint debt: react-hooks v6 warnings
- **What:** `eslint-config-next@16` ships the new react-hooks v6 rules; two of them flag 8 pre-existing errors: `react-hooks/set-state-in-effect` (CommandPalette ×2, FooterStamp, InlineGlobe, ArchitectureDiagram — setState called directly in effect bodies) and `react-hooks/immutability` (InlineGlobeScene — mutating `colorSpace` on textures returned from `useTexture`). Both rules are downgraded to `warn` in `eslint.config.mjs` so lint can gate CI, which is why lint reports 0 errors and 42 warnings.
- **Why deferred:** each one is a real component change in code that works today, not a config fix: effect restructuring, and moving the three.js texture setup into the loader callback. Decide per case rather than refactoring all five, since the R3F texture mutations may be acceptable as they are, being idiomatic three.js.
- **Unblock:** Refactor each component (or add per-line disables where the pattern is intentional), verify in the browser via `make up`, then remove the two `warn` overrides from `eslint.config.mjs`.
- **Where:** `portfolio/eslint.config.mjs`, `portfolio/src/components/{CommandPalette,FooterStamp,InlineGlobe,InlineGlobeScene}.tsx`, `portfolio/src/components/work/ArchitectureDiagram.tsx`, `portfolio/src/components/fun/{Touch,FirstPerson,interaction}.tsx`.

### TypeScript 7 is blocked by typescript-eslint's peer range
- **What:** Renovate PR #603 bumps `typescript` ^6 → ^7. Lint then dies with `TypeError: Cannot read properties of undefined (reading 'Cjs')`. Every published `typescript-eslint`, including `latest` (8.70.0) and `canary` (8.70.1-alpha.21), declares `peer typescript: ">=4.8.4 <6.1.0"`, so nothing on npm admits TS 7 yet. The repo sits at typescript 6.0.3, inside the supported range.
- **Why deferred:** no amount of local configuration bridges a peer range no release satisfies. TS 7 is the native port, so this is a rewrite of the toolchain's TS integration rather than a version bump.
- **Unblock:** Watch for a `typescript-eslint` release whose `peerDependencies.typescript` admits 7.x, then take #603 and re-run `make lint` and `make typecheck`.
- **Where:** `portfolio/package.json` (`typescript`), `portfolio/eslint.config.mjs`.

### Image optimization pass
- **What:** Re-encode the migrated case-study images via `sharp` to a normalised max-width and AVIF + WebP. Drop any unused PNGs that weren't migrated.
- **Why deferred:** Existing WebPs work fine; this is a perf optimisation, not a blocker.
- **Unblock:** Add a `scripts/optimize-images.ts` step that runs `sharp` over `public/images/`.
- **Where:** `portfolio/public/images/`.

### The hero globe has no polar axle
- **What:** The meridian ring is placed with `rotation={[0, Math.PI / 2, TILT]}`, and three.js's default `XYZ` Euler order composes that as `Rx·Ry·Rz`, so the tilt is applied before the quarter turn and lands inside the torus's own plane, where it spins the ring rather than leaning it. The ring's plane therefore does not contain the tilted polar axis. A polar axle drawn to the ring's own radius ended in mid-air beside it instead of seating into it, and because Oslo sits at 59.9°N the free end appeared right next to the Oslo pin and read as a second pin. The axle was removed on 2026-09-01 rather than fixing the assembly.
- **Why deferred:** Switching the ring to `ZYX` does put its plane through the axis, and the axle then meets it, but it swings the ring's lower loop clear of the pedestal collar so the globe no longer sits in its stand. Making the ring, axle and pedestal one consistent assembly is a modelling pass on a composition that `branding/DECISIONS.md` treats as settled, not a one-line reorder.
- **Unblock:** Decide whether the globe should read as mechanically correct. If yes, rebuild ring, axle and pedestal together so the ring's plane contains the axis and the collar still meets the ring's lowest point, then re-cut `globe-poster.webp`.
- **Where:** `portfolio/src/components/InlineGlobeScene.tsx` (the `TILT` constant, the meridian ring mesh and the pedestal meshes).

### Three hero posters are captured by hand
- **What:** `portfolio/public/images/room-poster.jpg` (640x450, 58KB) is a screenshot of the `/fun` scene. `globe-poster.webp` (1430x906, 34KB) and `globe-poster-mobile.jpg` (780x807, 41KB) are frames of the hero's own globe scene, added 2026-08-23 so phones get the still life at all — under 768px the WebGL scene never mounts, because it measures 211KB of gzipped JS (883KB parsed) plus 577KB of texture. Nothing regenerates any of the three, so a change to the room's furniture, the globe's grade or the camera pose leaves the hero showing a scene that no longer exists. `globe-poster` was re-cut on 2026-09-01 after it had drifted 145px from the live framing and `room-poster` on 2026-09-11 from the room's opening pose; `globe-poster-mobile` is still the 2026-08-23 capture and still carries the pre-2026-09-01 pin.
- **Why deferred:** Automating it means driving a headless browser with WebGL in CI, hiding overlays, waiting for textures, catching the globe at a rotation where Oslo faces the camera, and committing binaries each run. Disproportionate for images that change a few times a year.
- **Unblock:** A `make hero-posters` target running Playwright against a local dev server. The recipe, now used three times: activate the scene with a synthetic `pointermove`, wait ~4s so textures resolve but the globe has barely rotated from its Atlantic-facing start, set `visibility: hidden` on every sibling of the globe layer plus the header and footer, then screenshot. For an off-centre crop, insert a transparent fixed-position div at the wanted rect and screenshot that element — `sips` only crops from the centre. Three traps found on the 2026-09-01 re-cut: capture at the same aspect the box displays at, or `object-cover` crops the still away from the render it has to match; the fade wrapper is the backdrop's own child containing the canvas, not `canvas.closest('div').parentElement`, because r3f inserts a div of its own and forcing opacity on the wrong node captures a half-faded frame; and CDP `Emulation.setDeviceMetricsOverride` makes the WebGL layer drop out of screenshots entirely, so set the viewport rather than the device metrics. `cwebp -q 91 -m 6 -sharp_yuv` beats JPEG by roughly 3x on these dark plates.
- **Where:** `portfolio/public/images/{room-poster,globe-poster-mobile}.jpg`, `portfolio/public/images/globe-poster.webp`, `portfolio/src/components/InlineGlobe.tsx`, `portfolio/src/components/sections/Hero.tsx`, `portfolio/src/components/fun/Room.tsx`.

### The hero's stack logos have nowhere to live
- **What:** The hero used to float nineteen product logos and three shell-command jokes around the globe (`InlineGlobeDecor.ts`, deleted 2026-08-23). The still-life hero cannot carry them: a photographed object on a table with SVG logos orbiting it stops being a photograph. So the only place the site names its stack is now prose. The nineteen SVGs are still committed under `portfolio/public/icons/` and nothing imports them; only `public/icons/social/` is still used, by the fun room.
- **Why deferred:** Where the stack belongs is a content decision, not a layout one. It could be an honest strip further down the home page, a line in About, or nothing at all if the work case studies already carry it. Picking one silently would be inventing scope.
- **Unblock:** Decide whether the stack gets its own block on `/`. If yes, build it from the same `public/icons/*.svg` and delete nothing. If no, delete those nineteen files (they are recoverable from git) and the hero loses no signal it still had.
- **Where:** `portfolio/public/icons/*.svg`, `portfolio/src/components/sections/Hero.tsx`, deleted `portfolio/src/components/InlineGlobeDecor.ts`.

### Warn and copper are the same hex
- **What:** `--warn` and `--copper` are both `#c09955` in `tokens.css`, so a `Callout` with `tone="warn"` ("Watch") and any copper mark carry the same colour, separated only by their label. Now that copper is documented as the ink end of the wood/brass/copper material ramp, the overlap is spelled out in two places rather than hidden, but it is not fixed.
- **Why deferred:** Moving warning off hue 38 does not actually separate them. At equal luminance a hue rotation is invisible to a colour-blind reader — measured, warn at hue 46 against copper is 1.00:1. A real fix means moving warning to a different lightness, which changes how every warning state reads and is a spec decision rather than a code change.
- **Unblock:** Decide whether warning keeps amber. If it does, solve it at a distinctly different luminance from copper (roughly 4.5:1 or 9.5:1 rather than copper's 7.03:1) and re-check it against `--danger` `#d18e83`, which is also warm. If it does not, warning moves hue entirely and the material ramp keeps `#c09955` to itself.
- **Where:** `portfolio/src/styles/tokens.css`, `portfolio/src/content/brand.ts` (the `warning` entry in `semantic`), `portfolio/src/components/primitives/Callout.tsx`.

### Data series 1 was left at the old saturation
- **What:** The brand green moved from saturation 34 to 24 (2026-08-23). `dataSeries` series 1 is labelled "eucalyptus" and is meant to be the brand green, but it still ships `#4f9e6a` / `#2f7d4f` at the old saturation, so the chart green and the brand green no longer match.
- **Why deferred:** The five categorical colours were validated for colour-vision deficiency as a set. Re-muting one of them without redoing that check would trade a visible mismatch for an invisible accessibility regression, which is the worse of the two.
- **Unblock:** Re-run the CVD check across all five series with series 1 at `#5f9c68` / `#4a7952` (the held-luminance equivalents, already computed), and adjust whichever neighbours stop separating.
- **Where:** `portfolio/src/content/brand.ts`.

### Two material variants still have no callers
- **What:** `Tag variant="warm"` and `Callout tone="result"` were repainted onto wood and brass, but nothing in the app renders either of them, so those two paths are unexercised. Every other consumer was converted in the full sweep (2026-08-23): `Button` secondary, `ServicesGrid`, the infrastructure packet dots, the command palette, the room HUD.
- **Why deferred:** Inventing content to justify a variant is backwards. They are correct and waiting for a real use.
- **Unblock:** First case study that needs a Result callout, or first tag that should read as material rather than brand. Check both against the ramp's two rules: brass takes `--fg` only, and `--fg-3` never sits on wood.
- **Where:** `portfolio/src/components/primitives/{Tag,Callout}.tsx`.

### Captions on raised surfaces fall just under AA
- **What:** `--fg-3` (`#708373`) is solved to 4.60:1 against the page ground `--bg` (`#0f1410`), but on `--surface` (`#191f1a`) it measures 4.14:1, under the 4.5:1 AA threshold for small text. Cards and panels use both.
- **Why deferred:** Fixing it means either lightening `--fg-3` for every ground (which loosens the ratio the spec was solved for) or adding a surface-specific caption token, and that is a brand-spec decision rather than a code change.
- **Unblock:** Pick one: lift `--fg-3` to roughly `#778a7a` so it clears 4.5:1 on `--surface` too, or add `--fg-3-on-surface` and use it inside cards. Update `content/brand.ts` and the `/brand` page either way.
- **Where:** `portfolio/src/styles/tokens.css`, `portfolio/src/content/brand.ts`, `portfolio/src/app/brand/`.

### Playwright smoke test suite for portfolio
- **What:** A small containerized Playwright suite that builds the prod image, runs the container, and asserts key routes return 200 with expected content plus `/healthz`. Wire into `.github/workflows/ci-portfolio.yaml` as a job after lint/typecheck/build.
- **Why deferred:** Tier 2 of the linting/testing rollout (2026-07-08); user approved shipping lint + typecheck + build gates first. Adds ~2–3 min to CI and needs a committed Playwright config decision (image, route list).
- **Unblock:** Decide the route/assertion list, add `portfolio/tests/` with a Playwright config running via `mcr.microsoft.com/playwright` Docker image, add the CI job.
- **Where:** `.github/workflows/ci-portfolio.yaml`, new `portfolio/tests/`.

### lucide-react survives in one file pending a brand-mark decision
- **What:** The UI icon sweep (2026-09-01) replaced every chrome icon with the owned set in `src/components/icons.tsx` (arrow-left/right/up-right, menu, close, search), and the /infrastructure redesign removed Pipeline's icon chips. One file still imports `lucide-react`, so the dependency stays installed: `work/brand-icons.ts` (22 pictograms feeding `StackTiles` and the shelf/cover canvas art).
- **Why deferred:** Redrawing 22 brand marks is its own job, not part of a six-icon UI set.
- **Unblock:** Decide whether the brand pictograms get a monochrome redraw in `icons.tsx` style or stay lucide-fed. When the import is gone, drop `lucide-react` from `package.json`.
- **Where:** `portfolio/src/components/icons.tsx`, `portfolio/src/components/work/brand-icons.ts`, `portfolio/package.json`.

### `Callout` has no paper variant
- **What:** The case study write-up now renders on a `.sheet`, and `.paper-prose` re-inks the elements `mdx-components.tsx` hard-codes dark — headings, prose, list bullets, links, `code`, `strong`, `blockquote`. `Callout` is not covered. Its four tones are tinted panels solved against the dark ground (`border-accent/40 bg-accent/[0.06]`, and a `bg-wood` block for `result`), and every one of them would sit on cream as a dark box with `text-fg-2` inside it.
- **Why deferred:** No case study uses a callout — all thirteen bodies are `##` headings, lists and paragraphs only — so there is nothing on screen to design against, and inventing a tone ramp for an unused component is the same mistake the entry above already records for `Tag variant="warm"`.
- **Unblock:** First case study that actually needs a callout. Solve the four tones against `--paper-2` the way the dark ones were solved against `--bg`, and add them under `.paper-prose` beside the other overrides rather than as a prop on the component.
- **Where:** `portfolio/src/app/globals.css` (`.paper-prose`), `portfolio/src/components/primitives/Callout.tsx`, `portfolio/src/components/work/mdx-components.tsx`.

### The footer cannot name the node that served the page
- **What:** `FooterStamp` used to open with "served from talos-cp-02", drawn at random in the browser from four hard-coded names, none of which exists in the six-node cluster. It is removed rather than fixed, so the stamp now carries only what it can measure. The real value is on the pod as `spec.nodeName`.
- **Why deferred:** The browser cannot know it, so it has to come from the server, and the footer renders inside statically prerendered pages — reading `process.env.NODE_NAME` there would bake whatever the CI runner had at build time. Making it real means either an endpoint the stamp fetches or a dynamic segment, plus a downward-API env var on the deployment, which is a manifest change that has to go to stage before prod.
- **Unblock:** Add `NODE_NAME` via `fieldRef: spec.nodeName` to `k8s/talos/apps/portfolio/deployment.yaml`, expose it on an existing route under `/api/v1`, and have the stamp fetch it the way `InfraBench` fetches `/api/v1/infra`.
- **Where:** `portfolio/src/components/FooterStamp.tsx`, `portfolio/src/app/api/v1/`, `k8s/talos/apps/portfolio/deployment.yaml`.

### The provenance stamp exists only in the footer
- **What:** `FooterStamp` reports the build sha and the time to first byte. §12 accepted extending that device: the shelf stating its volume count and newest entry, the resume its revision date and size, the repositories their live star counts. None of it is built. Related gap: `content/repos.ts` fetches live stars and forks for four pinned repositories, and the only thing that renders it is `GithubWall` inside `/fun`, so the open-source work is invisible on the main site.
- **Why deferred:** Each stamp needs a real source, and three of the four do not have one yet — the shelf count is derivable, the resume figures are produced inside the cv-bundle container, and the repo numbers already come from `/api/v1/github` but have no home outside the room.
- **Unblock:** Pick sources one at a time and render each stamp under its own object in the same mono treatment as `FooterStamp`. The repositories one is the largest return, since it is the only place the GitHub work appears at all and the endpoint already exists.
- **Where:** `portfolio/src/components/FooterStamp.tsx` (the pattern), `portfolio/src/content/repos.ts`, `portfolio/src/app/api/v1/github/route.ts`, `portfolio/src/components/fun/GithubWall.tsx`.

## Portfolio API

### Portfolio API writes: a real endpoint, and the auth to match
- **What:** `/api/v1` now serves several read routes (`blog`, `github`, `infra`, `profile`, `openapi.json`), but the only write is the stateless example `POST /api/v1/echo`. A useful write (e.g. a guestbook, or a "notify me" capture) needs a datastore.

  Writes currently authenticate with a static API key. For SSO-consistent, per-user writes, route the write paths through Authentik (Traefik forward-auth / OIDC) instead.
- **Why deferred:** Scope was the read API + a proven auth seam. Persistence is a separate design (schema, storage, retention, abuse handling).
- **Unblock:** Pick a store (SQLite on a PVC for a single-writer app, or a plain `postgres:18-alpine` StatefulSet like logeverylift's), add a route under `src/app/api/v1/` guarded by `requireApiKey`, and wire storage + any needed CiliumNetworkPolicy egress. Add an Authentik provider + Traefik forward-auth middleware on the `/api/v1` POST paths, and relax `requireApiKey` to accept the forwarded identity.
- **Where:** `portfolio/src/app/api/v1/`, `portfolio/src/lib/api.ts`; `portfolio/src/lib/api.ts`, `k8s/talos/apps/portfolio/httproute.yaml`, Authentik config.

### Silence the Turbopack NFT over-trace on /api/v1/infra
- **What:** `next build` warns that the `fs.readFile` in the infra route causes Node File Tracing to sweep the whole project into `.next/standalone` (locally this pulled in `latex/`, `out/`, CV markdown). The shipped Docker image is unaffected because the build stage only `COPY`s `src`/`public`/config, but the warning is noise and the local standalone is bloated.
- **Why deferred:** Cosmetic; build is green and the runtime image is lean.
- **Unblock:** Scope the read (constant path, or `outputFileTracingRoot`/`outputFileTracingExcludes` in `next.config.ts`) until the warning clears without pulling in extra files.
- **Where:** `portfolio/src/app/api/v1/infra/route.ts`, `portfolio/next.config.ts`.

## Cluster / infra

### Run a Terraform apply before 2026-12-29 or the cluster credentials lapse
- **What:** The talosconfig and kubeconfig client certificates both expire **2026-12-29**. The provider reissues them automatically, but only during a `terraform apply`, and only once they are inside their renewal window. `talos_cluster_kubeconfig` uses `certificate_renewal_duration`, now widened from the 720h default to `2160h` (90 days), so any apply after roughly 2026-09-30 renews the kubeconfig. `talos_machine_secrets` has a **hardcoded 30 day** window for the talosconfig client certificate, so that one only renews on an apply between 2026-11-29 and 2026-12-29.
- **Why deferred:** Nothing to fix. Reissuing by hand does not help: `local_sensitive_file` rewrites both files from Terraform state on the next apply, so a manually generated certificate is discarded. The renewal is genuinely automatic; the only failure mode is nobody running Terraform in the window.
- **Unblock:** Run `terraform apply` in this directory at some point in December 2026, then confirm with `grep "client-certificate-data:" kubeconfig | awk '{print $2}' | base64 -d | openssl x509 -noout -enddate` and the equivalent `crt:` line in `talosconfig`. If both certificates do lapse, recovery is the `convert-secrets.sh` flow in that directory's `README.md`, which rebuilds them from the machine secrets in Terraform state. That works as long as the state is intact, which is why `machine-secrets.yaml` belongs in Bitwarden.
- **Where:** `terraform/proxmox/hyper-cluster/k8s/talos/talos-cluster.tf` (`talos_cluster_kubeconfig.certificate_renewal_duration`), README "Certificate Management".

### Raise `talos_config_contract` from v1.11.6
- **What:** The cluster runs Talos v1.13.10, but `talos_config_contract` is still `v1.11.6`, so machine configuration is generated against the 1.11 contract. `kubernetes_config_contract` was raised to `v1.35.7` and is done. Talos accepts an older-contract config, so this is drift to clean up rather than a fault.
- **Why deferred:** The 1.12 contract emits a separate `HostnameConfig` document with `auto: stable`, replacing `machine.features.stableHostname`. The `config_patches` in `talos-cluster.tf` also set a static `machine.network.hostname` per node, and Talos rejects the combination: `static hostname is already set in v1alpha1 config`. `HostnameConfig` accepts either `auto` or `hostname` and the two explicitly conflict, so the static hostname has to move into that document, and a plain strategic-merge patch would merge `hostname` alongside the generated `auto` rather than replacing it. Working that out at the end of the upgrade session was not worth the risk while the cluster was healthy.
- **Already tried and ruled out (2026-08-09):** Removing `machine.network.hostname` and adding a `HostnameConfig` document as a second entry in `config_patches` does **not** work. The patch merges with the generated document instead of replacing it, producing `auto: stable` and `hostname: <node>` in the same document, which Talos rejects with `HostnameConfig: 'auto' and 'hostname' cannot be set at the same time`. Setting `auto: null` in the patch to delete the field does not work either; the merge still emits `auto: stable`. Verified by plan plus `apply-config --dry-run`, no cluster changes made.
- **Do not** simply drop the static hostname and let `auto: stable` name the nodes. It derives hostnames from machine identity, so every node would rename, orphaning the existing Node objects along with PV `nodeAffinity` and the `topology.kubernetes.io/zone` labels.
- **Unblock:** What is left is an RFC6902 JSON patch with a `remove` op on `/auto` targeted at the `HostnameConfig` document, which needs correct document targeting in a multi-document config. Alternatively wait for the provider or Talos to handle the migration. Verify with `talosctl apply-config --mode=auto --dry-run` on both a worker and a control plane before applying, per `docs/talos-kubernetes-upgrade.md`. In the same change, pin `machine.install.grubUseUKICmdline = false`: the provider emits `true` from the 1.12 contract, but these nodes boot via GRUB and their running cmdline carries `talos.platform=nocloud` and `net.ifnames=0`, which the UKI's own command line would not reproduce. That field is unknown to the 1.11 contract, so it can only be added together with the contract bump.
- **Worth it?** Probably not yet. Roughly half a day with a real risk of node renames, and no functional payoff: Talos accepts older-contract configs for several releases and nothing is broken. Reasonable to leave until round 3 (Talos 1.14) forces it.
- **Where:** `terraform/proxmox/hyper-cluster/k8s/talos/talos-cluster.tf` (`config_patches` in both `data.talos_machine_configuration` blocks), `terraform.tfvars` (`talos_config_contract`).

### Raise `kubernetes_config_contract` to v1.36.5 (round 2, phase 2)
- **What:** Round 2 moved every node to Talos v1.13.10 / Kubernetes v1.36.5, but `kubernetes_config_contract` in the local `terraform.tfvars` is still `v1.35.7`, and `enable_talos_upgrade` / `enable_kubernetes_upgrade` are still `true`. `talos_config_contract` stays at `v1.11.6`, see the entry above.
- **Why deferred:** The runbook raises the contract only after the cluster has run clean on the new versions for a few days.
- **Unblock:** Set `kubernetes_config_contract = "v1.36.5"` and both upgrade flags to `false`, then plan, dry run a worker and a control plane per `docs/talos-kubernetes-upgrade.md`, and apply.
- **Where:** `terraform/proxmox/hyper-cluster/k8s/talos/terraform.tfvars` (gitignored, local only).

### Round 3 of the cluster upgrade: Talos 1.14 + Kubernetes 1.37
- **What:** Take Genesis from Talos v1.13.10 / Kubernetes v1.36.5 to the latest Talos 1.14.x and Kubernetes 1.37.x by the same two-phase flow. Talos 1.14.0 shipped 2026-09-03 and v1.14.1 on 2026-09-15; `talosctl` on the laptop is already v1.14.1.
- **Why deferred:** Round 2 went out on 2026-09-26 and its phase 2 is still pending. Adjacent minors only, one round per window.
- **Unblock:** Phase 2 of round 2 done and the cluster clean for a while. Confirm the Cilium release in `k8s/talos/infra/cilium/` supports Kubernetes 1.37 and read the Talos 1.14 upgrade notes. Then follow `docs/talos-kubernetes-upgrade.md`: backups, baseline plan, raise the targets, dry run a worker and a control plane, apply. Likely the point where the `talos_config_contract` entry above can no longer wait.
- **Where:** `terraform/proxmox/hyper-cluster/k8s/talos/{terraform.tfvars,upgrade-talos.tf,upgrade-k8s.tf}`, `docs/talos-kubernetes-upgrade.md`.

### Close the Cilium policy audit and move to enforcement
- **What:** The cluster runs `policyAuditMode: true` (`k8s/talos/infra/cilium/values.yaml`), so the 46 CiliumNetworkPolicies log but never drop. The 2026-09-26 query returned 44 flows. The explained ones are covered by allow rules, and every `toFQDNs` policy now carries a DNS L7 rule. Without that rule Cilium never learns the IPs behind a name, so Discord, GitHub, Bitwarden, Cloudflare and Instagram were all audited despite being allowlisted. In the metric, `source` is the peer and `destination` the audited pod for both directions: `seerr -> traefik` is seerr calling Traefik, not the reverse.
- **Still unexplained, low volume (per 7d):** egress to `reserved:world` from authentik-server, prometheus, alloy and gluetun (under 10 each for the last three; gluetun on ports outside its tunnel list). Grafana (`grafana.com`) and the authentik worker (`version.goauthentik.io`) were update checks and are now switched off, which may also account for authentik-server via startup analytics. Ingress from `reserved:world` to traefik on a port outside its list (10), to gluetun (2) and reelsmith-gateway (1). `monitoring/<no workload>` to prometheus (9). `remote-node` to `argocd-application-controller` (1, likely the upgrade reboots). Grafana, authentik, prometheus and alloy now have DNS visibility, so the names they resolve show up in `cilium-dbg fqdn cache list` on the node, or in `hubble observe --follow --protocol dns` (the Hubble ring buffer is too short to catch flows this rare after the fact).
- **Why deferred:** The rules added on 2026-09-26 took the audit rate from about 1,600 flows/h to under 10/h within the hour, but periodic flows need a full 7d window to show, and the flows above need Hubble data before a rule can be written for them. Getting one wrong takes an app off the network once enforcement is on.
- **Blocker found 2026-09-16:** the plan of flipping enforcement namespace by namespace does not work as written. `policyAuditMode` is a single agent-wide value in the `cilium-config` ConfigMap, confirmed with `kubectl get configmap -n kube-system cilium-config -o jsonpath='{.data.policy-audit-mode}'`. There is no declarative per-namespace toggle, so setting it to `false` enforces all 46 policies at once. Either every gap above is closed before the flip, or the flip is staged by temporarily removing the CNPs from namespaces that are not ready, which is backwards. Per-endpoint audit can be set imperatively with `cilium-dbg endpoint config <id> PolicyAuditMode=false`, which suits spot-checking a single workload but is not GitOps.
- **Unblock:** Add an allow rule per flow above, re-run the query and confirm it returns nothing, then flip `policyAuditMode: false` in one change. Re-run before the flip, not just once, since periodic flows (cert-manager renewals, backups, cron) may still be unrepresented. NOTE: changing this value rolls the Cilium DaemonSet, see the 2026-05-16 BPF LB map corruption record in `docs/incidents.md`; verify per-node BPF LB state right after the roll.
- **The query:** port-forward `svc/kube-prometheus-stack-prometheus` in `monitoring` and run `sum by (source_namespace, source, destination_namespace, destination, direction) (increase(hubble_policy_verdicts_total{action="audit"}[7d]))`. Prometheus retention is 7d, so the window cannot be widened.
- **Where:** `k8s/talos/infra/cilium/values.yaml` (audit mode), and the per-app CNPs listed by `kubectl get ciliumnetworkpolicy -A`.

### UniFi site settings are still console-only
- **What:** country, NTP, IGMP snooping, DPI, IPS, auto speedtest and the rest of the site-level settings are not in `terraform/unifi/network`. Everything else the provider can express is.
- **Why deferred:** `unifi_setting` imports with every section empty, so the import gives no record of the live values. Declaring a section means writing it from the console by hand, and a wrong value applies site-wide (the country code alone decides which Wi-Fi channels are legal).
- **Unblock:** read each section from `/proxy/network/api/s/default/get/setting`, declare one section at a time in a `settings.tf`, and apply only when `plan` shows no change for it. Start with `country` (code 578), the one with the widest blast radius.
- **Where:** `terraform/unifi/network/` (new `settings.tf`), resource `unifi_setting`, import ID `default`.

### VM backups fail after a Proxmox-CSI detach loses the VM lock
- **What:** when a PVC moves off a VM while that VM's config is locked (reboot, backup), the CSI unplug succeeds in QEMU but the config write times out (`can't lock file '/var/lock/qemu-server/lock-<vmid>.conf'`). The disk stays in the config as a pending delete, and every vzdump of that VM then fails with `Device 'drive-scsiN' not found`. Hit on VM 134 (genesis-worker-01) twice: scsi6 (Loki) after the 2026-09-25 reboot, scsi2 (trek) after the 2026-09-26 reboot. The datastore-side failures (GC permissions, quota) were fixed on 2026-09-25; the 2026-09-26 VM 133 `syncfs` I/O error did not recur on a manual re-run.
- **Why deferred:** the one-off fix (re-issue `delete=scsiN` on the VM config once QEMU no longer has the device) is manual; nothing detects or prevents the next one.
- **Unblock:** decide between an alert on vzdump failures per VM (the PVE notification already reaches Discord, so maybe enough), a scheduled check that flags pending `delete` entries on `vm-9999-pvc-*` disks, or raising it upstream with sergelogvinov/proxmox-csi-plugin (retry the config write on lock timeout).
- **Where:** `terraform/proxmox/hyper-cluster/datacenter/backup.tf`, `k8s/talos/infra/proxmox-csi-plugin/`.

### UniFi follow-ups from the IoT onboarding prep
- **What:** loose ends after moving the site into `terraform/unifi/network`: (1) an unidentified Wi-Fi client `WINC-00-00` (Microchip module in some appliance) needs the new Eden-IoT password and then a reservation and name in `clients.tf`; (2) the Voice PE, once onboarded on Eden-IoT, should get a reservation there too, like the Bluetooth proxy; (3) the old state blob `unifi/firewall.tfstate` is still in the azurerm container after the move to `unifi/network.tfstate`; (4) the wireless mesh key (`x_mesh_psk`) was printed during a session and could be regenerated, although nothing uses wireless uplinks.
- **Why deferred:** (1) and (2) wait on physical devices, (3) needs the Azure login the user drives, (4) is low risk.
- **Unblock:** (1) identify the appliance, reconnect it, add `{ mac, ip }` to `local.reservations`; (2) same for the Voice PE after setup; (3) delete the blob once `unifi/network.tfstate` has been in use for a while; (4) regenerate from the console if wanted.
- **Where:** `terraform/unifi/network/clients.tf`, azurerm container `tfstate` in `sttfstatemvnhomelab`.

## Repo hygiene

### Local-only AI work is not backed up
- **What:** `scripts/backup-secrets.sh` covers CV drafts, blog style docs, Talos credentials and the tfvars files. It does not cover `ai/projects/`, `ai/prompts/`, `.inspiration/` or `.notes/`. That leaves the `jarvis` project, the ERLEND/MORTEN persona documents and the prompt-eval work with no backup at all.
- **Why deferred:** The manifest was written for secrets, and it is not obvious which of these are worth keeping versus genuinely disposable.
- **Unblock:** Decide which are worth keeping and add them to `.backup-manifest`. The persona markdown files are ~28K and clearly worth it; the 234M `slackdump_20260602_122707.zip` next to them probably is not, and may not belong on the laptop at all given it is a Slack export.
- **Where:** `.backup-manifest`, `ai/projects/jarvis/`, `ai/prompts/erlendgpt/`.
