# Email Routing owns this zone's three MX records and the DKIM key. They are
# read-only through the API, so dns.tf does not declare them. The catch-all is
# the only writable part, and the MX records do nothing without it. At its
# default (drop, disabled), the zone advertises MX, accepts mail and delivers
# none.
resource "cloudflare_email_routing_catch_all" "this" {
  zone_id = data.cloudflare_zone.this.zone_id
  name    = "Forward everything to the account owner"
  enabled = true

  matchers = [
    {
      type = "all"
    }
  ]

  actions = [
    {
      type  = "forward"
      value = [var.forward_to]
    }
  ]
}
