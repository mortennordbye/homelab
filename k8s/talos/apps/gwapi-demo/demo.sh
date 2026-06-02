#!/usr/bin/env bash
# Gateway API live demo driver.
#
# Uses `curl --resolve` against the public Traefik LB IP, so it works on-LAN with
# NO DNS record needed. TLS still validates: SNI/Host = the demo hostname, which the
# *.bigd.no wildcard cert covers.
#
# The canary weights are driven by GitOps (committed in httproute-weighted.yaml,
# maintained by ArgoCD) — this script only OBSERVES traffic, it never patches.
#
# Usage:
#   ./demo.sh show              # workloads + the shared Gateway (role-separation visual)
#   ./demo.sh manifest [what]   # print the YAML: weighted | header | deploy | all
#   ./demo.sh loop [N]          # N requests to the weighted route, live split bar (default 50)
#   ./demo.sh header            # show header-based routing (x-canary: true -> v2)
set -euo pipefail

LB_IP="10.3.10.101"          # traefik-public LoadBalancer IP
WEIGHTED_HOST="gwapi-demo.bigd.no"
HEADER_HOST="gwapi-header.bigd.no"
NS="gwapi-demo"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KUBECONFIG_PATH="$(cd "$DIR/../../../.." && pwd)/terraform/proxmox/hyper-cluster/k8s/talos/kubeconfig"
export KUBECONFIG="${KUBECONFIG:-$KUBECONFIG_PATH}"

# ── colours (disabled when not a TTY) ────────────────────────────────
if [[ -t 1 ]]; then
  RESET=$'\e[0m'; BOLD=$'\e[1m'; DIM=$'\e[2m'
  RED=$'\e[31m'; GREEN=$'\e[32m'; YELLOW=$'\e[33m'; CYAN=$'\e[36m'; MAGENTA=$'\e[35m'
else
  RESET=''; BOLD=''; DIM=''; RED=''; GREEN=''; YELLOW=''; CYAN=''; MAGENTA=''
fi
V1C="$GREEN"; V2C="$MAGENTA"   # v1 = green, v2 = magenta everywhere

rep() { local n=$2 s=''; while ((n-- > 0)); do s+="$1"; done; printf '%s' "$s"; }
banner() {  # banner <title>
  local t="$1" w=66
  echo
  printf '%s┏%s┓%s\n' "$CYAN" "$(rep '━' $w)" "$RESET"
  printf '%s┃%s %s%-*s%s %s┃%s\n' "$CYAN" "$RESET" "$BOLD" $((w-2)) "$t" "$RESET" "$CYAN" "$RESET"
  printf '%s┗%s┛%s\n' "$CYAN" "$(rep '━' $w)" "$RESET"
}
step() { printf '\n%s▶ %s%s\n' "${BOLD}${CYAN}" "$1" "$RESET"; }
runcmd() { printf '%s  $ %s%s\n' "$DIM" "$*" "$RESET"; }   # echo a command, dimmed
explain() {
  echo
  printf '%s' "$DIM"
  while IFS= read -r line; do echo "  │ ${line# }"; done <<<"$1"
  printf '%s' "$RESET"
}
colour_ver() { sed -e "s/v1/${V1C}v1${RESET}/g" -e "s/v2/${V2C}v2${RESET}/g"; }

req() {  # req <host> [curl args...]
  local host="$1"; shift
  curl -sS --resolve "${host}:443:${LB_IP}" "$@" "https://${host}/"
}

weights() {  # print the committed canary weights, coloured (read-only)
  local w1 w2
  w1=$(kubectl -n "$NS" get httproute whoami-weighted -o jsonpath='{.spec.rules[0].backendRefs[0].weight}')
  w2=$(kubectl -n "$NS" get httproute whoami-weighted -o jsonpath='{.spec.rules[0].backendRefs[1].weight}')
  printf '  %swhoami-v1%s = %s%-3s%s   %swhoami-v2%s = %s%-3s%s\n' \
    "$V1C" "$RESET" "$BOLD" "$w1" "$RESET" "$V2C" "$RESET" "$BOLD" "$w2" "$RESET"
}

case "${1:-}" in
  show)
    banner "ROLE SEPARATION   GatewayClass → Gateway → HTTPRoute"
    step "What this app's namespace actually contains:"
    runcmd "kubectl -n $NS get deploy,svc,httproute"
    kubectl -n "$NS" get deploy,svc,httproute
    step "Where those routes attach — a shared Gateway in ANOTHER namespace, owned by the platform team:"
    runcmd "kubectl -n traefik get gateway traefik-gateway-public"
    kubectl -n traefik get gateway traefik-gateway-public
    step "Committed canary weights on whoami-weighted:"
    weights
    explain "ROLE SEPARATION — the headline pitch vs Ingress.
