# Full (Strict) rather than Full: the origin serves a Let's Encrypt certificate
# covering logeverylift.com and *.logeverylift.com, so Cloudflare can validate it
# instead of accepting anything.
resource "cloudflare_zone_setting" "ssl" {
  zone_id    = data.cloudflare_zone.this.zone_id
  setting_id = "ssl"
  value      = "strict"
}
