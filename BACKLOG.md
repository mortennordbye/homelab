# Backlog

Known gaps the team has agreed to leave for later. Each entry: **what**, **why deferred**, **what unblocks**, **where**.

## Apps

### Flip blog prod to the unprivileged nginx port
- **What:** `blog/Dockerfile` now serves from `nginxinc/nginx-unprivileged` on port 8080, and `blog-stage` was moved to match. Blog **prod** is deliberately still on port 80 everywhere: `deployment.yaml` (`containerPort`), `service.yaml` (`targetPort`), and both `toPorts` rules in `ciliumnetworkpolicy.yaml`.
- **Why deferred:** Prod runs an older image (`newTag: 0.0.96`) that still listens on 80. Flipping the prod manifests before that image is promoted would point the Service and the network policy at a port nothing is listening on, taking the blog down until the promotion lands. Kargo's prod stage uses `promote-via-pr`, so prod does not move on its own — the two changes have to land together.
- **Unblock:** When the Kargo prod promotion PR for the first image built after this change appears, add the port edits to that same PR before merging: `containerPort: 8080`, `targetPort: 8080`, and both CiliumNetworkPolicy `toPorts` entries to `"8080"`. Mirror the `securityContext`, `/tmp` emptyDir and `automountServiceAccountToken: false` from `blog-stage/deployment.yaml`. Verify with `kubectl diff -k k8s/talos/apps/blog --server-side --field-manager=argocd-controller` (the default field manager reports a spurious duplicate-port error).
- **Where:** `k8s/talos/apps/blog/{deployment,service,ciliumnetworkpolicy}.yaml`, mirroring `k8s/talos/apps/blog-stage/`.

### Orphaned huntarr manifest
- **What:** `k8s/talos/apps/arr-stack/huntarr.yaml` is commented out of the arr-stack `kustomization.yaml`, nothing is running in the cluster, and `ghcr.io/plexguide/huntarr` no longer resolves in any registry (the upstream repo is gone). Renovate is now explicitly disabled for that image, which was the source of a permanent "Package lookup failures" problem on the dependency dashboard.
- **Why deferred:** Deleting someone's disabled app manifest is a judgement call, not a dependency fix. The Renovate disable removes the noise either way.
- **Unblock:** Decide whether huntarr comes back. If yes, repoint the image at a maintained fork and drop the disable rule from `renovate.json`. If no, delete the manifest and the commented line, and drop the disable rule.
- **Where:** `k8s/talos/apps/arr-stack/huntarr.yaml`, `k8s/talos/apps/arr-stack/kustomization.yaml` (line 15), `renovate.json` (huntarr disable rule).

