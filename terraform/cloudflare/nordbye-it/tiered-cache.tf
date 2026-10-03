# Tiered Cache with the Smart topology, both free on every plan. A POP that
# misses asks an upper-tier POP near the origin before the origin itself, so a
# quiet POP's first visitor no longer waits on the residential uplink. Regional
# Tiered Cache (Enterprise) and Argo Smart Routing are paid; keep them out.
resource "cloudflare_argo_tiered_caching" "this" {
  zone_id = data.cloudflare_zone.this.zone_id
  value   = "on"
}

resource "cloudflare_tiered_cache" "this" {
  zone_id = data.cloudflare_zone.this.zone_id
  value   = "on"
}
