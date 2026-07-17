# Kargo — app promotion

Kargo promotes apps through `stage` then `prod` on top of Argo CD. CI only builds
and pushes the image; Kargo owns the git write and the promotion. Portfolio is
live; the pipeline is built to scale to more apps (blog next).
Design/rollout history (superseded where it disagrees with this file):
[`docs/kargo-pilot-plan.md`](kargo-pilot-plan.md).

## Flow

```
CI build --> GHCR image --> Warehouse --> Freight
                                            |
                              auto + verify v
                                          stage  --(manual)-->  prod
                                            |                     |
                               argocd-update+wait      argocd-update+wait
                                            |                     |
                                       Argo CD sync          Argo CD sync
```

Each Stage runs the shared `promote-to-argocd` ClusterPromotionTask:
`git-clone -> kustomize-set-image -> git-commit -> git-push -> argocd-update -> argocd-wait`.
`argocd-wait` blocks until the Argo CD app is Synced + Healthy.

`desiredRevision` is deliberately **not** pinned. Both stage and prod apps track
shared `main` HEAD, so pinning the health check to one commit makes it fall behind
on the next commit and report the Stage perpetually Unhealthy. Real verification
is the Stage's own AnalysisTemplate smoke test. (See the pilot plan for the full
post-mortem of the pinning attempts.)

## Critical facts

| Item | Value |
| --- | --- |
| Project / namespace | `<app>-cd` (portfolio: `portfolio-cd`) |
| Watched image | `ghcr.io/mortennordbye/homelab/<app>` (`SemVer`, `strictSemvers`) |
| Image tags | CI tags every build `0.0.<run_number>`; SemVer selects the greatest |
| `stage` | auto-promote; verified by HTTP smoke test on `<app>-stage.local.bigd.no` |
| `prod` | manual; only accepts Freight verified in `stage` |
| Git write | GitHub App `mortennordbye-homelab-deployer` (cred via ESO, per-Project) |
| Sync trigger | `argocd-update` + `argocd-wait` (needs `kargo.akuity.io/authorized-stage` on the app) |
| UI | `https://kargo.local.bigd.no` (admin account) |
| Version | Kargo `1.10.9`, Argo Rollouts `2.41.0` (verification CRDs) |

## Files

| Path | Purpose |
| --- | --- |
| `k8s/talos/infra/kargo/` | Kargo install (Helm OCI) + UI route |
| `k8s/talos/infra/argo-rollouts/` | AnalysisTemplate/AnalysisRun CRDs for verification |
| `k8s/talos/infra/kargo-projects/` | All promotion pipelines: shared `clusterpromotiontask.yaml` + one `<app>.yaml` per app |
| `k8s/talos/infra/argocd/apps.yaml` | `authorized-stage` annotation via `goTemplate` + `templatePatch` (list-driven) |

`kargo-projects/` is one Argo CD Application (auto-discovered by the infra
ApplicationSet). Each `<app>.yaml` is a single multi-document file holding that
app's Namespace, Project, ProjectConfig, ExternalSecret (git cred), Warehouse,
AnalysisTemplate, and the `stage`/`prod` Stages. The Stages only carry per-app
vars; the six promotion steps live once in the ClusterPromotionTask.

## Operate

- **Promote to prod:** Kargo UI -> `prod` stage -> *Promote from upstream*.
- **Trigger a build:** push under `portfolio/**`, or `gh workflow run build-portfolio.yaml --ref main -f environment=stage`.
- **Inspect:** `kubectl -n <app>-cd get warehouse,stage,freight,promotion`.

## Onboard another app

For an app `<app>` with `<app>` (prod) and `<app>-stage` overlays:

1. **Kustomizations** — add an `images:` block to the app's prod and stage
   kustomizations (`name: ghcr.io/mortennordbye/homelab/<app>`, `newTag` = the
   currently deployed tag, so rendering is unchanged).
2. **CI** — drop the manifest-write step from the app's build workflow, set the
   job to `contents: read`, and add a `0.0.${{ github.run_number }}` tag to the
   `tags:` list so the SemVer Warehouse can select builds. CI now only builds and
   pushes.
3. **Pipeline** — add `k8s/talos/infra/kargo-projects/<app>.yaml` (copy
   `portfolio.yaml`): Namespace `<app>-cd` (labelled `kargo.akuity.io/project:
   "true"`, distinct from the app namespace), Project, ProjectConfig (auto-promote
   the stage Stage), ExternalSecret (git cred), Warehouse (the app's GHCR image,
   `SemVer` + `strictSemvers` + `interval: 5m0s`), AnalysisTemplate smoke test on
   the stage URL, and `stage`/`prod` Stages whose only step is the shared
   `promote-to-argocd` task. Then add `<app>.yaml` to `kargo-projects/kustomization.yaml`.
4. **Git credential** — the ExternalSecret reuses the same GitHub App: keep the
   three Bitwarden UUIDs and the `conversionStrategy`/`decodingStrategy`/`metadataPolicy`
   fields; only its `namespace` changes to `<app>-cd`.
5. **Authorize sync** — in `k8s/talos/infra/argocd/apps.yaml`, add `<app>` to the
   `templatePatch` list (`range $app := list "portfolio" "<app>"`). That stamps
   `<app>-cd:prod` on `<app>` and `<app>-cd:stage` on `<app>-stage`.

Ship the pipeline once the `images:` block + CI change land. First sync
auto-promotes the newest build to stage and verifies; prod stays manual.

## Conventions & gotchas

- **Stage namespace flips word order:** the `<app>-stage` overlay dir maps to
  namespace `stage-<app>` (e.g. `portfolio-stage` -> `stage-portfolio`). The
  ApplicationSet's `destination.namespace` is the dir basename, but every stage
  manifest declares `namespace: stage-<app>` explicitly, and that explicit value
  wins. Keep the `<app>` / `stage-<app>` pair consistent per app.
- GitHub App cred needs the **Installation ID** (not the App ID). Wrong value = git-push fails with GitHub `404` on the installation-access-token call.
- ESO remoteRefs and the Warehouse must spell out defaulted fields (`conversionStrategy`/`decodingStrategy`/`metadataPolicy`; `strictSemvers`, `interval: 5m0s`) or Argo CD reports perpetual `OutOfSync`.
- Per-app annotations in the `apps` ApplicationSet must use `templatePatch`; inline `{{if}}` in the parsed `template` is invalid YAML.
- Verify ApplicationSet changes: `argocd appset generate --core -n argocd <file>` (swap the git generator for a `list` generator to render offline).