This namespace holds ONLY Deployments, Services and HTTPRoutes. There is NO
Gateway here. The routes attach to 'traefik-gateway-public' (platform-owned, in
the 'traefik' namespace) via parentRefs, and inherit its *.bigd.no TLS cert.
Onboarding an app = adding routes, never touching shared infra. Three resources,
three owners, three RBAC scopes — that is the whole point."
    ;;

  manifest)
    what="${2:-all}"
    hl() {  # syntax-highlight if 'bat' exists, else plain cat
      echo; printf '%s───── %s ─────%s\n' "${BOLD}${CYAN}" "$1" "$RESET"
      if command -v bat >/dev/null 2>&1; then bat --style=plain --color=always -l yaml "$DIR/$1"
      else cat "$DIR/$1"; fi
    }
    banner "THE MANIFEST   typed, declarative routing"
    case "$what" in
      weighted) hl httproute-weighted.yaml ;;
      header)   hl httproute-header.yaml ;;
      deploy)   hl deployment-v1.yaml; hl service-v1.yaml ;;
      all)      hl httproute-weighted.yaml; hl httproute-header.yaml ;;
      *) echo "usage: ./demo.sh manifest [weighted|header|deploy|all]"; exit 1 ;;
    esac
    explain "No controller-specific annotations — the hostname, the match rules and the
weighted backends are all first-class fields the API server validates and
defaults. Shift the canary by editing the two 'weight' values and pushing:
ArgoCD applies it and keeps it there. That is also why ArgoCD can diff a route
meaningfully (an Ingress annotation soup can't be diffed like this)."
    ;;

  loop)
    n="${2:-50}"
    banner "WEIGHTED CANARY   live traffic split"
    step "Committed weights (maintained by ArgoCD):"; weights
    step "Firing $n requests at one hostname (each dot = one response):"
    runcmd "curl --resolve ${WEIGHTED_HOST}:443:${LB_IP} https://${WEIGHTED_HOST}/   ×${n}"
    printf '  '
    v1=0; v2=0
    for _ in $(seq 1 "$n"); do
      r=$(req "$WEIGHTED_HOST" | grep '^Name:' || true)
      case "$r" in
        *v1*) v1=$((v1+1)); printf '%s•%s' "$V1C" "$RESET" ;;
        *v2*) v2=$((v2+1)); printf '%s•%s' "$V2C" "$RESET" ;;
        *)    printf '%s×%s' "$RED" "$RESET" ;;
      esac
    done
    echo; echo
    bar() {  # bar <label> <colour> <count>
      local pct=$(( $3 * 100 / n )) w=$(( $3 * 40 / n ))
      printf '  %s%-9s%s %s%s%s %3d  (%d%%)\n' "$2" "$1" "$RESET" "$2" "$(rep '█' "$w")" "$RESET" "$3" "$pct"
    }
    bar "whoami-v1" "$V1C" "$v1"
    bar "whoami-v2" "$V2C" "$v2"
    explain "WEIGHTED CANARY. One hostname, one HTTPRoute, two Services behind it. Traffic
is split by the per-backend 'weight' field (Traefik = weighted round-robin). To
roll the canary forward you change those weights in git and push — no second
Ingress, no nginx annotations, no kubectl patching. (Spread tightens with more
samples: ./demo.sh loop 200)"
    ;;

  header)
    banner "HEADER-BASED ROUTING   same host, different header"
    step "Plain request (no header):"
    runcmd "curl --resolve ${HEADER_HOST}:443:${LB_IP} https://${HEADER_HOST}/"
    printf '  → served by  %s\n' "$(req "$HEADER_HOST" | grep '^Name:' | colour_ver)"
    step "Same URL, but with the canary header:"
    runcmd "curl -H 'x-canary: true' --resolve ${HEADER_HOST}:443:${LB_IP} https://${HEADER_HOST}/"
    printf '  → served by  %s\n' "$(req "$HEADER_HOST" -H 'x-canary: true' | grep '^Name:' | colour_ver)"
    explain "HEADER-BASED ROUTING. Two rules on one hostname. The rule with the
'x-canary: true' header match is MORE SPECIFIC, so Gateway API picks it first —
those requests get v2. Everyone else falls through to the catch-all rule and
gets v1. This is how you send internal testers or a feature-flag cohort to a new
version in prod without exposing it to the public — no weights involved."
    ;;

  *)
    grep '^#' "$0" | sed 's/^# \{0,1\}//'
    exit 1
    ;;
esac
