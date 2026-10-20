# CI workflows

GitHub Actions in [`.github/workflows/`](../../../.github/workflows/) build images, gate
pull requests and publish the README cards and the docs site. None of them touch the
cluster or run `terraform plan`: images reach the cluster through Kargo
([`kargo.md`](kargo.md)) and manifests through Argo CD ([`argocd.md`](argocd.md)).

## Workflows

| Workflow | Trigger | Does | Writes |
|---|---|---|---|
| [`build-portfolio.yaml`](../../../.github/workflows/build-portfolio.yaml) | PR and push to `main` under `portfolio/`, manual | lint and typecheck, then Docker build of `portfolio/` with the live `deployment.yaml` copied in; on PRs the image is smoke tested instead of pushed | on `main`: `ghcr.io/mortennordbye/homelab/portfolio:<short-sha>` and `:0.0.<run>` |
| [`build-blog.yaml`](../../../.github/workflows/build-blog.yaml) | PR and push to `main` under `blog/`, manual | markdownlint, then Docker build of `blog/` with the theme submodule (the render check on PRs) | on `main`: `ghcr.io/mortennordbye/homelab/blog:<short-sha>` and `:0.0.<run>` |
| [`ci-terraform.yaml`](../../../.github/workflows/ci-terraform.yaml) | PR and push under `terraform/` | `terraform fmt -check`, then `init -backend=false` and `validate` in every root it finds | nothing |
| [`container-vulnerability-scan.yaml`](../../../.github/workflows/container-vulnerability-scan.yaml) | push to `main` changing the portfolio or blog prod `kustomization.yaml`, Sundays 00:00 UTC, manual | pulls the image tag prod runs from GHCR and scans it with Trivy (CRITICAL and HIGH, fixed only) | SARIF to the Security tab |
| [`dependency-review.yml`](../../../.github/workflows/dependency-review.yml) | every PR | fails on a new dependency with a high severity advisory | nothing |
| [`scorecard.yml`](../../../.github/workflows/scorecard.yml) | Mondays 03:00 UTC, manual | OpenSSF Scorecard | SARIF to the Security tab, published Scorecard result |
| [`docs.yaml`](../../../.github/workflows/docs.yaml) | PR and push under `docs/`, `properdocs.yml`, `overrides/`, `scripts/docs_site_hooks.py`, manual | `properdocs build --strict` | GitHub Pages (`docs.nordbye.it`), not on PRs |
| [`render-assets.yaml`](../../../.github/workflows/render-assets.yaml) | push to `main` changing `docs/assets/diagrams/*.d2` or `docs/assets/logo/source.jpg`, manual | renders each D2 file to SVG, then PNG, and crops the logo photo to a 512 px round PNG | commit to `main` |
| [`kargo-automerge.yaml`](../../../.github/workflows/kargo-automerge.yaml) | PR opened, labelled or reopened on a `kargo/promotion/*` branch | squash-merges the PR if its `app/<name>` label is in `KARGO_AUTOMERGE_APPS` | merge into `main` |
| [`indexnow.yaml`](../../../.github/workflows/indexnow.yaml) | push to `main` changing the portfolio or blog prod `kustomization.yaml`, manual | waits for the key file to be live, then submits the sitemap URLs to IndexNow | nothing in the repo |
| [`lighthouse.yaml`](../../../.github/workflows/lighthouse.yaml) | Mondays 06:00 UTC, manual | Lighthouse CI, 3 runs each on `nordbye.it` and `blog.nordbye.it` | `lighthouse.json` to the `lighthouse-data` branch, reports to Lighthouse temporary public storage |
| [`readme-cards.yaml`](../../../.github/workflows/readme-cards.yaml) | every 15 minutes, manual | two jobs: reads `https://nordbye.it/api/v1/infra` and renders the cluster card with `scripts/render-status-card.mjs`; reads stargazer timestamps over GraphQL and renders the chart with `scripts/render-star-history.mjs` | `status-data` and `stars-data` branches |
| [`sync-certs.yaml`](../../../.github/workflows/sync-certs.yaml) | daily 05:17 UTC, manual | rebuilds `portfolio/src/content/certs.json` from Credly and the Microsoft Learn transcript | a PR from `bot/sync-certs` when the list changed; opened with `GITHUB_TOKEN`, so it does not trigger the portfolio CI |
| [`reminders.yml`](../../../.github/workflows/reminders.yml) | 16:00 UTC on the 1st, 8th and 15th, manual | posts the Kubernetes, backup or server upkeep reminder to Discord | nothing in the repo |

## What writes to the repo

[![Morten, Renovate and the sync-certs workflow open PRs that pass the PR checks into main, Kargo's prod promotion PRs are merged by kargo-automerge, and a push to main starts Argo CD syncing, render-assets committing SVGs back, the docs site build, and the portfolio and blog image builds that feed Kargo](../../assets/diagrams/delivery-ci.svg)](../../assets/diagrams/delivery-ci.svg)

Two workflows change `main`. `render-assets` commits as `GitHub Actions` straight
to `main` and only when the output changed.
`kargo-automerge` merges Kargo's promotion PRs. `sync-certs` and Renovate open PRs
but never merge them. `lighthouse` and the two
`readme-cards` jobs force-push a single commit to their own data branch
(`keep_history: false`). This repo's README embeds the star history and status cards
from `stars-data` and `status-data` over `raw.githubusercontent.com`; `lighthouse.json`
feeds the Lighthouse card on the GitHub profile README.

The build workflows only push images. The tag in the manifests is written by Kargo,
and the `0.0.<run>` tag is what its Warehouses select.

## Conventions

Every action is pinned to a commit SHA with the version in a comment. Workflows default
to `permissions: contents: read` (`kargo-automerge` and `reminders` to none) and widen per
job. Most jobs that push, publish or call external services check
`github.repository_owner == 'mortennordbye'` so forks skip them; `lighthouse`,
the `readme-cards` stars job and the docs deploy do not, and `kargo-automerge` instead requires the PR
branch to come from this repo.

Pushes to `main` from the build workflows, renders, docs, IndexNow and automerge queue and
never cancel a run in progress, so nothing is killed between building and pushing. PR runs,
scans and the data-branch jobs cancel the superseded run.

`ci-terraform` holds no credentials: `init` runs with `-backend=false`, so it never
reads state. Plans and applies stay local.

## Secrets

| Secret or variable | Used by |
|---|---|
| `GITHUB_TOKEN` | GHCR push and scan pulls, data branches, Pages, automerge, star history |
| `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` | build workflows, Docker Hub login before the build |
| `BW_ACCESS_TOKEN` | `reminders.yml`, reads the Discord webhook from Bitwarden |
| `KARGO_AUTOMERGE_APPS` (variable) | `kargo-automerge.yaml`, comma separated app names |

The IndexNow keys in `indexnow.yaml` are public by design: the endpoint verifies a
submission by fetching the same key from the site.
