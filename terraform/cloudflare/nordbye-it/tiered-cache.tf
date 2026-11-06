# Tiered Cache with the Smart topology, both free on every plan. A POP that
# misses asks an upper-tier POP near the origin before it asks the origin, so
# the first visitor at a quiet POP does not wait on the residential uplink.
# Regional Tiered Cache (Enterprise) and Argo Smart Routing are paid. Keep
# them out.
resource "cloudflare_argo_tiered_caching" "this" {
  zone_id = data.cloudflare_zone.this.zone_id
  value   = "on"
}

resource "cloudflare_tiered_cache" "this" {
  zone_id = data.cloudflare_zone.this.zone_id
  value   = "on"
}
