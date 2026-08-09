# Kargo — app promotion

Kargo promotes container images into the cluster on top of Argo CD. CI only
builds and pushes the image; Kargo owns the git write and the promotion. Live for
**portfolio, blog, logeverylift, and headroom**.
Design/rollout history (superseded where it disagrees with this file):
[`docs/kargo-pilot-plan.md`](kargo-pilot-plan.md).

## Two app shapes

- **Two-stage** (`portfolio`, `blog`) — `stage` → `prod`. `stage` auto-promotes and
  is smoke-tested; only stage-verified Freight reaches `prod`. Source + CI live in
  this monorepo.
- **Single-env** (`logeverylift`, `headroom`) — one `prod` Stage fed directly by
  the Warehouse and auto-promoted. Source + CI live in the app's own repo; only the
  deploy manifests live here.

## Two promotion styles

Every Stage runs a shared cluster-scoped ClusterPromotionTask and only supplies
per-app vars (`appName`, `appPath`, `imageRepo`, `argocdApp`).

- **Direct push — `promote-to-argocd`** ([`clusterpromotiontask.yaml`](../k8s/talos/infra/kargo-projects/clusterpromotiontask.yaml)):
  `git-clone → kustomize-set-image → git-commit → git-push (main) → argocd-update → argocd-wait`.
  Used by every `stage` Stage and by `blog` prod.
- **PR-gated — `promote-via-pr`** ([`clusterpromotiontask-pr.yaml`](../k8s/talos/infra/kargo-projects/clusterpromotiontask-pr.yaml)):
  pushes the bump to a generated branch, opens a homelab PR, and **blocks on the
  merge** before syncing:
  `… git-commit → git-push (generateTargetBranch) → git-open-pr → git-wait-for-pr → argocd-update → argocd-wait`.
  Used by `portfolio`, `logeverylift`, and `headroom` prod. Merging the PR in
  GitHub is the deploy gate — there is no Kargo UI click.

Both end with `argocd-update` + `argocd-wait` (blocks until the Argo CD app is
Synced + Healthy). `desiredRevision` is deliberately **not** pinned: apps track
shared `main` HEAD, so pinning the health check to one commit makes the Stage go
perpetually Unhealthy on the next commit. Real verification is each Stage's own
AnalysisTemplate smoke test.

## Flow (single-env, PR-gated — logeverylift/headroom)

```
app-repo push → CI builds+pushes GHCR image :0.0.<run> → Warehouse → Freight
                                                                        │
                                                          auto-promote  ▼
                                                                      prod (promote-via-pr)
                                                                        │
                                            git-push branch → git-open-pr → homelab PR
                                                                        │  (you merge)
                                                        git-wait-for-pr → argocd-update + wait
                                                                        │
                                                                   smoke test
```

Two-stage apps are the same with a `stage` Stage (direct-push, auto-promoted,
smoke-tested) in front, gating what Freight `prod` can receive.

## Critical facts

| Item | Value |
| --- | --- |
| Project / namespace | `<app>-cd` (e.g. `logeverylift-cd`) — distinct from the app namespace |
| Watched image | portfolio/blog: `ghcr.io/mortennordbye/homelab/<app>`; logeverylift/headroom: `ghcr.io/mortennordbye/<app>` (`SemVer`, `strictSemvers`) |
| Image tags | CI tags every build `0.0.<run_number>`; SemVer selects the greatest |
| prod promotion | `promote-via-pr` (portfolio, logeverylift, headroom) opens a homelab PR; `blog` prod is direct push |
| Git write | GitHub App `mortennordbye-homelab-deployer` — needs **Contents AND Pull requests** read/write (PR flow); cred via ESO, per-Project |
| Sync trigger | `argocd-update` + `argocd-wait` (needs `kargo.akuity.io/authorized-stage` on the Argo app) |
| Smoke test | two-stage: `<app>-stage.local.bigd.no`; single-env: the app's URL (private gateway → `-k`) |
| Discovery latency | ~1 min — Warehouses poll at `interval: 1m0s` and the controller floor is set to match |
| PR labels | `kargo`, `app/<name>`, `env/<stage>`, attached by `git-open-pr` |
| UI | `https://kargo.local.bigd.no` (admin account) |
| Version | Kargo `1.10.9`, Argo Rollouts `2.41.0` (verification CRDs) |

