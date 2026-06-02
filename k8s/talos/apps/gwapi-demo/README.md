# gwapi-demo — Gateway API live demo

A throwaway app for demonstrating Kubernetes **Gateway API** on the Genesis cluster.
Two versions of `traefik/whoami` (`v1`, `v2`) that print which version served each
request. GitOps-managed: the ArgoCD ApplicationSet auto-discovers this folder and syncs it.

## The three things this demonstrates

### 1. Role separation (the headline pitch vs Ingress)
Gateway API splits one monolithic Ingress object into three resources owned by three
personas:

| Resource       | Who owns it      | Where it lives              |
| -------------- | ---------------- | --------------------------- |
| `GatewayClass` | infra / Traefik  | cluster-scoped (Helm)       |
| `Gateway`      | platform team    | `traefik` ns (listeners + `*.bigd.no` TLS) |
| `HTTPRoute`    | app developers   | `gwapi-demo` ns (this app)  |

This app ships **only** workloads + HTTPRoutes. It attaches to the shared
`traefik-gateway-public` via `parentRefs` and inherits its wildcard TLS — it never touches
the Gateway or GatewayClass. A new app onboards with zero infra change. That cross-namespace
attach is governed by the Gateway's `allowedRoutes.namespaces.from: All`, not by annotations.

### 2. Weighted canary (`httproute-weighted.yaml`, host `gwapi-demo.bigd.no`)
One route, two `backendRefs` with weights (committed 90/10). Shift traffic by editing two
numbers in the manifest and pushing — ArgoCD applies it and selfHeal keeps it there. No
second Ingress, no nginx annotations, no imperative `kubectl patch`. `demo.sh loop` only
*observes* the split.

> Why GitOps, not live patches: ArgoCD `selfHeal` reverts any manual `kubectl patch` to the
> committed weights in ~1 second, so the canary is driven through git on purpose.

### 3. Header-based routing (`httproute-header.yaml`, host `gwapi-header.bigd.no`)
`x-canary: true` requests go to v2; everyone else gets v1. Native header matching — the
"test in prod safely" story. (A header match is more specific than the catch-all, so it wins.)

## Running the demo

`demo.sh` uses `curl --resolve` against the public Traefik IP (`10.3.10.101`), so it needs
**no DNS record** and TLS still validates against the `*.bigd.no` cert.

```bash
./demo.sh show              # workloads + the shared Gateway + weights (role-separation)
./demo.sh manifest weighted # show the route YAML (where the weights live)
./demo.sh loop              # 50 requests -> coloured v1/v2 split bar (~90/10 as committed)
./demo.sh loop 200          # more samples -> split converges on the weights
./demo.sh manifest header   # show the two-rule header route
./demo.sh header            # no header -> v1 ; x-canary:true -> v2
```

### Shifting the canary (GitOps)
Edit the two `weight` values in `httproute-weighted.yaml`, then push:

```bash
# e.g. 90/10 -> 50/50 -> 0/100
$EDITOR httproute-weighted.yaml
git add httproute-weighted.yaml && git commit -m "canary: 50/50" && git push
# optional: force ArgoCD to apply immediately instead of waiting for the poll
kubectl -n argocd annotate application gwapi-demo argocd.argoproj.io/refresh=hard --overwrite
./demo.sh loop              # watch the split move
```

ArgoCD then *maintains* that split (selfHeal). This is the honest GitOps canary — the
desired state lives in git, not in a one-off command.

## Optional: resolve by name in a browser
Add A records `gwapi-demo.bigd.no` and `gwapi-header.bigd.no` → `10.3.10.101`
(Cloudflare or local DNS). Not required for the scripted demo.

## Teardown
Delete this folder and push — ArgoCD prunes the `gwapi-demo` Application and namespace.
