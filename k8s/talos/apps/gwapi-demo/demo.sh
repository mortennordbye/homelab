#!/usr/bin/env bash
# Gateway API live demo driver.
#
# Uses `curl --resolve` against the public Traefik LB IP, so it works on-LAN with
# NO DNS record needed. TLS still validates: SNI/Host = the demo hostname, which the
# *.bigd.no wildcard cert covers.
#
# Usage:
#   ./demo.sh show              # list workloads + routes (role-separation visual)
#   ./demo.sh manifest [what]   # print the YAML: weighted | header | deploy | all
#   ./demo.sh loop [N]          # N requests to the weighted route, tally v1 vs v2 (default 50)
#   ./demo.sh weight <v1> <v2>  # live-patch the canary weights, e.g. ./demo.sh weight 50 50
#   ./demo.sh header            # show header-based routing (x-canary: true -> v2)
#   ./demo.sh reset             # restore committed 100/0 split
set -euo pipefail

LB_IP="10.3.10.101"          # traefik-public LoadBalancer IP
WEIGHTED_HOST="gwapi-demo.bigd.no"
HEADER_HOST="gwapi-header.bigd.no"
NS="gwapi-demo"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KUBECONFIG_PATH="$(cd "$DIR/../../../.." && pwd)/terraform/proxmox/hyper-cluster/k8s/talos/kubeconfig"
export KUBECONFIG="${KUBECONFIG:-$KUBECONFIG_PATH}"

# explain() prints a talking-point block under the command output.
explain() {
  echo
  echo "────────────────────────────────────────────────────────────────────"
  while IFS= read -r line; do echo "  ${line# }"; done <<<"$1"
  echo "────────────────────────────────────────────────────────────────────"
}

req() {  # req <host> [curl args...]
  local host="$1"; shift
  curl -sS --resolve "${host}:443:${LB_IP}" "$@" "https://${host}/"
}

case "${1:-}" in
  show)
    kubectl -n "$NS" get deploy,svc,httproute
    echo
    echo "Current canary weights:"
    kubectl -n "$NS" get httproute whoami-weighted \
      -o jsonpath='{range .spec.rules[0].backendRefs[*]}{.name}={.weight}{"\n"}{end}'
    explain "ROLE SEPARATION — the headline pitch vs Ingress.
This namespace holds ONLY Deployments, Services and HTTPRoutes. There is no
Gateway here. The routes attach to 'traefik-gateway-public' (owned by the
platform team, living in the 'traefik' namespace) via parentRefs, and inherit
its *.bigd.no TLS cert. Onboarding an app = adding routes, never touching the
shared Gateway or GatewayClass. That is the GatewayClass -> Gateway -> HTTPRoute
split: three resources, three owners, three RBAC scopes."
    ;;

  manifest)
    what="${2:-all}"
    show_file() { echo; echo "===== $1 ====="; cat "$DIR/$1"; }
    case "$what" in
      weighted) show_file httproute-weighted.yaml ;;
      header)   show_file httproute-header.yaml ;;
      deploy)   show_file deployment-v1.yaml; show_file service-v1.yaml ;;
      all)      show_file httproute-weighted.yaml; show_file httproute-header.yaml ;;
      *) echo "usage: manifest [weighted|header|deploy|all]"; exit 1 ;;
    esac
    explain "Typed, declarative routing. No controller-specific annotations — the
hostname, the match rules and the weighted backends are all first-class fields
the API server validates and defaults. That is why ArgoCD can diff a route
meaningfully (and why Ingress annotation soup can't be diffed like this)."
    ;;

  loop)
    n="${2:-50}"
    echo "Sending $n requests to https://${WEIGHTED_HOST}/ ..."
    for _ in $(seq 1 "$n"); do req "$WEIGHTED_HOST" | grep '^Name:'; done | sort | uniq -c
    explain "WEIGHTED CANARY. One hostname, one HTTPRoute, two Services behind it.
Traffic is split by the per-backend 'weight' field — Traefik does weighted
round-robin across the v1 and v2 Services. The tally above reflects the CURRENT
weights. No second Ingress, no nginx canary annotations: shifting traffic is
literally editing two numbers. (Spread tightens with more samples: ./demo.sh loop 100)"
    ;;

  weight)
    if [[ -z "${2:-}" || -z "${3:-}" ]]; then
      echo "usage: ./demo.sh weight <v1> <v2>   e.g. ./demo.sh weight 50 50"; exit 1
    fi
    v1="$2"; v2="$3"
    kubectl -n "$NS" patch httproute whoami-weighted --type=json -p="[
      {\"op\":\"replace\",\"path\":\"/spec/rules/0/backendRefs/0/weight\",\"value\":${v1}},
      {\"op\":\"replace\",\"path\":\"/spec/rules/0/backendRefs/1/weight\",\"value\":${v2}}]"
    explain "Weights are now v1=${v1} v2=${v2}. Weights are relative; here they sum to
100 so read them as percentages. Traefik re-reads the route within a second, so
the very next requests shift — run './demo.sh loop' now to see it.
GitOps note: committed state is 100/0, so ArgoCD selfHeal will quietly revert
this live edit in ~minutes. A nice 'drift gets healed automatically' moment."
    ;;

  header)
    echo "No header           -> $(req "$HEADER_HOST"              | grep '^Name:')"
    echo "x-canary: true      -> $(req "$HEADER_HOST" -H 'x-canary: true' | grep '^Name:')"
    explain "HEADER-BASED ROUTING. This route has two rules on one hostname. The rule
with the 'x-canary: true' header match is MORE SPECIFIC, so Gateway API picks it
first — those requests get v2. Everyone else falls through to the catch-all
rule and gets v1. This is how you send internal testers or a feature-flag cohort
to a new version in prod without exposing it to the public — no weights involved."
    ;;

  reset)
    "$0" weight 100 0
    ;;

  *)
    grep '^#' "$0" | sed 's/^# \{0,1\}//'
    exit 1
    ;;
esac