## Files

| Path | Purpose |
| --- | --- |
| `k8s/talos/infra/kargo/` | Kargo install (Helm OCI) + UI route |
| `k8s/talos/infra/argo-rollouts/` | AnalysisTemplate/AnalysisRun CRDs for verification |
| `k8s/talos/infra/kargo-projects/clusterpromotiontask.yaml` | Shared direct-push task `promote-to-argocd` |
| `k8s/talos/infra/kargo-projects/clusterpromotiontask-pr.yaml` | Shared PR-gated task `promote-via-pr` |
| `k8s/talos/infra/kargo-projects/<app>.yaml` | One multi-doc file per app (Namespace, Project, ProjectConfig, ESO git cred, Warehouse, AnalysisTemplate, Stage(s)) |
| `k8s/talos/infra/argocd/apps.yaml` | `authorized-stage` annotation via `goTemplate` + `templatePatch` (list-driven) |
| `.github/workflows/kargo-automerge.yaml` | Squash-merges promotion PRs for apps listed in `KARGO_AUTOMERGE_APPS` |

## Operate

- **Deploy to prod:** fully automatic up to the gate — merge the PR Kargo opens
  (`chore(<app>): promote 0.0.N to prod`). Nothing reaches prod without that merge.
- **Auto-merge:** apps named in the `KARGO_AUTOMERGE_APPS` repository variable
  skip that click. `.github/workflows/kargo-automerge.yaml` squash-merges their
  promotion PR as soon as it opens, keyed on the `app/<name>` label. The list is
  currently the three single-env apps: `logeverylift,verksted,reelsmith`.
  Editing the variable under Settings > Secrets and variables > Actions is the
  kill switch — per app or all of them, no commit and no deploy. Kargo still
  opens the PR and blocks on it, so turning auto-merge off just puts a human
  back in front of it.
- **Trigger a build:** push under the app's path (monorepo) or to the app repo's
  `main` (external).
- **Inspect:** `kubectl -n <app>-cd get warehouse,stage,freight,promotion`.

## Onboard another app

### A. In-repo, two-stage (like portfolio/blog)

1. **Kustomizations** — add an `images:` block to the prod and stage kustomizations
   (`name: ghcr.io/mortennordbye/homelab/<app>`, `newTag` = the currently deployed
   tag, so rendering is unchanged).
2. **CI** — drop the manifest-write step, set the job to `contents: read`, and add a
   `0.0.${{ github.run_number }}` tag so the SemVer Warehouse can select builds.
3. **Pipeline** — add `kargo-projects/<app>.yaml` (copy `portfolio.yaml`): stage
   uses `promote-to-argocd`, prod uses `promote-via-pr`; register it in
   `kargo-projects/kustomization.yaml`.
4. **Authorize** — add `<app>` to the `apps.yaml` `templatePatch` list.

### B. External-repo, single-env (like logeverylift/headroom)

The app's source + CI live in its own repo (`mortennordbye/<app>`). "Both sides":

1. **App manifests** — the deploy manifests must exist under `k8s/talos/apps/<app>/`
   (create them if new). Add an `images:` block to that kustomization
   (`name: ghcr.io/mortennordbye/<app>`, `newTag` = current tag).
2. **Pipeline** — add `kargo-projects/<app>.yaml` (copy `logeverylift.yaml`): one
   Warehouse + one auto-promoted `prod` Stage using `promote-via-pr` + one smoke
   AnalysisTemplate on the app's URL. Register it in `kargo-projects/kustomization.yaml`;
   add `<app>` to the `apps.yaml` list (stamps `<app>-cd:prod`; the `-stage` arm
   renders nothing with no such app dir).
3. **App repo CI** — in the app's build workflow: add
   `type=raw,value=0.0.${{ github.run_number }},enable={{is_default_branch}}`, and
   **delete the `deploy:` job** that called `homelab/.github/workflows/bump-image.yml`
   (Kargo replaces the self-opened PR) plus the now-orphaned short-SHA step/output.

