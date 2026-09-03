# Full (Strict). The origin serves a Let's Encrypt certificate covering bigd.no
# and *.bigd.no, so Cloudflare can validate it. The zone was on Full, which
# encrypts the edge-to-origin hop but accepts any certificate on it.
resource "cloudflare_zone_setting" "ssl" {
  zone_id    = data.cloudflare_zone.this.zone_id
  setting_id = "ssl"
  value      = "strict"
}

resource "cloudflare_zone_setting" "always_use_https" {
  zone_id    = data.cloudflare_zone.this.zone_id
  setting_id = "always_use_https"
  value      = "on"
}

# Off: audiobookshelf and seerr are stateful, and a stale archived page is
# worse than an honest failure. nordbye.it is the exception, being static.
resource "cloudflare_zone_setting" "always_online" {
  zone_id    = data.cloudflare_zone.this.zone_id
  setting_id = "always_online"
  value      = "off"
}

resource "cloudflare_zone_setting" "browser_cache_ttl" {
  zone_id    = data.cloudflare_zone.this.zone_id
  setting_id = "browser_cache_ttl"
  value      = 14400
}

# Cloudflare's default, declared so a dashboard change shows up as drift.
resource "cloudflare_zone_setting" "min_tls_version" {
  zone_id    = data.cloudflare_zone.this.zone_id
  setting_id = "min_tls_version"
  value      = "1.0"
}
