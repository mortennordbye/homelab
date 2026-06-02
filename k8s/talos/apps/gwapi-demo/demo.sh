#!/usr/bin/env bash
# Gateway API live demo driver.
#
# Uses `curl --resolve` against the public Traefik LB IP, so it works on-LAN with
# NO DNS record needed. TLS still validates: SNI/Host = the demo hostname, which the
# *.bigd.no wildcard cert covers.
#
# Usage:
#   ./demo.sh show              # list workloads + routes (role-separation visual)
#   ./demo.sh loop [N]          # N requests to the weighted route, tally v1 vs v2 (default 50)
#   ./demo.sh weight <v1> <v2>  # live-patch the canary weights, e.g. ./demo.sh weight 50 50
#   ./demo.sh header            # show header-based routing (x-canary: true -> v2)
#   ./demo.sh reset             # restore committed 100/0 split
set -euo pipefail

LB_IP="10.3.10.101"          # traefik-public LoadBalancer IP
WEIGHTED_HOST="gwapi-demo.bigd.no"
HEADER_HOST="gwapi-header.bigd.no"
NS="gwapi-demo"
KUBECONFIG_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)/terraform/proxmox/hyper-cluster/k8s/talos/kubeconfig"
export KUBECONFIG="${KUBECONFIG:-$KUBECONFIG_PATH}"

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
    ;;
  loop)
    n="${2:-50}"
    echo "Sending $n requests to https://${WEIGHTED_HOST}/ ..."
    for _ in $(seq 1 "$n"); do req "$WEIGHTED_HOST" | grep '^Name:'; done | sort | uniq -c
    ;;
  weight)
    v1="${2:?usage: weight <v1> <v2>}"; v2="${3:?usage: weight <v1> <v2>}"
    kubectl -n "$NS" patch httproute whoami-weighted --type=json -p="[
      {\"op\":\"replace\",\"path\":\"/spec/rules/0/backendRefs/0/weight\",\"value\":${v1}},
      {\"op\":\"replace\",\"path\":\"/spec/rules/0/backendRefs/1/weight\",\"value\":${v2}}]"
    echo "Set whoami-v1=${v1} whoami-v2=${v2}  (ArgoCD selfHeal will revert to 100/0 in ~minutes)"
    ;;
  header)
    echo "No header           -> $(req "$HEADER_HOST"              | grep '^Name:')"
    echo "x-canary: true      -> $(req "$HEADER_HOST" -H 'x-canary: true' | grep '^Name:')"
    ;;
  reset)
    "$0" weight 100 0
    ;;
  *)
    grep '^#' "$0" | sed 's/^# \{0,1\}//'
    exit 1
    ;;
esac
