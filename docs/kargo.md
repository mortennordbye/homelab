# Kargo — portfolio promotion

Kargo promotes the portfolio app through `stage` then `prod` on top of Argo CD.
CI only builds and pushes the image; Kargo owns the git write and the promotion.
Full design and rollout runbook: [`docs/kargo-pilot-plan.md`](kargo-pilot-plan.md).

## Flow

```
CI build --> GHCR image --> Warehouse --> Freight
                                            |
                              auto + verify v
                                          stage  --(manual)-->  prod
                                            |                     |
                                    argocd-update           argocd-update
                                            |                     |
                                       Argo CD sync          Argo CD sync
```

Each Stage: `git-clone -> kustomize-set-image -> git-commit -> git-push -> argocd-update`.
`argocd-update` blocks until the Argo CD app is Synced + Healthy at the promoted commit.

## Critical facts

| Item | Value |
| --- | --- |
| Project / namespace | `portfolio-cd` |
| Watched image | `ghcr.io/mortennordbye/homelab/portfolio` (`NewestBuild`, `allowTags: ^[0-9a-f]{7,40}$`) |
| `stage` | auto-promote; verified by HTTP smoke test on `portfolio-stage.local.bigd.no` |
| `prod` | manual; only accepts Freight verified in `stage` |
| Git write | GitHub App `mortennordbye-homelab-deployer` (cred via ESO) |
| Sync trigger | `argocd-update` (needs `kargo.akuity.io/authorized-stage` on the app) |
| UI | `https://kargo.local.bigd.no` (admin account) |
| Version | Kargo `1.10.9`, Argo Rollouts `2.41.0` (verification CRDs) |

## Files

| Path | Purpose |
| --- | --- |
| `k8s/talos/infra/kargo/` | Kargo install (Helm OCI) + UI route |
| `k8s/talos/infra/argo-rollouts/` | AnalysisTemplate/AnalysisRun CRDs for verification |
| `k8s/talos/infra/kargo-portfolio/` | Project, Warehouse, Stages, verification, git cred |
| `k8s/talos/infra/argocd/apps.yaml` | `authorized-stage` annotation via `goTemplate` + `templatePatch` |

## Operate

- **Promote to prod:** Kargo UI -> `prod` stage -> *Promote from upstream*.
- **Trigger a build:** push under `portfolio/**`, or `gh workflow run build-portfolio.yaml --ref main -f environment=stage`.
- **Inspect:** `kubectl -n portfolio-cd get warehouse,stage,freight,promotion`.

## Gotchas

- GitHub App cred needs the **Installation ID** (not the App ID). Wrong value = git-push fails with GitHub `404` on the installation-access-token call.
- ESO remoteRefs and the Warehouse must spell out defaulted fields (`conversionStrategy`/`decodingStrategy`/`metadataPolicy`; `strictSemvers`, `interval: 5m0s`) or Argo CD reports perpetual `OutOfSync`.
- Per-app annotations in the `apps` ApplicationSet must use `templatePatch`; inline `{{if}}` in the parsed `template` is invalid YAML.
- Verify ApplicationSet changes: `argocd appset generate --core -n argocd <file>` (swap the git generator for a `list` generator to render offline).
