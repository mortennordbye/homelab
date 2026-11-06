# Only the origin record lives here. external-dns writes every app hostname in
# this zone from the HTTPRoutes on the public Traefik gateway. It owns those
# records and reverts any change Terraform makes to them. Set the proxy status
# with the external-dns.kubernetes.io/cloudflare-proxied annotation on the
# route, not here.

# --- Origin ---------------------------------------------------------------

# The address every app hostname in this zone points at. The DDNS client
# rewrites content, so that attribute is ignored.
#
# NOT proxied, unlike ddns.nordbye.it. A proxied record would route every
# hostname that points at it through the edge. That would send audiobookshelf's
# audio through the CDN, which Cloudflare's terms prohibit. The cost is that the
# record publishes the residential address. That trade-off is accepted.
resource "cloudflare_dns_record" "ddns" {
  zone_id = data.cloudflare_zone.this.zone_id
  name    = "ddns.${var.zone_name}"
  type    = "A"
  content = "84.212.143.165"
  proxied = false
  ttl     = 1

  lifecycle {
    ignore_changes = [content]
  }
}
