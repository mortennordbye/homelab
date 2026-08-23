# Full (Strict). The origin serves a Let's Encrypt certificate covering bigd.no
# and *.bigd.no, so Cloudflare can validate it. The zone was on Full, which
# encrypts the edge-to-origin hop but accepts any certificate on it.
resource "cloudflare_zone_setting" "ssl" {
  zone_id    = data.cloudflare_zone.this.zone_id
  setting_id = "ssl"
  value      = "strict"
}
