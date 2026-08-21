# Split-horizon DNS for local.bigd.no, served by the UniFi gateway's resolver.
#
# This zone is deliberately not in Cloudflare and not managed by external-dns -
# k8s/talos/infra/external-dns/values.yaml lists local.bigd.no under
# excludeDomains so an internal hostname can never leak into the public zone.
# Adding an app therefore means adding an alias below, not annotating a route.
#
# Scope is the 27 user-defined records only. The console's DNS Records view also
# lists 14 entries under "View Default Policies", one per DHCP fixed-IP
# reservation (nas, pbs, hyper1-3, home, hue-bridge-pro, adguard,
# genesis-ctrl-01..03, genesis-worker-01..03). Those are generated from the
# reservation, carry metadata.origin other than USER_DEFINED, and are absent
# from both the static-dns and the dns/policies API. Declaring them here would
# not import them - it would create a second, user-defined record shadowing each
# one. Change those in the DHCP reservation instead.

locals {
  private_gateway = "traefik-gateway-private.${var.domain}"

  # Cilium LB-IPAM VIPs announced on L2, not hosts. If a VIP is reassigned in
  # k8s/talos/infra/cilium, this map has to follow.
  vips = {
    "traefik-gateway-public"  = "10.3.10.101"
    "traefik-gateway-private" = "10.3.10.102"
    "plex"                    = "10.3.10.103"
  }

  # Everything reached through the private Traefik gateway. One entry per
  # HTTPRoute attached to gateway-private, so this list tracks the apps in
  # k8s/talos/apps/ rather than any addressing decision.
  aliases = [
    "argocd",
    "auth",
    "bazarr",
    "blog-stage",
    "flaresolverr",
    "grafana",
    "ha",
    "headroom",
    "hubble",
    "kargo",
    "lazylibrarian",
    "logeverylift",
    "open-webui",
    "portfolio-stage",
    "prometheus",
    "prowlarr",
    "qbittorrent",
    "radarr",
    "reelsmith",
    "sonarr",
    "tautulli",
    "traefik",
    "verksted",
    "workout",
  ]
}

# ttl is left unset on purpose. The controller stores "Auto" as 0, which the
# provider maps to a null TTL, so setting anything here would show as a change
# against every existing record. site and enabled are Optional+Computed and
# likewise settle on the controller's own values.
resource "unifi_dns_record" "vip" {
  for_each = local.vips

  name        = "${each.key}.${var.domain}"
  record_type = "A"
  value       = each.value
}

resource "unifi_dns_record" "alias" {
  for_each = toset(local.aliases)

  name        = "${each.key}.${var.domain}"
  record_type = "CNAME"
  value       = local.private_gateway
}
