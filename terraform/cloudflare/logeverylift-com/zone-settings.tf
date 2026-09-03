# Full (Strict) rather than Full: the origin serves a Let's Encrypt certificate
# covering logeverylift.com and *.logeverylift.com, so Cloudflare can validate it
# instead of accepting anything.
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

# No cache rule in this zone, so this only reaches responses the origin leaves
# without a max-age.
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
