# The beacon tag is in the page itself (k8s/talos/apps/bigd/index.html), so
# auto_install stays off. With it on, the edge injects a second copy and counts
# every view twice. Same shape as the two adopted sites in ../nordbye-it.
resource "cloudflare_web_analytics_site" "bigd" {
  account_id   = data.cloudflare_zone.this.account.id
  zone_tag     = data.cloudflare_zone.this.zone_id
  auto_install = false
}
