# Full (Strict). The origin serves a Let's Encrypt certificate for bigd.no and
# *.bigd.no, so Cloudflare can validate it. Plain Full encrypts the
# edge-to-origin hop but accepts any certificate on it.
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

# Off: audiobookshelf and seerr are stateful. A stale archived page is worse
# than a plain error. nordbye.it is static, so it is the exception.
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

# Cloudflare's default. Declared so that a dashboard change shows as drift.
resource "cloudflare_zone_setting" "min_tls_version" {
  zone_id    = data.cloudflare_zone.this.zone_id
  setting_id = "min_tls_version"
  value      = "1.0"
}
