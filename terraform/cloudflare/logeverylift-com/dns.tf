# The three MX records and the DKIM TXT are absent on purpose. Cloudflare Email
# Routing owns them (meta.email_routing, read_only), so the API rejects writes.
#
# TXT content carries its own escaped quotes, matching what the API returns.

resource "cloudflare_dns_record" "apex" {
  zone_id = data.cloudflare_zone.this.zone_id
  name    = var.zone_name
  type    = "CNAME"
  content = var.origin_hostname
  proxied = true
  ttl     = 1
}

# The HTTPRoute only serves the apex, so www would 404 on its own. The redirect
# ruleset sends it to the apex before it ever reaches the cluster.
resource "cloudflare_dns_record" "www" {
  zone_id = data.cloudflare_zone.this.zone_id
  name    = "www.${var.zone_name}"
  type    = "CNAME"
  content = var.zone_name
  proxied = true
  ttl     = 1
}

resource "cloudflare_dns_record" "spf" {
  zone_id = data.cloudflare_zone.this.zone_id
  name    = var.zone_name
  type    = "TXT"
  content = "\"v=spf1 include:_spf.mx.cloudflare.net ~all\""
  ttl     = 1
}

# p=none is deliberate. The domain receives through Cloudflare Email Routing,
# which forwards, and forwarded mail routinely fails SPF alignment. Monitor
# first; tighten to quarantine once it is clear nothing legitimate is affected.
resource "cloudflare_dns_record" "dmarc" {
  zone_id = data.cloudflare_zone.this.zone_id
  name    = "_dmarc.${var.zone_name}"
  type    = "TXT"
  content = "\"v=DMARC1; p=none\""
  ttl     = 1
}
