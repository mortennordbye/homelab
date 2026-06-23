# Backlog

Known gaps the team has agreed to leave for later. Each entry: **what**, **why deferred**, **what unblocks**, **where**.

## AI / RAG POC

### Eval harness
- **What:** Add a small labelled QA set against the committed fixture corpus (the four `contract_<slug>.pdf` files) and a `make eval` target that scores precision@k.
- **Why deferred:** Pipeline shape, multi-document loading, and the refusal prompt are all validated against the fixtures interactively. Quality measurement is the obvious next layer but requires a labelled set and a metric choice (precision@k vs. LLM-as-judge) that wasn't worth deciding mid-POC.
- **Unblock:** Author 15–25 QA pairs against the four fixtures (single-doc + cross-doc questions, plus a handful of out-of-corpus refusals), pick the metric, wire `make eval` to the existing chain.
- **Where:** `ai/projects/local-rag-poc/main.py`, `ai/projects/local-rag-poc/Makefile`, plus a new `ai/projects/local-rag-poc/evals/` directory.

## Portfolio modern — items deferred during initial build

### Brotli precompression for nginx static assets
- **What:** Ship `.br` siblings alongside the existing `.gz` files and enable `brotli_static on;` in `nginx.conf`. Typical 15-25% smaller transfer than gzip on JS/CSS/HTML.
- **Why deferred:** The `nginxinc/nginx-unprivileged:*-alpine` image ships a custom nginx build whose ABI doesn't match Alpine's apk `nginx-mod-http-brotli` package — the module loads but reports `not binary compatible` at startup. Switching back to plain `nginx:alpine` to apk-install a matching module would lose the unprivileged-runtime fix we just added.
- **Unblock:** Either (a) compile the brotli module from source in a build stage matched to the nginxinc nginx version, or (b) switch to a maintained brotli-bundled image (e.g. `fholzer/nginx-brotli`) and re-verify unprivileged operation. The `brotli` CLI invocation in the build stage is one extra `find … -exec brotli -q 11 -k {} \;` next to the existing gzip line.
- **Where:** `portfolio/Dockerfile` (final stage), `portfolio/nginx/nginx.conf` (`load_module`, `brotli_static on`).

### Docker build verification
- **What:** Build and run `portfolio/Dockerfile` end-to-end (`docker build` then `docker run -p 8080:8080`) and confirm `/healthz`, security headers, and routing work as expected.
- **Why deferred:** Local build was verified via `npm run build` + `npx serve out`; Docker layer not run during the rebuild session.
- **Unblock:** `cd portfolio && docker build -t portfolio:dev .` then exercise the routes.
- **Where:** `portfolio/Dockerfile`, `portfolio/nginx/`.

### OG / social-card images
- **What:** Add `app/opengraph-image.tsx` (root) and `app/work/[slug]/opengraph-image.tsx` so links to the site render rich previews.
- **Why deferred:** Out of scope for the initial cut — site is functional without it; first-time deploys pull a default OG.
- **Unblock:** Decide whether to use Next's `ImageResponse` (works under static export) or a build-time script with `@vercel/og`.
- **Where:** `portfolio/src/app/`.

### Lighthouse / axe verification on the live stage URL
- **What:** Run Lighthouse mobile + `@axe-core/cli` against the deployed `portfolio-stage` URL and act on findings (target ≥95 perf / 100 a11y / 100 SEO).
- **Why deferred:** Site has not yet been deployed to stage — first push to `portfolio/**` will trigger CI and deploy.
- **Unblock:** Push the branch, wait for ArgoCD sync, run Lighthouse against `portfolio-stage.local.bigd.no`.
- **Where:** Run from `portfolio/` after deploy.

### Cutover from old portfolio to new
- **What:** Once the new site is approved on stage, promote it to prod (`workflow_dispatch` → `environment: prod`) and remove the old `portfolio/` tree + `.github/workflows/build-portfolio.yaml`.
- **Why deferred:** User chose stage-first cutover. Old portfolio stays in the repo until promotion is approved.
- **Unblock:** User reviews stage, then triggers the prod workflow_dispatch, then opens a cleanup PR.
- **Where:** `portfolio/`, `.github/workflows/build-portfolio.yaml`, `k8s/talos/apps/portfolio*/deployment.yaml`.

### CI auto-rebuild of CV/résumé PDFs on content change
- **What:** GitHub Action that runs `cd portfolio && make cv` (with TeX Live in CI) when `src/content/{site,resume,skills}.ts` changes, then commits the refreshed `public/{resume,cv}.pdf` back to the branch.
- **Why deferred:** Manual `make cv` works fine for now; user can re-run locally and commit the PDFs. Adding CI = an extra ~3 GB Docker layer or a `xu-cheng/latex-action` step in the workflow.
- **Unblock:** Decide whether the CI runs the full TeX Live image (slow but cached) or a slim variant. Add a `.github/workflows/build-cv.yaml`.
- **Where:** `.github/workflows/`, `portfolio/Makefile` already has the targets.

