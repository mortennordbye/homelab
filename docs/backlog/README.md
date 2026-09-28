# Backlog

Known gaps the team has agreed to leave for later. Each entry: **what**, **why deferred**, **what unblocks**, **where**.

## Backups & monitoring

### Immutable snapshots for the k8s-volumes share
- **What:** decide whether `k8s-volumes` gets immutable Btrfs snapshots like `k8s-backups`, and data checksumming, which Synology only allows on a new share.
- **Why deferred:** left open when the backup work shipped; the backups themselves are protected on `k8s-backups`.
- **Unblock:** a decision on whether live volumes need point-in-time protection beyond the nightly VolSync copies, and a maintenance window if it means migrating to a new share.
- **Where:** DSM Snapshot Replication and Shared Folder settings; record the result in `docs/platform/backups/README.md` under "Configured outside Git".

### Tdarr: back to the night-only window and one GPU worker
- **What:** all Tdarr libraries (`TV`, `Movies`, `Movies 4K`) currently transcode 24/7, and the node runs 2 GPU transcode workers, to work through the H.264 backlog. Set the library schedule back to 00:00 to 07:00 every day and the node back to 1 GPU worker (Nodes page), as recorded in the media-stack docs.
- **Why deferred:** running around the clock clears the backlog faster; the night window exists because Plex shares the Quick Sync iGPU.
- **Unblock:** the H.264 queue is mostly done, or Plex playback starts stuttering during the day.
- **Where:** Tdarr library settings at `https://tdarr.local.bigd.no` (schedule lives in the Tdarr DB, not Git), target settings in `docs/apps/media-stack/README.md`.

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

