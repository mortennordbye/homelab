# CI workflows

GitHub Actions in [`.github/workflows/`](../../../.github/workflows/) build images, gate
pull requests and publish the README cards and the docs site. None of them touch the
cluster or run `terraform plan`: images reach the cluster through Kargo
([`kargo.md`](kargo.md)) and manifests through Argo CD ([`argocd.md`](argocd.md)).

## Workflows

| Workflow | Trigger | Does | Writes |
|---|---|---|---|
| [`build-portfolio.yaml`](../../../.github/workflows/build-portfolio.yaml) | push to `main` under `portfolio/`, manual | lint and typecheck, then Docker build of `portfolio/` with the live `deployment.yaml` copied in | `ghcr.io/mortennordbye/homelab/portfolio:<short-sha>` and `:0.0.<run>` |
| [`build-blog.yaml`](../../../.github/workflows/build-blog.yaml) | push to `main` under `blog/`, manual | markdownlint, then Docker build of `blog/` with the theme submodule | `ghcr.io/mortennordbye/homelab/blog:<short-sha>` and `:0.0.<run>` |
| [`ci-portfolio.yaml`](../../../.github/workflows/ci-portfolio.yaml) | PR under `portfolio/` | lint, typecheck, `npm run build` | nothing |
| [`ci-blog.yaml`](../../../.github/workflows/ci-blog.yaml) | PR under `blog/` | markdownlint, Docker build as a render check | nothing |
| [`ci-terraform.yaml`](../../../.github/workflows/ci-terraform.yaml) | PR and push under `terraform/` | `terraform fmt -check`, then `init -backend=false` and `validate` in every root it finds | nothing |
| [`container-vulnerability-scan.yaml`](../../../.github/workflows/container-vulnerability-scan.yaml) | PR and push changing either Dockerfile, Sundays 00:00 UTC, manual | builds both images and scans them with Trivy (CRITICAL and HIGH, fixed only) | SARIF to the Security tab |
| [`dependency-review.yml`](../../../.github/workflows/dependency-review.yml) | every PR | fails on a new dependency with a high severity advisory | nothing |
| [`scorecard.yml`](../../../.github/workflows/scorecard.yml) | push to `main`, Mondays 03:00 UTC, manual | OpenSSF Scorecard | SARIF to the Security tab, published Scorecard result |
| [`docs.yaml`](../../../.github/workflows/docs.yaml) | PR and push under `docs/`, `properdocs.yml`, `overrides/`, `scripts/docs_site_hooks.py`, manual | `properdocs build --strict` | GitHub Pages (`docs.nordbye.it`), not on PRs |
| [`render-diagram.yaml`](../../../.github/workflows/render-diagram.yaml) | push to `main` changing `docs/assets/diagrams/*.d2`, manual | renders each D2 file to SVG, then PNG | commit to `main` |
| [`render-logo.yaml`](../../../.github/workflows/render-logo.yaml) | push to `main` changing `docs/assets/logo/source.jpg`, manual | crops the photo to a 512 px round PNG | commit to `main` |
| [`kargo-automerge.yaml`](../../../.github/workflows/kargo-automerge.yaml) | PR opened, labelled or reopened on a `kargo/promotion/*` branch | squash-merges the PR if its `app/<name>` label is in `KARGO_AUTOMERGE_APPS` | merge into `main` |
| [`indexnow.yaml`](../../../.github/workflows/indexnow.yaml) | push to `main` changing the portfolio or blog prod `kustomization.yaml`, manual | waits for the key file to be live, then submits the sitemap URLs to IndexNow | nothing in the repo |
| [`lighthouse.yaml`](../../../.github/workflows/lighthouse.yaml) | Mondays 06:00 UTC, manual | Lighthouse CI, 3 runs each on `nordbye.it` and `blog.nordbye.it` | `lighthouse.json` to the `lighthouse-data` branch, reports to Lighthouse temporary public storage |
| [`star-history.yaml`](../../../.github/workflows/star-history.yaml) | every 6 hours at :40, manual | reads stargazer timestamps over GraphQL and renders the chart with `scripts/render-star-history.mjs` | `stars-data` branch |
| [`status-card.yaml`](../../../.github/workflows/status-card.yaml) | every 15 minutes, manual | reads `https://nordbye.it/api/v1/infra` and renders the cluster card with `scripts/render-status-card.mjs` | `status-data` branch |
| [`reminders.yml`](../../../.github/workflows/reminders.yml) | 16:00 UTC on the 1st, 8th and 15th, manual | posts the Kubernetes, backup or server upkeep reminder to Discord | nothing in the repo |

## What writes to the repo

Three workflows change `main`. `render-diagram` and `render-logo` commit as
`GitHub Actions` straight to `main` and only when the output changed.
`kargo-automerge` merges Kargo's promotion PRs. `lighthouse`, `star-history` and
`status-card` force-push a single commit to their own data branch
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
`star-history` and the docs deploy do not, and `kargo-automerge` instead requires the PR
branch to come from this repo.

Builds, renders, docs, IndexNow and automerge queue and never cancel a run in progress,
so nothing is killed between building and pushing. PR checks, scans and the data-branch
jobs cancel the superseded run.

`ci-terraform` holds no credentials: `init` runs with `-backend=false`, so it never
reads state. Plans and applies stay local.

## Secrets

| Secret or variable | Used by |
|---|---|
| `GITHUB_TOKEN` | GHCR push, data branches, Pages, automerge, star history |
| `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` | build workflows, Docker Hub login before the build |
| `BW_ACCESS_TOKEN` | `reminders.yml`, reads the Discord webhook from Bitwarden |
| `KARGO_AUTOMERGE_APPS` (variable) | `kargo-automerge.yaml`, comma separated app names |

The IndexNow keys in `indexnow.yaml` are public by design: the endpoint verifies a
submission by fetching the same key from the site.
