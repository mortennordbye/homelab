# The beacon tag is in the page itself (k8s/talos/apps/bigd/index.html), so
# auto_install stays off: the edge would inject a second copy and double-count
# every view. Same shape as the two adopted sites in ../nordbye-it.
resource "cloudflare_web_analytics_site" "bigd" {
  account_id   = data.cloudflare_zone.this.account.id
  zone_tag     = data.cloudflare_zone.this.zone_id
  auto_install = false
}