- **What:** The homepage infrastructure section renders the whole estate as the BESTÅ it actually lives in (modem, gateway, Home Assistant box, NAS, switch, Hue bridge and the three ThinkCentres) and every one of them is clickable for its spec. Only the three ThinkCentres are backed by live data. The other six are drawn with their lights lit and never change, because `status-publisher` reads the Kubernetes API, ArgoCD and cert-manager and nothing else. Each of those six says so in its own detail panel, and `hardware.ts` carries a `live: false` flag for exactly this.
- **Why deferred:** The NAS, the UniFi gear and the Home Assistant box are each a separate collector with separate credentials (Synology DSM's API, the UniFi controller, the Home Assistant REST API) and none of them is reachable from the publisher's ServiceAccount today. That is a whole integration per device, not an extension of the existing jq.
- **Unblock:** Decide which of the six is worth wiring. The NAS is the one with a real story (it holds every PV in the cluster) and DSM exposes volume and drive health over its API; that needs a credential in Bitwarden, an `ExternalSecret`, and a second collector alongside the CronJob. Once a device reports, flip its `live` flag and drive its LEDs from the feed instead of the constant.
- **Where:** `portfolio/src/content/hardware.ts` (the `live` flag and `DEVICES`), `portfolio/src/components/infrastructure/BenchScene.tsx` (`Nas`, `Switch8`, `DeviceBox` LED constants), `k8s/talos/apps/portfolio/status-publisher.yaml`.

### Outside-in probing for the 30-day health strip
- **What:** The `/infrastructure` page now renders a 30-day health strip from per-day sample counts the status publisher accumulates in `status.json` (`history` array). It is labelled "observed in-cluster" because that is all it is: days where the publisher never ran show as gaps, but the strip cannot see the site being unreachable from the internet while the cluster is fine, and self-reported health proves less than an external probe.
- **Why deferred:** True availability needs an external prober (Uptime Kuma on another host, healthchecks.io, or a GitHub Actions schedule hitting the site) publishing daily results somewhere the static page can fetch.
- **Unblock:** Pick the prober, publish daily results as JSON the page can fetch (second file next to `status.json`, or merged into it), then swap the strip's data source and drop the "observed in-cluster" qualifier.
- **Where:** `portfolio/src/components/infrastructure/LiveStatus.tsx` (`buildUptime`), `k8s/talos/apps/portfolio/status-publisher.yaml` (history merge step).

## Portfolio

### SEO: the content-shaped half of the 2026-09-16 audit
- **What:** A 132-finding search/AI-visibility audit of nordbye.it was acted on for metadata only. The content and component findings were deliberately not done, apart from the case-study byline: no direct-answer paragraph under the "How it went." heading, where the first extractable block is the case-study title card on all 13 pages; no key-facts summary near the top of the 3,262-word homepage, which also has zero question-shaped headings; no outbound links to third-party authorities (every external link on the site is self-owned, while the pages assert facts about GDPR, Microsoft's WAF Application Landing Zone and Norsk Helsenett); and no figures on `healthcare-rhel-migration` or `postgres-tls-healthcare`, which carry zero numeric support while their siblings on the same template carry 7-8 substantive numbers each.
- **Why deferred:** The user scoped the work to metadata and config explicitly: "minimal function/visualizer changes, meta data and all of that is 100% allowed". Every item above is copy or component work, and several need facts only the author has (host counts, migration windows, measured downtime, and whether client confidentiality permits publishing them at all).
- **Unblock:** Decide per item whether it is worth a content pass. The numbers need the author's own recall plus a confidentiality judgement; leaving them out is a legitimate answer. Do not let a tool invent a downtime figure to close the finding.
- **Where:** `portfolio/src/content/work/*.mdx` (copy), `portfolio/src/components/sections/` (homepage sections). Full findings: the audit run persisted at `~/.claude/plugins/data/claude-seo-ai-claude-seo-ai/runs/nordbye.it/2026-09-16T05-49-53Z/report.md`.

### Fun room: real-device pass, printer switches and melody
- **What:** The printer's rocker switches read their prompt correctly under the crosshair, but pressing `E` was reported to produce no visible change in the ON/OFF pill. Never reproduced in a browser with working pointer lock, so it may be a headless-harness artifact rather than a real fault.

  Two further loose ends in `/fun`. The synthesised rickroll's third line ("never gonna run around and desert you") is the least confident transcription and has never been listened to by anyone. And nothing here has been driven on real hardware: mouse-look and the cold-load loading bar have never run in a browser with working pointer lock, and the touch controls added 2026-07-20 (drag-to-look, tap-to-activate, walk stick, entry gate) were verified only by dispatching synthetic `TouchEvent`s in headless Chromium. That proves the wiring and says nothing about feel: look sensitivity, stick size and placement, and the tap slop threshold are all guesses at this point. Two newer pieces are in the same position: the wardrobe mirrors swapping between the live reflector and their dark stand-in half a metre outside the bedroom door, and the phone loading screen lighting the lantern, desk lamp and stove over the poster stage by stage. Both were checked in emulated headless Chromium only.
- **Why deferred:** Both need a human: one at a real browser with sound, one on an actual phone. Neither is checkable from headless Chromium.
- **Unblock:** Open `/fun` in a real browser, look at a printer switch, press `E`, and watch the pill. If it does not flip, instrument `onActivate` in `Interactive`: the registry hands activation the ref payload, so the suspect is either hover resolution or the keydown listener's `enabled` gate. Open `/fun` on a desktop, listen to the melody, hard-reload with cache disabled to see the loading bar. Then open it on a phone and tune `LOOK_SENS`, `TAP_SLOP_PX` and `STICK_R` in `Touch.tsx` against how it actually feels.
- **Where:** `portfolio/src/components/fun/Printer.tsx` (`Switch`), `portfolio/src/components/fun/interaction.tsx`; `portfolio/src/components/fun/Sonos.tsx` (`MELODY`), `portfolio/src/components/fun/Touch.tsx`, `docs/apps/portfolio/fun-room.md`.

### Fun flat: the parts of the plan not yet modelled
- **What:** `/fun` is the real apartment with all four spaces walkable, the north wall glazed and the entré's two built-ins modelled, but two things on the floor plan are still not built: the **P** marked in the living room (a post, or a flue), and **door leaves** for the bedroom and bathroom: those openings are cased and lined but carry no door, so neither room can be shut.
- **Why deferred:** Neither changes whether the flat is navigable or whether it reads correctly, and the shell, the windows, the merged TV bench and the furniture were the agreed passes.
- **Unblock:** The door leaves can reuse the `Door` component the front door already uses. The post needs confirming against the flat before it is worth modelling.
- **Where:** `portfolio/src/components/fun/flat.ts` (`WALLS`, `doorOpenings`), `portfolio/src/components/fun/Room.tsx` (`Door`, `DoorLining`, `Window`), `portfolio/src/components/fun/Furniture.tsx`.

### Fun room: content parity gaps
- **What:** `/fun` now carries the site's materials, light and annotation language, but three sections of the site still have no object in the room. The hero's positioning (`site.hero.headline` / `.sub`: "I am a Cloud Engineer", Oslo, Orange Business) is never stated, so the room never says who it belongs to. The About narrative (the two bio paragraphs) and the portrait have no object either, though skills, interests and career all do. And `/brand` is reachable only through the terminal's `brand` command and the command palette, with nothing in the room representing it.
- **Why deferred:** Scoped out deliberately. The re-skin, the annotation language and the shared geometry were the agreed job; adding new content objects is a separate design question about what shape each one takes, and the room is already at roughly 90% content parity without them.
- **Unblock:** Decide the object for each before modelling anything: `docs/apps/portfolio/brand/decisions.md` §4 rejects "click to open" as a toll gate, so each has to read at a glance from where a visitor stands. The hero is the awkward one: a room that announces a job title is a poster, not a study.
- **Where:** `portfolio/src/content/site.ts` (`hero`), `portfolio/src/components/sections/AboutSection.tsx` (the prose), `portfolio/src/app/brand/page.tsx`, `portfolio/src/components/fun/Room.tsx` (placement), `portfolio/src/components/fun/Objects.tsx` (the existing object patterns).

### Fun room: doors, drawers and repeated parts still draw one mesh each
- **What:** The static parts of the interactive objects now merge through `MERGE_STATIC` (devices, lantern frame, chair, sofa, bed, certificates, abacus rods, stove body, remote buttons, tap bodies), which took the measured views from 378/131/138/640 to 269/102/104/515 draw calls a frame at 2.65MP. What is left is the parts that move: every door leaf, drawer box, wardrobe slider and cabinet front is still one draw per piece, and so are repeated identical parts like the bookshelf spines.
- **Why deferred:** Moving parts cannot be baked at mount. They need either a merge per moving group (one mesh per leaf rather than per board of it) or instancing, and each has to keep its hover and open behaviour.
- **Unblock:** Merge each `Door`/`Drawer` leaf into one mesh per material inside its own animated group, so the group still moves as one; use `InstancedMesh` for the spines and other repeats, which keeps per-instance picking. Measure against the same four positions (spawn, then W 1.5s, A 1.5s, S 3s) with draw calls counted per frame.
- **Where:** `portfolio/src/components/fun/openable.tsx` (`Door`, `Drawer`), `portfolio/src/components/fun/{Furniture,Bookshelf,Hallway}.tsx`, `portfolio/src/components/fun/StaticMerge.tsx`.

### Fun room: the hall cabinet holds 13 case studies and no more
- **What:** The case studies stand in the three bays behind the hall cabinet's open sliding door, with the career album taking the start of the top bay. At the current 13 books every bay is full, and `ShelvedBooks` skips any book that finds no bay left without saying so, so a 14th case study would list in the terminal's `ls work` but never appear in the room.
- **Why deferred:** 13 is what exists today, and the cabinet was matched to the real one in the flat, so growing it changes an object the owner chose.
- **Unblock:** When a case study is added, pick one in order of cost: move the album out of the top bay (about three more books), lower the bay pitch to fit a fourth bay, or split the books across both halves and slide the other door open.
- **Where:** `portfolio/src/components/fun/Bookshelf.tsx` (`ShelvedBooks`), `portfolio/src/components/fun/Hallway.tsx` (`CABINET`), `portfolio/src/components/fun/Room.tsx` (the cabinet group).

### Fun room: building the scene still blocks the main thread
- **What:** On a phone-class profile (4x CPU throttling, 8Mbps, cache disabled) the room still blocks the main thread twice. While it builds behind the loading screen, the longest task is 0.63 to 0.90s (total about 1s), most of it the crease pass for the rounded boxes whose sizes are unique, which the geometry cache in `components/scene/RoundedBox.tsx` cannot share. The first frame after the room appears blocks about 0.26s, mostly the post-processing programs compiling on first use. Before the cache and the texture pre-upload these were 1.46s and 0.44s.
- **Why deferred:** Both remaining pieces need a structural change rather than a tweak: the crease pass would have to move off the main thread or be precomputed, and the composer's programs compile outside `compileAsync` because its passes are not in the scene.
- **Unblock:** For the composer, render it once to an offscreen target before `SceneReady` reports compiled, or compile its pass materials with `compileAsync` on a scene holding their full-screen quads. For the boxes, compute the rounded-box normals analytically instead of with `toCreasedNormals`, or build the geometries in a worker. Measure with long tasks split at the first WebGL draw, under the profile above.
- **Where:** `portfolio/src/components/fun/FunRoom.tsx` (`SceneReady`, `Post`), `portfolio/src/components/scene/RoundedBox.tsx`.

### Fun room: assets are served from the home uplink
- **What:** A cold `/fun` is about 2MB compressed against the production build, 1.2MB of it JavaScript, served from the cluster with no CDN in front (Cloudflare is DNS only). Every megabyte is home-uplink bandwidth per cold visitor. Touch visitors are asked before downloading and machines without WebGL download none of it, but neither is a fix.
- **Why deferred:** The payload is small enough today that it has not hurt; the room's models and textures are static and immutable, so moving them is straightforward whenever it is worth doing.
- **Unblock:** Put `public/models/fun/`, `public/textures/` and the JS chunks behind a CDN or an object store with long cache headers, and re-measure a cold `/fun` against `make run-prod`. Required before any large asset is added to the room.
- **Where:** `portfolio/public/models/fun/`, `portfolio/public/textures/`, `portfolio/next.config.ts`, `k8s/talos/apps/portfolio/httproute.yaml`.

### TypeScript 7 is blocked by typescript-eslint's peer range
- **What:** Renovate PR #603 bumps `typescript` ^6 → ^7. Lint then dies with `TypeError: Cannot read properties of undefined (reading 'Cjs')`. Every published `typescript-eslint`, including `latest` (8.70.0) and `canary` (8.70.1-alpha.21), declares `peer typescript: ">=4.8.4 <6.1.0"`, so nothing on npm admits TS 7 yet. The repo sits at typescript 6.0.3, inside the supported range.
- **Why deferred:** no amount of local configuration bridges a peer range no release satisfies. TS 7 is the native port, so this is a rewrite of the toolchain's TS integration rather than a version bump.
- **Unblock:** Watch for a `typescript-eslint` release whose `peerDependencies.typescript` admits 7.x, then take #603 and re-run `make lint` and `make typecheck`.
- **Where:** `portfolio/package.json` (`typescript`), `portfolio/eslint.config.mjs`.

### The hero globe has no polar axle
- **What:** The meridian ring is placed with `rotation={[0, Math.PI / 2, TILT]}`, and three.js's default `XYZ` Euler order composes that as `Rx·Ry·Rz`, so the tilt is applied before the quarter turn and lands inside the torus's own plane, where it spins the ring rather than leaning it. The ring's plane therefore does not contain the tilted polar axis. A polar axle drawn to the ring's own radius ended in mid-air beside it instead of seating into it, and because Oslo sits at 59.9°N the free end appeared right next to the Oslo pin and read as a second pin. The axle was removed on 2026-09-01 rather than fixing the assembly.
- **Why deferred:** Switching the ring to `ZYX` does put its plane through the axis, and the axle then meets it, but it swings the ring's lower loop clear of the pedestal collar so the globe no longer sits in its stand. Making the ring, axle and pedestal one consistent assembly is a modelling pass on a composition that `docs/apps/portfolio/brand/decisions.md` treats as settled, not a one-line reorder.
- **Unblock:** Decide whether the globe should read as mechanically correct. If yes, rebuild ring, axle and pedestal together so the ring's plane contains the axis and the collar still meets the ring's lowest point, then re-cut `globe-poster.webp`.
- **Where:** `portfolio/src/components/InlineGlobeScene.tsx` (the `TILT` constant, the meridian ring mesh and the pedestal meshes).

### Two material variants still have no callers
- **What:** `Tag variant="warm"` and `Callout tone="result"` were repainted onto wood and brass, but nothing in the app renders either of them, so those two paths are unexercised. Every other consumer was converted in the full sweep (2026-08-23): `Button` secondary, `ServicesGrid`, the infrastructure packet dots, the command palette, the room HUD.
- **Why deferred:** Inventing content to justify a variant is backwards. They are correct and waiting for a real use.
- **Unblock:** First case study that needs a Result callout, or first tag that should read as material rather than brand. Check both against the ramp's two rules: brass takes `--fg` only, and `--fg-3` never sits on wood.
- **Where:** `portfolio/src/components/primitives/{Tag,Callout}.tsx`.

### lucide-react survives in one file pending a brand-mark decision
- **What:** The UI icon sweep (2026-09-01) replaced every chrome icon with the owned set in `src/components/icons.tsx` (arrow-left/right/up-right, menu, close, search), and the /infrastructure redesign removed Pipeline's icon chips. One file still imports `lucide-react`, so the dependency stays installed: `work/brand-icons.ts` (22 pictograms feeding `StackTiles` and the shelf/cover canvas art).
- **Why deferred:** Redrawing 22 brand marks is its own job, not part of a six-icon UI set.
- **Unblock:** Decide whether the brand pictograms get a monochrome redraw in `icons.tsx` style or stay lucide-fed. When the import is gone, drop `lucide-react` from `package.json`.
- **Where:** `portfolio/src/components/icons.tsx`, `portfolio/src/components/work/brand-icons.ts`, `portfolio/package.json`.

### `Callout` has no paper variant
- **What:** The case study write-up now renders on a `.sheet`, and `.paper-prose` re-inks the elements `mdx-components.tsx` hard-codes dark: headings, prose, list bullets, links, `code`, `strong`, `blockquote`. `Callout` is not covered. Its four tones are tinted panels solved against the dark ground (`border-accent/40 bg-accent/[0.06]`, and a `bg-wood` block for `result`), and every one of them would sit on cream as a dark box with `text-fg-2` inside it.
- **Why deferred:** No case study uses a callout (all thirteen bodies are `##` headings, lists and paragraphs only) so there is nothing on screen to design against, and inventing a tone ramp for an unused component is the same mistake the entry above already records for `Tag variant="warm"`.
- **Unblock:** First case study that actually needs a callout. Solve the four tones against `--paper-2` the way the dark ones were solved against `--bg`, and add them under `.paper-prose` beside the other overrides rather than as a prop on the component.
- **Where:** `portfolio/src/app/globals.css` (`.paper-prose`), `portfolio/src/components/primitives/Callout.tsx`, `portfolio/src/components/work/mdx-components.tsx`.

### The provenance stamp exists only in the footer
- **What:** `FooterStamp` reports the build sha and the time to first byte. §12 accepted extending that device: the shelf stating its volume count and newest entry, the resume its revision date and size, the repositories their live star counts. None of it is built. Related gap: `content/repos.ts` fetches live stars and forks for four pinned repositories, and the only thing that renders it is `GithubWall` inside `/fun`, so the open-source work is invisible on the main site.
- **Why deferred:** Each stamp needs a real source, and three of the four do not have one yet: the shelf count is derivable, the resume figures are produced inside the cv-bundle container, and the repo numbers already come from `/api/v1/github` but have no home outside the room.
- **Unblock:** Pick sources one at a time and render each stamp under its own object in the same mono treatment as `FooterStamp`. The repositories one is the largest return, since it is the only place the GitHub work appears at all and the endpoint already exists.
- **Where:** `portfolio/src/components/FooterStamp.tsx` (the pattern), `portfolio/src/content/repos.ts`, `portfolio/src/app/api/v1/github/route.ts`, `portfolio/src/components/fun/GithubWall.tsx`.

## Portfolio API

### Portfolio API writes: a real endpoint, and the auth to match
- **What:** `/api/v1` now serves several read routes (`blog`, `github`, `infra`, `profile`, `openapi.json`), but the only write is the stateless example `POST /api/v1/echo`. A useful write (e.g. a guestbook, or a "notify me" capture) needs a datastore.

  Writes currently authenticate with a static API key. For SSO-consistent, per-user writes, route the write paths through Authentik (Traefik forward-auth / OIDC) instead.
- **Why deferred:** Scope was the read API + a proven auth seam. Persistence is a separate design (schema, storage, retention, abuse handling).
- **Unblock:** Pick a store (SQLite on a PVC for a single-writer app, or a plain `postgres:18-alpine` StatefulSet like logeverylift's), add a route under `src/app/api/v1/` guarded by `requireApiKey`, and wire storage + any needed CiliumNetworkPolicy egress. Add an Authentik provider + Traefik forward-auth middleware on the `/api/v1` POST paths, and relax `requireApiKey` to accept the forwarded identity.
- **Where:** `portfolio/src/app/api/v1/`, `portfolio/src/lib/api.ts`; `portfolio/src/lib/api.ts`, `k8s/talos/apps/portfolio/httproute.yaml`, Authentik config.

## Cluster / infra

### Run a Terraform apply before 2026-12-29 or the talosconfig lapses
- **What:** The talosconfig client certificate expires **2026-12-29**. The provider reissues it automatically, but only during a `terraform apply` inside its renewal window: `talos_machine_secrets` has a **hardcoded 30 day** window, so it only renews on an apply between 2026-11-29 and 2026-12-29. The kubeconfig certificate is renewed through 2027-08-09; `talos_cluster_kubeconfig` uses a `2160h` `certificate_renewal_duration`, so any apply in the 90 days before that renews it again.
- **Why deferred:** Nothing to fix. Reissuing by hand does not help: `local_sensitive_file` rewrites both files from Terraform state on the next apply, so a manually generated certificate is discarded. The renewal is genuinely automatic; the only failure mode is nobody running Terraform in the window.
- **Unblock:** Run `terraform apply` in this directory at some point in December 2026, then confirm with `grep "client-certificate-data:" kubeconfig | awk '{print $2}' | base64 -d | openssl x509 -noout -enddate` and the equivalent `crt:` line in `talosconfig`. If a certificate does lapse, recovery is the `convert-secrets.sh` flow in that directory's `README.md`, which rebuilds them from the machine secrets in Terraform state. That works as long as the state is intact, which is why `machine-secrets.yaml` belongs in Bitwarden.
- **Where:** `terraform/proxmox/hyper-cluster/k8s/talos/talos-cluster.tf` (`talos_cluster_kubeconfig.certificate_renewal_duration`), README "Certificate Management".

### Raise `talos_config_contract` from v1.11.6
- **What:** The cluster runs Talos v1.14.1, but `talos_config_contract` is still `v1.11.6`, so machine configuration is generated against the 1.11 contract. `kubernetes_config_contract` was raised to `v1.36.5` and is done. Talos accepts an older-contract config, so this is drift to clean up rather than a fault.
- **Why deferred:** The 1.12 contract emits a separate `HostnameConfig` document with `auto: stable`, replacing `machine.features.stableHostname`. The `config_patches` in `talos-cluster.tf` also set a static `machine.network.hostname` per node, and Talos rejects the combination: `static hostname is already set in v1alpha1 config`. `HostnameConfig` accepts either `auto` or `hostname` and the two explicitly conflict, so the static hostname has to move into that document, and a plain strategic-merge patch would merge `hostname` alongside the generated `auto` rather than replacing it. Working that out at the end of the upgrade session was not worth the risk while the cluster was healthy.
- **Already tried and ruled out (2026-08-09):** Removing `machine.network.hostname` and adding a `HostnameConfig` document as a second entry in `config_patches` does **not** work. The patch merges with the generated document instead of replacing it, producing `auto: stable` and `hostname: <node>` in the same document, which Talos rejects with `HostnameConfig: 'auto' and 'hostname' cannot be set at the same time`. Setting `auto: null` in the patch to delete the field does not work either; the merge still emits `auto: stable`. Verified by plan plus `apply-config --dry-run`, no cluster changes made.
- **Do not** simply drop the static hostname and let `auto: stable` name the nodes. It derives hostnames from machine identity, so every node would rename, orphaning the existing Node objects along with PV `nodeAffinity` and the `topology.kubernetes.io/zone` labels.
- **Unblock:** What is left is an RFC6902 JSON patch with a `remove` op on `/auto` targeted at the `HostnameConfig` document, which needs correct document targeting in a multi-document config. Alternatively wait for the provider or Talos to handle the migration. Verify with `talosctl apply-config --mode=auto --dry-run` on both a worker and a control plane before applying, per `docs/platform/cluster/talos-upgrade.md`. In the same change, pin `machine.install.grubUseUKICmdline = false`: the provider emits `true` from the 1.12 contract, but these nodes boot via GRUB and their running cmdline carries `talos.platform=nocloud` and `net.ifnames=0`, which the UKI's own command line would not reproduce. That field is unknown to the 1.11 contract, so it can only be added together with the contract bump.
- **Worth it?** Probably not yet. Roughly half a day with a real risk of node renames, and no functional payoff: Talos accepts older-contract configs for several releases and nothing is broken. Talos 1.14 did not force it; reasonable to leave until the Kubernetes 1.37 round does.
- **Where:** `terraform/proxmox/hyper-cluster/k8s/talos/talos-cluster.tf` (`config_patches` in both `data.talos_machine_configuration` blocks), `terraform.tfvars` (`talos_config_contract`).

### hyper1 boots an unpinned kernel
- **What:** hyper1 runs `7.0.6-2-pve`, but the intended pin is `6.14.11-9-pve`. `GRUB_DEFAULT` plus `update-grub` writes the right `set default=` line to `/boot/grub/grub.cfg`, yet the host still boots 7.0.6.
- **Why deferred:** GPU passthrough works on 7.0.6, and each attempt costs a hyper1 outage (`genesis-ctrl-01` and `genesis-worker-01`).
- **Unblock:** check `grub-editenv /boot/grub/grubenv list` for a `saved_entry` or `next_entry` override, compare the submenu id in `set default` with the `--id` values in `grub.cfg`, then fall back to a numeric `GRUB_DEFAULT="1>2"` or `GRUB_DEFAULT=saved` plus `grub-set-default`. Append the `GRUB_DEFAULT` line rather than `sed`-replacing it, since a missing line makes the `sed` a no-op.
- **Where:** hyper1 `/etc/default/grub` (host config outside Git), `docs/platform/cluster/gpu-passthrough.md`.

### Kubernetes 1.37 on Genesis
- **What:** Genesis runs Talos v1.14.1 with Kubernetes v1.36.5. Talos 1.14 supports Kubernetes up to 1.37, so only the Kubernetes target is left to raise, by the two-phase flow.
- **Why deferred:** Kubernetes 1.37 is not supported yet by the released Cilium (1.20.2, tested to 1.36; 1.37 only on 1.21 pre-releases), cert-manager (v1.21.2) or Argo CD (3.5.3). KEDA 2.20.2 is tested only to 1.35; 2.21.0 is out and not yet checked.
- **Unblock:** once Cilium 1.21 is GA and cert-manager and Argo CD list 1.37, bump those first, then raise `kubernetes_version`. That round likely also needs the `talos_config_contract` entry above and the talos provider at 0.12.0. Follow `docs/platform/cluster/talos-upgrade.md`.
- **Where:** `terraform/proxmox/hyper-cluster/k8s/talos/{terraform.tfvars,upgrade-k8s.tf}`, `k8s/talos/infra/{cilium,cert-manager,argocd,keda}/`, `docs/platform/cluster/talos-upgrade.md`.

### UniFi gateway settings (`usg`) are still console-only
- **What:** every `unifi_setting` section is in `terraform/unifi/network/settings.tf` except `usg`: conntrack timeouts, the ALG modules, UPnP, redirects and the DNS verification servers.
- **Why deferred:** the provider (0.56.1) builds `usg` from its model alone and go-unifi always sends fields the provider does not model (`mdns_enabled`, `lldp_enable_all`, `dhcpd_use_dnsmasq`, the DHCP relay servers), so declaring the section would write `false` into them and could turn off mDNS across VLANs.
- **Unblock:** a provider release that reads the live `usg` section before writing, as it already does for `mgmt` and `igmp_snooping`, or that models those fields. Then declare `usg` with the live values from `/proxy/network/api/s/default/get/setting` and diff the section before and after the first apply.
- **Where:** `terraform/unifi/network/settings.tf`, provider `ubiquiti-community/unifi` (`unifi/setting_resource.go`, the `USG` branch of `Update`).

### Proxmox-CSI detach can leave a VM disk as a pending delete
- **What:** when a PVC moves off a VM while that VM's config is locked (reboot, backup), the CSI unplug succeeds in QEMU but the config write times out (`can't lock file '/var/lock/qemu-server/lock-<vmid>.conf'`). The disk stays in the config as a pending delete and every vzdump of that VM fails with `Device 'drive-scsiN' not found` until `qm set <vmid> --delete scsiN` is run. `pbs-backup-check` now fails on it and prints that command; the root cause is still in the plugin.
- **Why deferred:** the fix belongs upstream (retry the config write on lock timeout), and the manual clear takes a minute once flagged.
- **Unblock:** raise it with sergelogvinov/proxmox-csi-plugin with the lock-timeout log line, or adopt a release that retries.
- **Where:** `k8s/talos/infra/proxmox-csi-plugin/`, `k8s/talos/infra/backup-check/freshness.yaml`.

### UniFi follow-ups from the IoT onboarding prep
- **What:** loose ends after moving the site into `terraform/unifi/network`: (1) an unidentified Wi-Fi client `WINC-00-00` (Microchip module in some appliance) needs the new Eden-IoT password and then a reservation and name in `clients.tf`; (2) the Voice PE, once onboarded on Eden-IoT, should get a reservation there too, like the Bluetooth proxy; (3) the old state blob `unifi/firewall.tfstate` is still in the azurerm container after the move to `unifi/network.tfstate`; (4) the wireless mesh key (`x_mesh_psk`) was printed during a session and could be regenerated, although nothing uses wireless uplinks.
- **Why deferred:** (1) and (2) wait on physical devices, (3) needs the Azure login the user drives, (4) is low risk.
- **Unblock:** (1) identify the appliance, reconnect it, add `{ mac, ip }` to `local.reservations`; (2) same for the Voice PE after setup; (3) delete the blob once `unifi/network.tfstate` has been in use for a while; (4) regenerate from the console if wanted.
- **Where:** `terraform/unifi/network/clients.tf`, azurerm container `tfstate` in `sttfstatemvnhomelab`.