### Tighten résumé bullet copy for PDF density
- **What:** The website resume bullets read more like LinkedIn paragraphs than CV bullets — fine for the web (long-form) but pushes the PDF to 2 pages with dense text. Tightening to 1 sentence per `\item` would let the résumé fit on a single page.
- **Why deferred:** Single-source-of-truth design means tightening for the PDF would shorten the website too — that's a content-voice decision, not a tooling fix.
- **Unblock:** Edit each `description` array in `src/content/resume.ts` to 1 punchy sentence per element.
- **Where:** `portfolio/src/content/resume.ts`.

### Image optimization pass
- **What:** Re-encode the migrated case-study images via `sharp` to a normalised max-width and AVIF + WebP. Drop any unused PNGs that weren't migrated.
- **Why deferred:** Existing WebPs work fine; this is a perf optimisation, not a blocker.
- **Unblock:** Add a `scripts/optimize-images.ts` step that runs `sharp` over `public/images/`.
- **Where:** `portfolio/public/images/`.

### ESLint 9 → 10 and TypeScript 5 → 6 bump
- **What:** Bump `eslint` to `^10` and `typescript` to `^6` in `portfolio/package.json`. Held back during the 2026-06-16 dependency-upgrade pass (which shipped Node 22, Next 16.2.9, React 19.2.7, and the patch/minor batch).
- **Why deferred:** `eslint-config-next@16.2.9` transitively bundles `typescript-eslint@8`, whose ESLint peer range tops out at 9 and which warns on TS 6.x. Forcing either major now risks a peer/plugin mismatch with zero runtime benefit (lint + typecheck only). The two unblock together.
- **Unblock:** Wait for an `eslint-config-next` release built on `typescript-eslint@9` (supports ESLint 10 + TS 6). Then bump both, run a containerised `tsc --noEmit` and `next build`, and clear any new `strict`-mode diagnostics TS 6 surfaces.
- **Where:** `portfolio/package.json`, `portfolio/eslint.config.mjs`; see `portfolio/DEPENDENCY-UPGRADE-PLAN.md` (Phase 3).

## Cluster / infra

### KEDA phase 2 — HTTP add-on for daytime wake-from-zero
- **What:** Phase 1 (shipped) installed KEDA core and cron `ScaledObject`s that take the idle stateless apps to 0 overnight and dim prod (portfolio/blog) from 3→1. Phase 2 is the KEDA **HTTP add-on** (`keda-add-ons-http`) so the idle toys can scale to 0 *during the day when genuinely idle* and wake on the first request, instead of being pinned at 1 from 07:00–23:00. Target apps the user already greenlit: `it-tools`, `omni-tools`, `headroom`, `portfolio-stage`, `blog-stage`. Prod portfolio/blog intentionally excluded (cold-start 503 risk for real visitors).
- **Why deferred:** User chose "cron only, first" — wanted the zero-risk time-based win before adding the request-path interceptor. The HTTP add-on inserts a proxy hop (`Traefik → interceptor → pod`) which means rewiring each app's Gateway API `HTTPRoute` to point at the interceptor service instead of the app Service, plus a per-app `HTTPScaledObject`. That's a routing change worth doing deliberately, not bundled into the cron pass.
- **Unblock:** (1) Add `infra/keda-http-add-on/` (helm chart `kedacore/keda-add-ons-http`, namespace `keda`). (2) For each target app, replace the cron `ScaledObject` with an `HTTPScaledObject` (or keep cron as a floor and layer HTTP on top). (3) Repoint each `httproute.yaml` `backendRef` to the interceptor proxy Service (`keda-add-ons-http-interceptor-proxy.keda:8080`) with the app host as the routing key. (4) Verify cold-start latency on first request is acceptable (~2–3s for these lightweight images) and that the interceptor respects the existing `CiliumNetworkPolicy` on each app namespace — may need a policy allowing keda-ns → app-ns traffic.
- **Where:** new `k8s/talos/infra/keda-http-add-on/`; per-app `k8s/talos/apps/{it-tools,omni-tools,headroom,portfolio-stage,blog-stage}/{scaledobject.yaml,httproute.yaml,ciliumnetworkpolicy.yaml}`. Phase-1 cron `ScaledObject`s already in each of those dirs as the reference.

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

### Cilium L2 announce VIP co-location risk
- **What:** Both `traefik-private` (10.3.10.102) and `traefik-public` (10.3.10.101) L2 leases are claimed by whichever node wins the election — historically `genesis-ctrl-02`. A single bad node takes down every internal *and* external Traefik VIP at once.
- **Why deferred:** Out of scope for the BPF fix above; needs a policy design decision.
- **Unblock:** Split into two separate `CiliumL2AnnouncementPolicy` resources with disjoint `nodeSelector`s (e.g. private → ctrl-only, public → worker-only) so an election blip never blackholes both. Validate that L2 lease params (`leaseDuration` / `leaseRenewDeadline` / `leaseRetryPeriod`) are set conservatively — defaults can re-elect aggressively under control-plane load.
- **Where:** `k8s/talos/infra/cilium/l2-announcement-policy.yaml`.
