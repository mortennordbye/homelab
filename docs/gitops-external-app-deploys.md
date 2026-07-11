# GitOps deploys for external app repos

How apps whose **source lives in a separate repo** (e.g.
[`headroom`](https://github.com/mortennordbye/headroom),
[`logeverylift`](https://github.com/mortennordbye/logeverylift)) get deployed
into this cluster while Git stays the source of truth.

## Why this exists

`blog` and `portfolio` live in this monorepo, so their workflows can `sed` the
deployment image and commit straight to `main` with the default `GITHUB_TOKEN`.
An **external** repo can't do that — its `GITHUB_TOKEN` has no write access here,
and pinning to a mutable `:latest` tag would leave ArgoCD unable to tell one
revision from another. This pattern fixes both:

- **Immutable tags.** Deployments pin to `sha-<commit>`, never `:latest`, so the
  running revision is always identifiable and reproducible from Git.
- **Cross-repo write-back.** The app's CI opens a PR here bumping the tag; the
  registry-built SHA is written back into Git for ArgoCD to sync.

> Not used: ArgoCD Image Updater. SHA tags have no natural ordering, so a
> registry-watcher can't reliably pick "newest". CI knows the exact SHA it just
> built, so write-back is deterministic.

## The flow

```
push to main (app repo)
  → build + push ghcr.io/<owner>/<app>:sha-<short>
  → CI calls homelab .github/workflows/bump-image.yml (reusable, workflow_call)
      → mints a GitHub App token scoped to homelab
      → kustomize edit set image …:sha-<short>
      → opens a PR against homelab main
  → you review + merge the PR
  → ArgoCD syncs the new SHA
```

## Moving parts

### 1. The reusable workflow — [`.github/workflows/bump-image.yml`](../.github/workflows/bump-image.yml)

Lives here once; every app repo calls it via `workflow_call`. Inputs:

| Input | Example | Meaning |
| --- | --- | --- |
| `app_dir` | `k8s/talos/apps/headroom` | The app's kustomize directory in this repo |
| `image` | `ghcr.io/mortennordbye/headroom` | Image name **without** tag |
| `new_tag` | `sha-2629ed3` | The immutable tag just built |

Secrets: `app-id`, `app-private-key` (the GitHub App below).

### 2. The GitHub App — `homelab-deployer` (one-time, shared by all app repos)

The cross-repo write needs credentials the app repo's own `GITHUB_TOKEN` lacks.
A single GitHub App covers every app repo:

- Repository permissions: **Contents: read/write** and **Pull requests: read/write**.
- Install it on the `homelab` repo.
- Store `APP_ID` and the private key as secrets in each app repo — or as
  **org-level secrets** so all repos inherit them:
  `HOMELAB_DEPLOYER_APP_ID`, `HOMELAB_DEPLOYER_PRIVATE_KEY`.

`actions/create-github-app-token@v1` mints a short-lived token scoped to
`homelab` at run time — no long-lived PAT to rotate.

### 3. The kustomize override (per app, in this repo)

Each app's `kustomization.yaml` carries an `images:` entry; its `newTag` is the
single line CI rewrites:

```yaml
images:
  - name: ghcr.io/mortennordbye/headroom
    newTag: sha-2629ed3
```

The app's `deployment.yaml` also pins a real `sha-<commit>` tag (not `:latest`)
as the base; the override is what actually deploys.

### 4. The caller job (per app, in the app repo)

Added to the app repo's build workflow, gated to `main` pushes:

```yaml
  deploy:
    needs: build
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    uses: mortennordbye/homelab/.github/workflows/bump-image.yml@main
    with:
      app_dir: k8s/talos/apps/<app>
      image: ghcr.io/mortennordbye/<app>
      new_tag: sha-${{ needs.build.outputs.short_sha }}
    secrets:
      app-id: ${{ secrets.HOMELAB_DEPLOYER_APP_ID }}
      app-private-key: ${{ secrets.HOMELAB_DEPLOYER_PRIVATE_KEY }}
```

The `build` job exposes the exact short SHA it pushed:

```yaml
    outputs:
      short_sha: ${{ steps.vars.outputs.short_sha }}
    steps:
      - id: vars
        run: echo "short_sha=${GITHUB_SHA::7}" >> "$GITHUB_OUTPUT"
```

The 7-char short SHA matches `docker/metadata-action`'s
`type=sha,prefix=sha-,format=short`, so the pushed tag and the bumped tag agree.

## Onboarding a new app

1. Add the app's manifests under `k8s/talos/apps/<app>/` with an `images:` block
   in its `kustomization.yaml`, seeded to a currently-published `sha-<short>`.
2. Ensure the app's build workflow publishes a `sha-<short>` tag
   (`type=sha,prefix=sha-,format=short`) and exposes a `short_sha` output.
3. Add the `deploy` job above, changing only `app_dir` / `image` / `new_tag`.
4. Make sure the app repo has the `HOMELAB_DEPLOYER_*` secrets (or org-level).

## In-repo vs external at a glance

| | In-repo (`blog`, `portfolio`) | External (`headroom`, `logeverylift`) |
| --- | --- | --- |
| Source location | this monorepo | separate repo |
| Manifest update | `sed` + commit to `main` | `kustomize edit` via reusable workflow |
| Auth | default `GITHUB_TOKEN` | `homelab-deployer` GitHub App |
| Lands via | direct commit to `main` | **PR** (review gate) |
| Image tag | short SHA + env tag | `sha-<short>` (immutable, pinned) |

## Assumptions

- **ArgoCD auto-sync.** "Merge → deploys automatically" holds only if the app's
  ArgoCD `Application` has `syncPolicy.automated`. Without it, merging the PR
  still updates Git correctly — you click **Sync** in ArgoCD.
