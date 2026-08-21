# Only the origin record lives here. Every app hostname in this zone is written
# by external-dns from the HTTPRoutes on the public Traefik gateway, so it owns
# them and reverts anything Terraform changes underneath it. Proxy status for
# those is set with the external-dns.kubernetes.io/cloudflare-proxied annotation
# on the route, not here.

# --- Origin ---------------------------------------------------------------

# The address every app hostname in this zone points at. The DDNS client
# rewrites content, so that attribute is ignored.
#
# Deliberately NOT proxied, unlike ddns.nordbye.it. Cloudflare resolves a
# DNS-only CNAME through to its target's answer, so proxying this record would
# route every hostname that points at it through the edge, whatever each
# record's own proxy status says. Verified against this zone: a DNS-only CNAME
# aimed at the proxied ddns.nordbye.it resolved to Cloudflare addresses and the
# request reached Cloudflare. That would drag audiobookshelf's audio through
# the CDN, which Cloudflare's terms prohibit outside Enterprise and which they
# act on at the account level rather than per hostname.
#
# The cost of leaving it DNS-only is that this record publishes the residential
# address. Closing that means moving audiobookshelf and seerr off public DNS,
# tracked in BACKLOG.md.
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
