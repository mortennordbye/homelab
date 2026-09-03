# Full (Strict). The origin serves a Let's Encrypt wildcard for *.nordbye.it, so
# Cloudflare can validate it. Flexible would leave the Cloudflare-to-origin hop
# unencrypted and loop against the origin's HTTP-to-HTTPS redirect.
resource "cloudflare_zone_setting" "ssl" {
  zone_id    = data.cloudflare_zone.this.zone_id
  setting_id = "ssl"
  value      = "strict"
}

# The residential origin occasionally drops a request, which renders as a 502;
# Always Online serves a stale archived copy instead. Deliberately not enabled
# on logeverylift.com: stale content in an authenticated app is worse than an
# honest failure.
resource "cloudflare_zone_setting" "always_online" {
  zone_id    = data.cloudflare_zone.this.zone_id
  setting_id = "always_online"
  value      = "on"
}

# Redirect http at the POP. Left off, the request crosses the internet in
# cleartext just to reach the origin's own redirect.
resource "cloudflare_zone_setting" "always_use_https" {
  zone_id    = data.cloudflare_zone.this.zone_id
  setting_id = "always_use_https"
  value      = "on"
}

# Must stay equal to var.edge_cache_ttl_seconds. The zone default only applies
# where the origin sets no max-age, which here is HTML — the same responses the
# cache rule pins at the edge, so a split leaves the two lifetimes disagreeing.
resource "cloudflare_zone_setting" "browser_cache_ttl" {
  zone_id    = data.cloudflare_zone.this.zone_id
  setting_id = "browser_cache_ttl"
  value      = var.edge_cache_ttl_seconds
}

# Cloudflare's default, declared so a dashboard change shows up as drift.
resource "cloudflare_zone_setting" "min_tls_version" {
  zone_id    = data.cloudflare_zone.this.zone_id
  setting_id = "min_tls_version"
  value      = "1.0"
}
