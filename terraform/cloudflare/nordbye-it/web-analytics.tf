# Adopted, not created: removing a resource here deletes the site and its history.
#
# The beacon tag is in each site's own source — portfolio/src/app/layout.tsx and
# blog/config/_default/params.toml — so auto_install stays off, or the edge
# injects a second copy and double-counts every view.
#
# Declare each site exactly as it already is. Cloudflare builds the zone binding
# only at creation, so blog cannot be moved from host to zone_tag without a
# recreate that mints a new site_token, and an omitted host is sent as null,
# which wipes the site's name.

resource "cloudflare_web_analytics_site" "portfolio" {
  account_id   = data.cloudflare_zone.this.account.id
  zone_tag     = data.cloudflare_zone.this.zone_id
  auto_install = false
}

resource "cloudflare_web_analytics_site" "blog" {
  account_id   = data.cloudflare_zone.this.account.id
  host         = "blog.${var.zone_name}"
  auto_install = false
}
