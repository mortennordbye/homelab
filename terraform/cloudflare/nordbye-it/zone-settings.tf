# Full (Strict). The origin serves a Let's Encrypt wildcard for *.nordbye.it, so
# Cloudflare can validate it. Flexible would leave the Cloudflare-to-origin hop
# unencrypted and loop against the origin's HTTP-to-HTTPS redirect.
resource "cloudflare_zone_setting" "ssl" {
  zone_id    = data.cloudflare_zone.this.zone_id
  setting_id = "ssl"
  value      = "strict"
}

# The origin is a residential connection and occasionally drops a request
# outright, which Cloudflare renders as a 502. Always Online serves a stale copy
# from Cloudflare's archive instead, for the sites whose content is public and
# where a slightly old page beats an error.
#
# Deliberately not enabled on logeverylift.com: stale content in an
# authenticated app is worse than an honest failure.
resource "cloudflare_zone_setting" "always_online" {
  zone_id    = data.cloudflare_zone.this.zone_id
  setting_id = "always_online"
  value      = "on"
}