### Remove the old `workout` app after logeverylift cutover
- **What:** `logeverylift.com` was cut over from the old `workout` app to the renamed `logeverylift` app (PR #369, 2026-07-18). The `workout` namespace, Deployment, Postgres, and PVC are still present — both `workout-app` and `postgres` are scaled to 0 (ArgoCD ignores `/spec/replicas`; also declared in the manifests). The data is preserved on `postgres-pvc`; scale `postgres` back to 1 to re-access it. Nothing routes to it.
- **Why deferred:** Kept as rollback until the owner has used `logeverylift.com` for a while and confirmed all data/history is intact. Deleting is one-way (prunes the namespace + PVC).
- **Unblock:** Once verified, delete `k8s/talos/apps/workout/` (ArgoCD prunes the namespace). Archive `workout_db_full.sql` somewhere durable first (it currently lives only in a session scratchpad). Then optionally give `logeverylift` its own Bitwarden items instead of sharing workout's (see the comment in `k8s/talos/apps/logeverylift/externalsecret.yaml`).
- **Where:** `k8s/talos/apps/workout/`, `k8s/talos/apps/logeverylift/externalsecret.yaml`.

### Retire Mealie's inert ScaledObject and interceptor hop
- **What:** Mealie is pinned to `minReplicaCount: 1` / `maxReplicaCount: 1`, so its `ScaledObject` triggers (cron + external-push) never fire. Its `HTTPRoute` still sends traffic through `keda-add-ons-http-interceptor-proxy` rather than straight at `mealie-service`, which is now a pointless extra hop.
- **Why deferred:** Removing the ScaledObject and InterceptorRoute and repointing the HTTPRoute is a structural change to the request path of a live household app, and the pin already fixes the logout bug on its own. Not worth bundling into the fix.
- **Unblock:** Delete `scaledobject.yaml` and `interceptorroute.yaml`, drop them from `kustomization.yaml`, and point the `HTTPRoute` `backendRefs` at `mealie-service` port 9000 (drop the cross-namespace ref to `keda`). Check whether `k8s/talos/infra/keda-http-add-on/referencegrant.yaml` still needs a mealie entry afterwards. Verify with `kubectl diff` before merging.
- **Where:** `k8s/talos/apps/mealie/{scaledobject,interceptorroute,httproute,kustomization}.yaml`, `k8s/talos/infra/keda-http-add-on/referencegrant.yaml`.

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

### Outside-in probing for the 30-day health strip
- **What:** The `/infrastructure` page now renders a 30-day health strip from per-day sample counts the status publisher accumulates in `status.json` (`history` array). It is labelled "observed in-cluster" because that is all it is: days where the publisher never ran show as gaps, but the strip cannot see the site being unreachable from the internet while the cluster is fine, and self-reported health proves less than an external probe.
- **Why deferred:** True availability needs an external prober (Uptime Kuma on another host, healthchecks.io, or a GitHub Actions schedule hitting the site) publishing daily results somewhere the static page can fetch.
- **Unblock:** Pick the prober, publish daily results as JSON the page can fetch (second file next to `status.json`, or merged into it), then swap the strip's data source and drop the "observed in-cluster" qualifier.
- **Where:** `portfolio/src/components/infrastructure/LiveStatus.tsx` (`buildUptime`), `k8s/talos/apps/portfolio/status-publisher.yaml` (history merge step).

## Portfolio

### The fun room's printer switches may not respond to `E`
- **What:** The printer's rocker switches read their prompt correctly under the crosshair, but pressing `E` was reported to produce no visible change in the ON/OFF pill. Never reproduced in a browser with working pointer lock, so it may be a headless-harness artifact rather than a real fault.
- **Why deferred:** Needs pointer lock, which headless Chromium does not have, so it cannot be checked from the test harness at all.
- **Unblock:** Open `/fun` in a real browser, look at a printer switch, press `E`, and watch the pill. If it does not flip, instrument `onActivate` in `Interactive` — the registry hands activation the ref payload, so the suspect is either hover resolution or the keydown listener's `enabled` gate.
- **Where:** `portfolio/src/components/fun/Printer.tsx` (`Switch`), `portfolio/src/components/fun/interaction.tsx`.

### Fun room: melody, and a real-device pass
- **What:** Two loose ends in `/fun`. The synthesised rickroll's third line ("never gonna run around and desert you") is the least confident transcription and has never been listened to by anyone. Separately, nothing here has been driven on real hardware: mouse-look and the cold-load loading bar have never run in a browser with working pointer lock, and the touch controls added 2026-07-20 (drag-to-look, tap-to-activate, walk stick, entry gate) were verified only by dispatching synthetic `TouchEvent`s in headless Chromium. That proves the wiring and says nothing about feel — look sensitivity, stick size and placement, and the tap slop threshold are all guesses at this point.
- **Why deferred:** Both need a human: one at a real browser with sound, one on an actual phone. Neither is checkable from headless Chromium.
- **Unblock:** Open `/fun` on a desktop, listen to the melody, hard-reload with cache disabled to see the loading bar. Then open it on a phone and tune `LOOK_SENS`, `TAP_SLOP_PX` and `STICK_R` in `Touch.tsx` against how it actually feels.
- **Where:** `portfolio/src/components/fun/Sonos.tsx` (`MELODY`), `portfolio/src/components/fun/Touch.tsx`, `docs/fun-room-guide.md` (known gaps).

### Image optimization pass
- **What:** Re-encode the migrated case-study images via `sharp` to a normalised max-width and AVIF + WebP. Drop any unused PNGs that weren't migrated.
- **Why deferred:** Existing WebPs work fine; this is a perf optimisation, not a blocker.
- **Unblock:** Add a `scripts/optimize-images.ts` step that runs `sharp` over `public/images/`.
- **Where:** `portfolio/public/images/`.

### Fix react-hooks v6 lint findings (currently downgraded to warnings)
- **What:** `eslint-config-next@16` ships the new react-hooks v6 rules; two of them flag 8 pre-existing errors: `react-hooks/set-state-in-effect` (CommandPalette ×2, FooterStamp, InlineGlobe, ArchitectureDiagram — setState called directly in effect bodies) and `react-hooks/immutability` (InlineGlobeScene — mutating `colorSpace` on textures returned from `useTexture`). Both rules are downgraded to `warn` in `eslint.config.mjs` so lint can gate CI.
- **Why deferred:** Fixing them means refactoring 5 working components (effect restructuring, moving three.js texture setup into the loader callback) with visual/behavioral risk that needs browser re-verification — out of scope for the CI-wiring change that surfaced them. The R3F texture mutations may be acceptable as-is (idiomatic three.js); decide per-case rather than blanket-refactor.
- **Unblock:** Refactor each component (or add per-line disables where the pattern is intentional), verify in the browser via `make up`, then remove the two `warn` overrides from `eslint.config.mjs`.
- **Also:** the fun room's touch support (2026-07-20) took the count from 17 to 24 warnings, all `react-hooks/immutability` and all the same two intentional patterns: mutating the three.js camera inside `useFrame`, and writing to a ref that arrives as a prop (`move.current` in `TouchStick`). Both are correct React/R3F; they need per-line disables rather than a refactor.
- **Where:** `portfolio/eslint.config.mjs`, `portfolio/src/components/{CommandPalette,FooterStamp,InlineGlobe,InlineGlobeScene}.tsx`, `portfolio/src/components/work/ArchitectureDiagram.tsx`, `portfolio/src/components/fun/{Touch,FirstPerson,interaction}.tsx`.

### Playwright smoke test suite for portfolio
- **What:** A small containerized Playwright suite that builds the prod image, runs the container, and asserts key routes return 200 with expected content plus `/healthz`. Wire into `.github/workflows/ci-portfolio.yaml` as a job after lint/typecheck/build.
- **Why deferred:** Tier 2 of the linting/testing rollout (2026-07-08); user approved shipping lint + typecheck + build gates first. Adds ~2–3 min to CI and needs a committed Playwright config decision (image, route list).
- **Unblock:** Decide the route/assertion list, add `portfolio/tests/` with a Playwright config running via `mcr.microsoft.com/playwright` Docker image, add the CI job.
- **Where:** `.github/workflows/ci-portfolio.yaml`, new `portfolio/tests/`.

### ESLint 9 → 10 bump
- **What:** Bump `eslint` to `^10` in `portfolio/package.json`. Originally paired with a TypeScript 5 → 6 bump; the TS half has since shipped (`typescript` is now `^6.0.0`), leaving only ESLint.
- **Why deferred:** `eslint-config-next@16.2.10` transitively bundles `typescript-eslint@8`, whose ESLint peer range tops out at 9. Forcing the major risks a peer/plugin mismatch with zero runtime benefit (lint only).
- **Unblock:** Wait for an `eslint-config-next` release built on `typescript-eslint@9` (supports ESLint 10). Then bump, and run a containerised `make lint` to confirm the config still loads.
- **Where:** `portfolio/package.json`, `portfolio/eslint.config.mjs`; see `portfolio/DEPENDENCY-UPGRADE-PLAN.md` (Phase 3).

## Portfolio API

### Real stateful write endpoints
- **What:** The write framework ships only a stateless example (`POST /api/v1/echo`). A useful write (e.g. a guestbook, or a "notify me" capture) needs a datastore.
- **Why deferred:** Scope was the read API + a proven auth seam. Persistence is a separate design (schema, storage, retention, abuse handling).
- **Unblock:** Pick a store (SQLite on a PVC for a single-writer app, or the existing CNPG Postgres), add a route under `src/app/api/v1/` guarded by `requireApiKey`, and wire storage + any needed CiliumNetworkPolicy egress.
- **Where:** `portfolio/src/app/api/v1/`, `portfolio/src/lib/api.ts`.

### Authentik forward-auth option for writes
- **What:** Writes currently authenticate with a static API key. For SSO-consistent, per-user writes, route the write paths through Authentik (Traefik forward-auth / OIDC) instead.
- **Why deferred:** The static key is simpler and sufficient to ship the framework; Authentik wiring only pays off once a real user-facing write exists.
- **Unblock:** Add an Authentik provider + Traefik forward-auth middleware on the `/api/v1` POST paths, and relax `requireApiKey` to accept the forwarded identity.
- **Where:** `portfolio/src/lib/api.ts`, `k8s/talos/apps/portfolio/httproute.yaml`, Authentik config.

### Silence the Turbopack NFT over-trace on /api/v1/infra
- **What:** `next build` warns that the `fs.readFile` in the infra route causes Node File Tracing to sweep the whole project into `.next/standalone` (locally this pulled in `latex/`, `out/`, CV markdown). The shipped Docker image is unaffected because the build stage only `COPY`s `src`/`public`/config, but the warning is noise and the local standalone is bloated.
- **Why deferred:** Cosmetic; build is green and the runtime image is lean.
- **Unblock:** Scope the read (constant path, or `outputFileTracingRoot`/`outputFileTracingExcludes` in `next.config.ts`) until the warning clears without pulling in extra files.
- **Where:** `portfolio/src/app/api/v1/infra/route.ts`, `portfolio/next.config.ts`.

## Cluster / infra

### Extend Loki PVC after kube-events validated
- **What:** Bump the Loki single-binary PVC from 20Gi (`singleBinary.persistence.size`). Deferred until the new Kubernetes-events ingestion (Alloy `loki.source.kubernetes_events`, 7d per-stream retention) is confirmed working and we can measure real storage growth.
- **Why deferred:** Events are low-volume, so 20Gi is expected to suffice; sizing should be driven by observed usage, not guessed. Also, the PVC is a StatefulSet `volumeClaimTemplate` — immutable after creation — so a resize is non-trivial.
- **Unblock:** Confirm events flow (`{job="kubernetes-events"}` in Grafana) and watch Loki disk usage for a few days. To resize: ensure the `proxmox-local` StorageClass has `allowVolumeExpansion: true`, set the new `size:` in `values.yaml`, then `kubectl delete sts loki --cascade=orphan` and `kubectl patch pvc` on each Loki PVC (or recreate the StatefulSet) so the larger claim takes effect.
- **Where:** `k8s/talos/infra/loki/values.yaml` (`singleBinary.persistence.size`).

### Cilium BPF LB map corruption after agent rollout
- **What:** The 2026-05-16 `policyAuditMode` + CNP rollout (commit `bd89b22`) left `genesis-ctrl-02`'s BPF LoadBalancer map with frontend entries for `10.3.10.101` and `10.3.10.102` but no backend slots. Because that node also held the L2 announce lease for both traefik VIPs, all incoming traffic was ARP-resolved to ctrl-02 and then blackholed in BPF. Cilium's userspace `service list` was correct; only the kernel BPF map drifted. Manifested as random connect-refused on all internal sites until `kubectl delete pod -n kube-system cilium-vvj48` forced reconciliation; the lease re-elected to worker-02/worker-01 (both with healthy BPF state) and stayed there. Same agents on other nodes logged the same startup error class (`delete <vip>@8: key does not exist` against `cilium_l2_responder_v4`) but recovered.
- **Why deferred:** Live-fixed by kicking the pod. Root cause (why ctrl-02 didn't reconcile while peers did) not isolated — could be a Cilium upstream bug, a quirk of `policyAuditMode` enablement, or a race between `cilium-operator` leader election and L2 responder map reconcile during a fast-rolling DS update.
- **Unblock:** (1) Repro check — next time `k8s/talos/infra/cilium/values.yaml` changes and the DS rolls, immediately run on each node: `cilium-dbg bpf lb list | grep <vip>` and confirm every frontend has a paired backend slot. (2) Search Cilium GitHub issues for "l2 responder map" + "key does not exist" in the chart version pinned in `k8s/talos/infra/cilium/kustomization.yaml`. (3) Consider adding a post-sync health check that fails if any node has an orphan frontend. (4) Cilium has a `clean-cilium-bpf-state` initContainer flag — evaluate enabling it on rollouts (trade-off: clean state vs. brief data-plane drop on every restart).
- **Where:** `k8s/talos/infra/cilium/values.yaml`, `k8s/talos/infra/cilium/l2-announcement-policy.yaml`, Cilium agent logs (`module=agent.datapath.l2-responder`).

### Close the Cilium policy audit and move to enforcement
- **What:** The cluster runs `policyAuditMode: true` (`k8s/talos/infra/cilium/values.yaml`) — CiliumNetworkPolicies log but never drop. To enforce, every legitimate flow must be whitelisted first. A 3-minute Hubble snapshot (2026-06-29) showed these `AUDIT` (would-be-denied) flows — all pre-existing infra, none from the KEDA HTTP wake-from-zero apps added the same day:
  - `monitoring/grafana → kube-apiserver:6443` (egress)
  - `monitoring/loki → kube-apiserver:6443` (egress)
  - `monitoring/alertmanager ↔ alertmanager peers :9094` (cluster gossip, both directions)
  - `argocd/argocd-repo-server → world:443` (egress; git/helm fetch)
  - `plex-media-stack/seerr ↔ traefik:8444` (verify direction before writing the rule)
- **Why deferred:** The Hubble ring buffer only retained ~3 minutes (flooded by `VLAN_FILTERED` noise), and there was no Prometheus history of policy verdicts (the `policy` Hubble metric wasn't enabled). 3 minutes can't capture periodic flows (cron, cert-manager renewals, backups, KEDA wake events, infrequently-used apps), so enforcing off that sample would break things. The `policy` Hubble metric was enabled on 2026-06-29 to record verdicts over Prometheus' 7d retention — but the audit window hasn't elapsed yet.
- **Unblock:** After ≥7d, query `sum by (source, destination, source_namespace, destination_namespace, direction) (increase(hubble_policy_verdicts_total{action="audit"}[7d]))` (verified label keys: `action="audit"` is the would-be-denied verdict; `source`/`destination` = workload names, plus the `*_namespace` labels — matching the `workload-name` / `labelsContext` config in cilium values), add an allow rule for each gap (start with the 5 above), then flip `policyAuditMode: false` **namespace-by-namespace**, not cluster-wide. NOTE: enabling the `policy` metric rolls the Cilium DaemonSet — see "Cilium BPF LB map corruption after agent rollout" above; verify per-node BPF LB state right after the roll.
- **Where:** `k8s/talos/infra/cilium/values.yaml` (audit mode + the metric), and the per-app CNPs: `k8s/talos/infra/kube-prometheus-stack/ciliumnetworkpolicy.yaml`, `k8s/talos/infra/loki/ciliumnetworkpolicy.yaml`, `k8s/talos/infra/argocd/ciliumnetworkpolicy.yaml`, `k8s/talos/apps/plex-media-stack/ciliumnetworkpolicies.yaml`.

### Cilium L2 announce VIP co-location risk
- **What:** Both `traefik-private` (10.3.10.102) and `traefik-public` (10.3.10.101) L2 leases are claimed by whichever node wins the election — historically `genesis-ctrl-02`. A single bad node takes down every internal *and* external Traefik VIP at once.
- **Why deferred:** Out of scope for the BPF fix above; needs a policy design decision.
- **Unblock:** Split into two separate `CiliumL2AnnouncementPolicy` resources with disjoint `nodeSelector`s (e.g. private → ctrl-only, public → worker-only) so an election blip never blackholes both. Validate that L2 lease params (`leaseDuration` / `leaseRenewDeadline` / `leaseRetryPeriod`) are set conservatively — defaults can re-elect aggressively under control-plane load.
- **Where:** `k8s/talos/infra/cilium/l2-announcement-policy.yaml`.

## Media stack observability (arr-stack)

### Discord alert rules for the media stack
- **What:** PrometheusRules that page Discord on actionable media-stack conditions — e.g. an *arr queue item stuck (no progress) for >2h, a root folder under a free-space threshold, or an exporter/target down.
- **Why deferred:** Scope of this change was graphs, not alerting. The metrics now exist, so the rules are a clean follow-up; thresholds want a little live baseline first.
- **Unblock:** Add a rule group to `homelab-alerts.yaml` (label `release: kube-prometheus-stack`, `severity: critical` routes to Discord per the existing Alertmanager config). Base the stuck-queue expr on `sonarr_queue_total` / `radarr_queue_total` once a normal range is observed.
- **Where:** `k8s/talos/infra/kube-prometheus-stack/homelab-alerts.yaml`.
