# Full (Strict). The origin serves a Let's Encrypt wildcard for *.nordbye.it, so
# Cloudflare can validate it. Flexible would leave the Cloudflare-to-origin hop
# unencrypted and loop against the origin's HTTP-to-HTTPS redirect.
resource "cloudflare_zone_setting" "ssl" {
  zone_id    = data.cloudflare_zone.this.zone_id
  setting_id = "ssl"
  value      = "strict"
}
