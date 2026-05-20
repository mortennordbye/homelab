# Backlog

Known gaps the team has agreed to leave for later. Each entry: **what**, **why deferred**, **what unblocks**, **where**.

## AI / RAG POC

### Eval harness
- **What:** Add a small labelled QA set against the committed fixture corpus (the four `contract_<slug>.pdf` files) and a `make eval` target that scores precision@k.
- **Why deferred:** Pipeline shape, multi-document loading, and the refusal prompt are all validated against the fixtures interactively. Quality measurement is the obvious next layer but requires a labelled set and a metric choice (precision@k vs. LLM-as-judge) that wasn't worth deciding mid-POC.
- **Unblock:** Author 15–25 QA pairs against the four fixtures (single-doc + cross-doc questions, plus a handful of out-of-corpus refusals), pick the metric, wire `make eval` to the existing chain.
- **Where:** `ai/projects/local-rag-poc/main.py`, `ai/projects/local-rag-poc/Makefile`, plus a new `ai/projects/local-rag-poc/evals/` directory.

## Portfolio modern — items deferred during initial build

### Docker build verification
- **What:** Build and run `portfolio-modern/Dockerfile` end-to-end (`docker build` then `docker run -p 8080:8080`) and confirm `/healthz`, security headers, and routing work as expected.
- **Why deferred:** Local build was verified via `npm run build` + `npx serve out`; Docker layer not run during the rebuild session.
- **Unblock:** `cd portfolio-modern && docker build -t portfolio-modern:dev .` then exercise the routes.
- **Where:** `portfolio-modern/Dockerfile`, `portfolio-modern/nginx/`.

### OG / social-card images
- **What:** Add `app/opengraph-image.tsx` (root) and `app/work/[slug]/opengraph-image.tsx` so links to the site render rich previews.
- **Why deferred:** Out of scope for the initial cut — site is functional without it; first-time deploys pull a default OG.
- **Unblock:** Decide whether to use Next's `ImageResponse` (works under static export) or a build-time script with `@vercel/og`.
- **Where:** `portfolio-modern/src/app/`.

### Lighthouse / axe verification on the live stage URL
- **What:** Run Lighthouse mobile + `@axe-core/cli` against the deployed `portfolio-stage` URL and act on findings (target ≥95 perf / 100 a11y / 100 SEO).
- **Why deferred:** Site has not yet been deployed to stage — first push to `portfolio-modern/**` will trigger CI and deploy.
- **Unblock:** Push the branch, wait for ArgoCD sync, run Lighthouse against `portfolio-stage.local.bigd.no`.
- **Where:** Run from `portfolio-modern/` after deploy.

### Cutover from old portfolio to new
- **What:** Once the new site is approved on stage, promote it to prod (`workflow_dispatch` → `environment: prod`) and remove the old `portfolio/` tree + `.github/workflows/build-portfolio.yaml`.
- **Why deferred:** User chose stage-first cutover. Old portfolio stays in the repo until promotion is approved.
- **Unblock:** User reviews stage, then triggers the prod workflow_dispatch, then opens a cleanup PR.
- **Where:** `portfolio/`, `.github/workflows/build-portfolio.yaml`, `k8s/talos/apps/portfolio*/deployment.yaml`.

### CI auto-rebuild of CV/résumé PDFs on content change
- **What:** GitHub Action that runs `cd portfolio-modern && make cv` (with TeX Live in CI) when `src/content/{site,resume,skills}.ts` changes, then commits the refreshed `public/{resume,cv}.pdf` back to the branch.
- **Why deferred:** Manual `make cv` works fine for now; user can re-run locally and commit the PDFs. Adding CI = an extra ~3 GB Docker layer or a `xu-cheng/latex-action` step in the workflow.
- **Unblock:** Decide whether the CI runs the full TeX Live image (slow but cached) or a slim variant. Add a `.github/workflows/build-cv.yaml`.
- **Where:** `.github/workflows/`, `portfolio-modern/Makefile` already has the targets.

### Tighten résumé bullet copy for PDF density
- **What:** The website resume bullets read more like LinkedIn paragraphs than CV bullets — fine for the web (long-form) but pushes the PDF to 2 pages with dense text. Tightening to 1 sentence per `\item` would let the résumé fit on a single page.
- **Why deferred:** Single-source-of-truth design means tightening for the PDF would shorten the website too — that's a content-voice decision, not a tooling fix.
- **Unblock:** Edit each `description` array in `src/content/resume.ts` to 1 punchy sentence per element.
- **Where:** `portfolio-modern/src/content/resume.ts`.

### Image optimization pass
- **What:** Re-encode the migrated case-study images via `sharp` to a normalised max-width and AVIF + WebP. Drop any unused PNGs that weren't migrated.
- **Why deferred:** Existing WebPs work fine; this is a perf optimisation, not a blocker.
- **Unblock:** Add a `scripts/optimize-images.ts` step that runs `sharp` over `public/images/`.
- **Where:** `portfolio-modern/public/images/`.

## Cluster / infra

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
