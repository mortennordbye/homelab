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
      → rewrites the image: line in the app's deployment manifest
      → opens a PR against homelab main
  → you review + merge the PR
  → ArgoCD syncs the new SHA
```

## Moving parts

### 1. The reusable workflow — [`.github/workflows/bump-image.yml`](../.github/workflows/bump-image.yml)

Lives here once; every app repo calls it via `workflow_call`. Inputs:

| Input | Example | Meaning |
| --- | --- | --- |
| `app_dir` | `k8s/talos/apps/headroom` | The app's directory in this repo |
| `image` | `ghcr.io/mortennordbye/headroom` | Image name **without** tag |
| `new_tag` | `sha-2629ed3` | The immutable tag just built |
| `manifest` | `deployment.yaml` (default) | File within `app_dir` holding the `image:` line (e.g. `app.yaml`) |

Secrets: `app-id`, `app-private-key` (the GitHub App below).

It rewrites the `image: <image>:<tag>` line in `app_dir/manifest` with `sed`
(matching `image: <image>:` so only the app's own image line changes), then
opens a PR. The app's own `GITHUB_TOKEN` can't write here, hence the App below.

### 2. The GitHub App — `homelab-deployer` (one-time, shared by all app repos)

The cross-repo write needs credentials the app repo's own `GITHUB_TOKEN` lacks.
A single GitHub App covers every app repo:

- Repository permissions: **Contents: read/write** and **Pull requests: read/write**.
- Install it on the `homelab` repo only (that's the repo the token writes to).
- Store `APP_ID` and the private key as secrets on each app repo:
  `HOMELAB_DEPLOYER_APP_ID`, `HOMELAB_DEPLOYER_PRIVATE_KEY`. (Personal account —
  no org-level secrets, so set them per repo.)

`actions/create-github-app-token@v1` mints a short-lived token scoped to
`homelab` at run time — no long-lived PAT to rotate.

### 3. The pinned image line (per app, in this repo)

The app's deployment manifest pins a real `sha-<commit>` tag (never `:latest`).
This single line is what CI rewrites:

```yaml
        - name: headroom
          image: ghcr.io/mortennordbye/headroom:sha-2629ed3
```

Seed it with a currently-published `sha-<short>` so the app runs before the
first CI-driven bump. No kustomize `images:` override is used — that would win
over the line CI edits.

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

## Onboarding a new app repo

The `homelab-deployer` GitHub App (section 2) is a one-time, shared prerequisite
— it already exists. Per new app repo:

1. **Manifests here.** Add `k8s/talos/apps/<app>/` (the ArgoCD ApplicationSet
   auto-registers any `apps/*` dir as an Application in a namespace named after
   the dir — no `Application` manifest needed). Pin the deployment manifest's
   `image:` to a currently-published `sha-<short>` so it runs before the first
   bump. Do **not** add a kustomize `images:` override — it would win over the
   line CI edits.
2. **Build workflow (app repo).** Publish a `sha-<short>` tag
   (`docker/metadata-action` → `type=sha,prefix=sha-,format=short`) and expose a
   `short_sha` output on the `build` job (see the snippet in part 4 above).
3. **Deploy job (app repo).** Add the `deploy` job above, changing `app_dir` /
   `image` / `new_tag`, plus `manifest` if the image line isn't in
   `deployment.yaml` (e.g. `manifest: app.yaml`).
4. **Secrets (app repo).** Set the App credentials — personal account, so no
   org-level secrets; set them per repo:

   ```bash
   gh secret set HOMELAB_DEPLOYER_APP_ID      --repo mortennordbye/<app> --body "<app-id>"
   gh secret set HOMELAB_DEPLOYER_PRIVATE_KEY --repo mortennordbye/<app> < homelab-deployer.private-key.pem
   ```

That's it — the next push to the app repo's `main` opens a bump PR here.

## In-repo vs external at a glance

| | In-repo (`blog`, `portfolio`) | External (`headroom`, `logeverylift`) |
| --- | --- | --- |
| Source location | this monorepo | separate repo |
| Manifest update | `sed` + commit to `main` | `sed` via reusable workflow |
| Auth | default `GITHUB_TOKEN` | `homelab-deployer` GitHub App |
| Lands via | direct commit to `main` | **PR** (review gate) |
| Image tag | short SHA + env tag | `sha-<short>` (immutable, pinned) |

## Notes

- **ArgoCD auto-sync is on.** The `apps` ApplicationSet
  ([infra/argocd/apps.yaml](../k8s/talos/infra/argocd/apps.yaml)) sets
  `syncPolicy.automated` (prune + selfHeal), so merging a bump PR deploys with
  no manual sync. The same ApplicationSet auto-registers any `apps/*` directory,
  so a new app needs no separate `Application` manifest.