Merge order is safe either way: the Warehouse has no Freight until the first
`0.0.<run>` build, and the deploy job is removed in the same CI PR, so there is no
double-write. Merging the CI PR is itself a push that triggers the first build.

> This supersedes `bump-image.yml` / [`gitops-external-app-deploys.md`](gitops-external-app-deploys.md)
> for Kargo-managed external apps. `bump-image.yml` stays only for any external app
> not yet on Kargo.

### Git credential (both variants)

The ExternalSecret reuses the same GitHub App: keep the three Bitwarden UUIDs and
the `conversionStrategy`/`decodingStrategy`/`metadataPolicy` fields; only its
`namespace` changes to `<app>-cd`.

## Conventions & gotchas

- **PR flow needs `task.outputs`.** Inside a (Cluster)PromotionTask, one step
  references another's output as `task.outputs['<alias>']`, **not** `outputs.<alias>`
  (task steps are inflated as `task-1::<alias>` at Promotion time). Plain `outputs.*`
  resolves to nil — `git-open-pr` then gets an empty branch and the bump strands on
  an orphan `kargo/promotion/…` branch while the promotion reports Succeeded.
- **No-op guard keys on the git-commit output, not the branch.** `git-push` with
  `generateTargetBranch` creates a branch even when nothing changed, so branch
  presence is not a no-op signal. `git-commit` is skipped with no `commit` output
  when there is nothing to commit — guard the push/open-pr/wait-pr steps with
  `if: ${{ (task.outputs?.['commit']?.commit ?? '') != '' }}` so a no-op re-promote
  (Warehouse re-creating Freight for the already-live tag) skips cleanly and still
  ends green via `argocd-wait`.
- **A Warehouse `interval` is a request, not a promise.** Kargo polls at the
  greater of `spec.interval` and the controller's
  `controller.reconcilers.warehouses.minReconciliationInterval`. The chart
  defaults that floor to `5m0s`, so every Warehouse here sat at 5 minutes while
  its manifest read `1m0s` and nothing anywhere reported the clamp. The floor is
  now `1m0s` in `kargo/values.yaml`; lowering a Warehouse below it needs both
  numbers changed. Making discovery instant instead needs a webhook receiver,
  which needs the external webhooks server reachable from the internet — it is
  currently only on the private gateway.
- **Commit authorship is set on `git-clone`, not `git-commit`.** Unset, Kargo
  authors as `Kargo <no-reply@kargo.io>` and GitHub turns that into a
  `Co-authored-by:` trailer on the squash commit. `git-commit`'s own `author`
  field does the same thing but is deprecated since v1.10 and goes away in v1.12.
- **GitHub App scope:** the PR flow needs **Pull requests: read/write** in addition
  to Contents. Without it, `git-open-pr` fails.
- **Stage namespace flips word order:** the `<app>-stage` overlay dir maps to
  namespace `stage-<app>`; every stage manifest declares it explicitly and that wins.
- GitHub App cred needs the **Installation ID** (not the App ID). Wrong value =
  git-push fails with GitHub `404` on the installation-access-token call.
- ESO remoteRefs and the Warehouse must spell out defaulted fields
  (`conversionStrategy`/`decodingStrategy`/`metadataPolicy`; `strictSemvers`,
  `interval`, `discoveryLimit`) or Argo CD reports perpetual `OutOfSync`.
- Per-app annotations in the `apps` ApplicationSet must use `templatePatch`; inline
  `{{if}}` in the parsed `template` is invalid YAML. Verify offline with
  `argocd appset generate --core -n argocd <file>` (swap the git generator for a
  `list` generator).
- **Private-gateway smoke DNS (temporary, 2026-07):** `*.local.bigd.no` for
  logeverylift/headroom does not yet resolve from in-cluster pods, so their prod
  smoke AnalysisRuns go red even though the deploy + promotion Succeeded. The smoke
  config is correct and passes once DNS is fixed. portfolio prod smoke curls the
  public `nordbye.it`, so it is unaffected.
