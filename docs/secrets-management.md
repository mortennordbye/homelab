# Secrets: Bitwarden to cluster

No secret value is ever committed to this repo. What git holds is *references*:
each app declares an `ExternalSecret` that names a Bitwarden Secrets Manager
item by UUID, and External Secrets Operator (ESO) turns that into a real
Kubernetes `Secret` inside the cluster. The values live in exactly two places —
Bitwarden, and the running cluster.

```
Bitwarden Secrets Manager            git (this repo)
  org  morten-nordbye-lab              k8s/talos/apps/<app>/externalsecret.yaml
  project Homelab                        remoteRef.key: <secret UUID>
        │                                        │
        │ machine account token                  │ ArgoCD applies
        ▼                                        ▼
  ClusterSecretStore ─────────────────▶  ExternalSecret ──▶ Secret ──▶ pod env
  bitwarden-secretsmanager               (refreshed hourly)
```

## The in-cluster half

`k8s/talos/infra/external-secrets-operator/` deploys ESO plus the
`bitwarden-sdk-server` sidecar chart (the Bitwarden provider does its crypto in
a separate service, reached over TLS with a cert-manager-issued cert — that is
what `bitwarden-certificate.yaml` and `cluster_issuer.yaml` are for).

`clustersecretstore-bitwarden.yaml` defines the single store all apps use:

- name `bitwarden-secretsmanager`, scoped to org
  `1a1f473f-c6a3-47af-a106-b29800f5ca1f`, project
  `1ea61322-5f4a-44a4-b4d0-b29b00ba1134` (the `Homelab` project).
- It authenticates with a machine account access token read from the
  `bw-auth-token` Secret in the `external-secrets` namespace. That token is the
  one secret this pattern cannot manage for itself: it is applied by hand once
  (`kubectl create secret generic bw-auth-token -n external-secrets
  --from-literal=token=...`) and never lands in git. If the cluster is ever
  rebuilt, recreating it is part of bootstrap.

Every app-side `ExternalSecret` points at this store and syncs on a 1 hour
`refreshInterval`. Rotating a value in Bitwarden therefore reaches the cluster
within the hour; delete the ExternalSecret's target Secret (or annotate the
ExternalSecret with `force-sync`) to hurry it along. Pods only pick up the new
value on restart when the secret is consumed as env vars.

## Access model: two machine accounts

Two machine accounts exist in the org, with deliberately different blast radii:

- `Homelab` — the ESO account. Read-only, token lives in the cluster
  (`bw-auth-token`). It only ever needs to read.
- `claude-code` — the operator/agent account used from the laptop. Read+write
  on the Homelab project. Its token lives in the macOS Keychain under service
  name `bws-homelab`, never in a dotfile:

  ```bash
  security add-generic-password -s bws-homelab -a claude -w   # prompts, stays out of history
  ```

A project-level grant covers every secret in the project, including ones
created before the grant existed (verified 2026-09-01: `claude-code` reads all
pre-existing secrets with zero per-secret grants). The per-secret grant ritual
this repo used historically — opening each new secret's Machine accounts tab
and adding `Homelab` = Can read — was only ever necessary because the ESO
account had no project-level grant. Give it project-level Can read once and
the ritual is gone.

## Creating a secret

Use the Bitwarden Secrets Manager CLI, `bws` (installed at
`/opt/homebrew/bin/bws` from the official GitHub release binary; there is no
Homebrew formula, and brew's `bitwarden-cli` is the unrelated Password Manager
tool).

```bash
export BWS_ACCESS_TOKEN=$(security find-generic-password -s bws-homelab -w)

bws secret create trek-encryption-key "$(openssl rand -hex 32)" \
  1ea61322-5f4a-44a4-b4d0-b29b00ba1134 \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['id'])"
```

Conventions, matching the existing items:

- Names are lowercase kebab-case describing the consumer
  (`authentik-secret-key`, `trek-encryption-key`). The Bitwarden name is
  independent of the k8s `secretKey`, which is usually SCREAMING_SNAKE_CASE.
- Notes stay empty.
- Generate values in a subshell as above so they never touch the terminal
  scrollback, shell history, or a chat transcript.

The printed `id` is the UUID the ExternalSecret references. UUIDs are safe to
commit — this repo is public and full of them — because they are useless
without a token.

**Never run `bws secret list` or `bws secret get` unfiltered.** The JSON
includes every plaintext value. Always pipe through a filter that keeps only
the harmless fields:

```bash
bws secret list | python3 -c "
import json,sys
for s in json.load(sys.stdin): print(s['id'], s['key'])"
```

## Wiring it into an app

The app directory gets an `ExternalSecret` (copy `k8s/talos/apps/trek/externalsecret.yaml`):

```yaml
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata:
  name: trek-secret
  namespace: trek
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: bitwarden-secretsmanager
    kind: ClusterSecretStore
  target:
    name: trek-secret
    creationPolicy: Owner
  data:
    - secretKey: ENCRYPTION_KEY
      remoteRef:
        key: "9c266643-4f45-4aca-8586-b4b8006e6d3b"   # the bws-returned UUID
```

and the Deployment consumes the resulting Secret the normal way
(`valueFrom.secretKeyRef`). ArgoCD applies both; nothing is done by hand in
the cluster.

## Gotchas

- Bitwarden's API answers **404, not 403**, when a machine account writes to a
  project it can only read. A `bws secret create` failing with "Resource not
  found" almost always means the project grant is read-only, not that the
  project id is wrong.
- An ExternalSecret stuck in `SecretSyncedError` with no obvious cause usually
  means the ESO machine account cannot see that one item — the legacy
  per-secret grant problem above.
- `bws project list` returning `[]` does not mean the token is broken; secret
  reads can still work. Judge access by `bws secret list` (filtered) instead.
- Rotation is `bws secret edit <uuid> --value ...`. The UUID is stable across
  edits, so no manifest change is needed — only deletion and recreation changes
  the UUID.
