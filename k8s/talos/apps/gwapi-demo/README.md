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
One route, two `backendRefs` with weights. Shift traffic by editing two numbers — no second
Ingress, no nginx annotations. Committed stable state is 100/0; `demo.sh` patches it live.

### 3. Header-based routing (`httproute-header.yaml`, host `gwapi-header.bigd.no`)
`x-canary: true` requests go to v2; everyone else gets v1. Native header matching — the
"test in prod safely" story. (A header match is more specific than the catch-all, so it wins.)

## Running the demo

`demo.sh` uses `curl --resolve` against the public Traefik IP (`10.3.10.101`), so it needs
**no DNS record** and TLS still validates against the `*.bigd.no` cert.

```bash
./demo.sh show              # workloads + routes + current weights (role-separation visual)
./demo.sh loop              # 50 requests -> tally of v1 vs v2 (starts ~100% v1)
./demo.sh weight 90 10      # canary: 90/10
./demo.sh loop              # ~90/10 split
./demo.sh weight 50 50; ./demo.sh loop
./demo.sh weight 0 100;  ./demo.sh loop   # full cutover to v2
./demo.sh header            # no header -> v1 ; x-canary:true -> v2
./demo.sh reset             # back to 100/0 (or just let ArgoCD selfHeal do it)
```

> **GitOps note:** the weight patches are live edits. ArgoCD `selfHeal` reverts them to the
> committed 100/0 within a couple of minutes — harmless, and a nice "GitOps healed my drift"
> aside. The curl loop shows the shift in seconds, long before reconciliation.

## Optional: resolve by name in a browser
Add A records `gwapi-demo.bigd.no` and `gwapi-header.bigd.no` → `10.3.10.101`
(Cloudflare or local DNS). Not required for the scripted demo.

## Teardown
Delete this folder and push — ArgoCD prunes the `gwapi-demo` Application and namespace.
