# Split-horizon DNS for local.bigd.no, served by the UniFi gateway's resolver.
#
# This zone is not in Cloudflare, and external-dns does not manage it:
# k8s/talos/infra/external-dns/values.yaml lists local.bigd.no under
# excludeDomains, so an internal hostname can never leak into the public zone.
# To add an app, add an alias below. Do not annotate a route.
#
# Scope is user-defined records only. The console generates its "Default
# Policies" entries from DHCP fixed-IP reservations, and the API does not list
# them. A declaration here would create a second record that shadows each one.
# Change those in the DHCP reservation instead.

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
    "alertmanager",
    "argocd",
    "audiobookshelf",
    "auth",
    "bazarr",
    "bazarr-4k",
    "blog-stage",
    "cleanuparr",
    "docs",
    "flaresolverr",
    "grafana",
    "ha",
    "headroom",
    "hubble",
    "jarvis",
    "kargo",
    "mealie",
    "open-webui",
    "opencost",
    "portfolio-stage",
    "prometheus",
    "prowlarr",
    "pyrra",
    "qbittorrent",
    "radarr",
    "radarr-4k",
    "reelsmith",
    "sonarr",
    "tautulli",
    "tdarr",
    "traefik",
    "verksted",
  ]
}

# ttl is left unset on purpose. The controller stores "Auto" as 0, and the
# provider maps that to a null TTL, so any value here would show as a change on
# every existing record. site and enabled are Optional+Computed and also take
# the controller's own values.
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
