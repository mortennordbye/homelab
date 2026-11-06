# Full (Strict), not Full. The origin serves a Let's Encrypt certificate for
# logeverylift.com and *.logeverylift.com, so Cloudflare validates it instead of
# accepting any certificate.
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

# Off: serving a stale archived page from an authenticated app can show one
# visitor a page built for another.
resource "cloudflare_zone_setting" "always_online" {
  zone_id    = data.cloudflare_zone.this.zone_id
  setting_id = "always_online"
  value      = "off"
}

# This zone has no cache rule, so this setting applies only to responses that
# the origin sends without a max-age.
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
