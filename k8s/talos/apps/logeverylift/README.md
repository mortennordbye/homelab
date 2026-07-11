# logeverylift

Mobile-first workout-tracking PWA (Next.js standalone + PostgreSQL). Runs behind
the **private** Traefik gateway with its own Postgres and Bitwarden-sourced
secrets.

- **Source / image build:** [`mortennordbye/logeverylift`](https://github.com/mortennordbye/logeverylift)
- **Image:** `ghcr.io/mortennordbye/logeverylift`, pinned to an immutable `sha-<commit>` tag
- **Namespace:** `logeverylift`
- **URL:** `https://logeverylift.local.bigd.no` (private gateway)

> **New app, migrating off `workout`.** This is a fresh deployment; the old
> `workout` app (public `logeverylift.com`) stays untouched until cutover. During
> the transition both share the same Bitwarden secret items (see
> `externalsecret.yaml`) — give logeverylift its own items if you want them
> isolated.

## Deployment flow

Source lives in a separate repo, so it uses the cross-repo
[external-app deploy pattern](../../../../docs/gitops-external-app-deploys.md):

1. Push to `main` in the logeverylift repo builds and pushes `ghcr.io/mortennordbye/logeverylift:sha-<short>`.
2. Its CI calls this repo's reusable [`bump-image.yml`](../../../../.github/workflows/bump-image.yml)
   with `manifest: app.yaml`, which rewrites the `image:` line in [`app.yaml`](app.yaml) and **opens a PR** here.
3. Merging the PR updates the pinned tag; ArgoCD auto-syncs it.

## Manifests

| File | Resource | Notes |
| --- | --- | --- |
| [`namespace.yaml`](namespace.yaml) | Namespace | `logeverylift`, privileged PodSecurity |
| [`externalsecret.yaml`](externalsecret.yaml) | ExternalSecret | Pulls app + DB secrets from Bitwarden (`logeverylift-secret`) |
| [`postgres.yaml`](postgres.yaml) | PVC + Deployment + Service | `postgres:16-alpine`, DB `logeverylift_db`, `1Gi` NFS |
| [`app.yaml`](app.yaml) | Deployment + Service | Next.js app, port `3000`, `/api/health` probes — **CI bumps the image here** |
| [`httproute.yaml`](httproute.yaml) | HTTPRoute | Binds `logeverylift.local.bigd.no` to `traefik-gateway-private` |
| [`ciliumnetworkpolicy.yaml`](ciliumnetworkpolicy.yaml) | CiliumNetworkPolicy | App ingress from Traefik; Postgres ingress only from the app |
| [`kustomization.yaml`](kustomization.yaml) | Kustomization | Bundles the resources above |

## Operational notes

- **Secrets.** `logeverylift-secret` is materialized by External Secrets from
  Bitwarden Secrets Manager (`ClusterSecretStore/bitwarden-secretsmanager`).
  Reloader restarts the app when the secret changes.
- **Database.** Self-contained `postgres` Deployment with a `1Gi` NFS PVC;
  `DATABASE_URL` points at `postgres.logeverylift.svc.cluster.local`.
- **Auth URL.** `BETTER_AUTH_URL` is set to the private hostname; update it (and
  the HTTPRoute) when cutting over to the public domain.
