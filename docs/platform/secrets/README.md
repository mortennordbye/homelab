# Secrets: Bitwarden to cluster

No secret value is committed to this repo. Git holds references: each app
declares an `ExternalSecret` that names a Bitwarden Secrets Manager item by
UUID, and External Secrets Operator (ESO) turns that into a Kubernetes `Secret`
inside the cluster. The values live in two places only, Bitwarden and the
running cluster.

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
`bitwarden-sdk-server` chart. The Bitwarden provider does its crypto in that
separate service, reached over TLS with a cert-manager-issued cert, which is
what `bitwarden-certificate.yaml` and `cluster_issuer.yaml` are for.

`clustersecretstore-bitwarden.yaml` defines the single store all apps use:

- name `bitwarden-secretsmanager`, scoped to org
  `1a1f473f-c6a3-47af-a106-b29800f5ca1f` and project
  `1ea61322-5f4a-44a4-b4d0-b29b00ba1134` (the `Homelab` project).
- It authenticates with a machine account access token read from the
  `bw-auth-token` Secret in the `external-secrets` namespace. That token is the
  one secret this pattern cannot manage for itself. It is applied by hand once
  (`kubectl create secret generic bw-auth-token -n external-secrets
  --from-literal=token=...`) and never lands in git, so recreating it is part
  of a cluster rebuild.

## Access model: two machine accounts

The `Homelab` account is used by ESO. It has read-only access, and its token
lives in the cluster as `bw-auth-token`. The `claude-code` account is used from
the laptop, with read and write on the Homelab project. Its token lives in the
macOS Keychain under service name `bws-homelab`, never in a dotfile:

```bash
security add-generic-password -s bws-homelab -a claude -w   # prompts, stays out of history
```

Both accounts have project-level grants covering every secret in the project,
so a new secret needs no per-secret grant.

## Creating a secret

Use the Bitwarden Secrets Manager CLI, `bws`, installed at
`/opt/homebrew/bin/bws` from the GitHub release binary (brew's `bitwarden-cli`
is the unrelated Password Manager tool).

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

The printed `id` is the UUID the ExternalSecret references; UUIDs are safe to
commit because they are useless without a token. Never run `bws secret list`
or `bws secret get` unfiltered, since the JSON includes every plaintext value.
Filter down to the harmless fields:

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

The Deployment consumes the resulting Secret the normal way
(`valueFrom.secretKeyRef`). ArgoCD applies both; nothing is done by hand in
the cluster.

## Rotation and refresh

Rotate with `bws secret edit <uuid> --value ...`. The UUID is stable across
edits, so no manifest change is needed. Only deleting and recreating the item
changes the UUID.

App ExternalSecrets sync on a 1 hour `refreshInterval`, so a new value reaches
the cluster Secret within the hour. To hurry it along, run
`kubectl annotate externalsecret <name> -n <ns> force-sync=$(date +%s) --overwrite`.

Pods read the new value on their next restart. Reloader
(`k8s/talos/infra/reloader/`, watching all namespaces) restarts a workload
automatically when it carries `reloader.stakater.com/auto: "true"`, as
gluetun-vpn, logeverylift and reelsmith do. Anything without the annotation
needs a `kubectl rollout restart`.

## Gotchas

- Bitwarden's API answers 404, not 403, when a machine account writes to a
  project it can only read. A `bws secret create` failing with "Resource not
  found" almost always means the project grant is read-only, not that the
  project id is wrong.
- An ExternalSecret stuck in `SecretSyncedError` with no obvious cause usually
  means the ESO machine account cannot see the item. Check that the `Homelab`
  account still has its project-level read grant.
- `bws project list` returning `[]` does not mean the token is broken; secret
  reads can still work. Judge access by `bws secret list` (filtered) instead.

## Local device credentials (not in Bitwarden)

Credentials for LAN devices driven from the laptop, and never from the cluster,
do not belong in Bitwarden: nothing in-cluster consumes them. They live in the
macOS login Keychain, the same way the `bws-homelab` token does, and a
gitignored `*.env` file at the repo root exports them by reference.

The Hue bridge is the worked example. `hue.env` holds the bridge address and
resolves the key at source time:

```bash
export HUE_APPLICATION_KEY="$(security find-generic-password -s hue-bridge -w)"
```

The key is never written to disk, committed, or shown in an agent transcript.
`**/*.env` is gitignored, so a new file must be named `<thing>.env`; the
pattern does not catch `.env.<thing>`.

To recreate the Hue key, press the round link button on top of the bridge and
run this within 30 seconds:

```bash
key=$(curl -sk -X POST https://10.3.10.16/api -H 'Content-Type: application/json' \
    -d '{"devicetype":"homelab#macbook"}' \
    | grep -o '"username":"[^"]*"' | cut -d'"' -f4)
[ -n "$key" ] && security add-generic-password -s hue-bridge -a "$USER" -w "$key" -U
```

Revoke it with `DELETE /api/<key>/config/whitelist/<key>`. Pressing the link
button does not invalidate existing keys, so re-pairing never breaks the Home
Assistant integration's own key.
