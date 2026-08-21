# Proxied records must carry ttl = 1 (automatic); Cloudflare rejects any other
# value on them.
#
# _acme-challenge.nordbye.it is deliberately absent. cert-manager creates and
# deletes it during every DNS-01 issuance, so managing it here would fight
# certificate renewal.
#
# TXT content carries its own escaped quotes: the API stores and returns TXT
# values quoted, and bare values plan as a diff on every run.

# --- Origin ---------------------------------------------------------------

# The address every web hostname points at. The DDNS client rewrites content, so
# that attribute is ignored. The record stays managed so its proxy status is
# pinned: proxying this would break the CNAME chain the other records rely on.
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

# --- Proxied sites --------------------------------------------------------

resource "cloudflare_dns_record" "blog" {
  zone_id = data.cloudflare_zone.this.zone_id
  name    = "blog.${var.zone_name}"
  type    = "CNAME"
  content = var.origin_hostname
  proxied = true
  ttl     = 1
}

resource "cloudflare_dns_record" "apex" {
  zone_id = data.cloudflare_zone.this.zone_id
  name    = var.zone_name
  type    = "CNAME"
  content = var.origin_hostname
  proxied = true
  ttl     = 1
}

resource "cloudflare_dns_record" "www" {
  zone_id = data.cloudflare_zone.this.zone_id
  name    = "www.${var.zone_name}"
  type    = "CNAME"
  content = var.zone_name
  proxied = true
  ttl     = 1
}

# --- Apps -----------------------------------------------------------------

# gate serves reelsmith (behind Authentik), headroom serves headroom-demo. Both
# are proxied for edge TLS, DDoS cover and asset caching, but deliberately left
# out of var.proxied_hostnames so the cache rule never touches their HTML:
# caching an authenticated or stateful response at a shared edge can serve one
# visitor's page to another. Static assets are still edge-cached by extension,
# with no rule involved.
#
# Neither app has an IP-keyed rate limit, unlike blog and portfolio, so proxying
# them needs no ipStrategy change in the cluster.
#
# The resource name stays "direct" so this is an in-place update; renaming would
# destroy and recreate live DNS records.
resource "cloudflare_dns_record" "direct" {
  for_each = toset(["gate", "headroom"])

  zone_id = data.cloudflare_zone.this.zone_id
  name    = "${each.key}.${var.zone_name}"
  type    = "CNAME"
  content = var.origin_hostname
  proxied = true
  ttl     = 1
}

# --- Mail -----------------------------------------------------------------

resource "cloudflare_dns_record" "mx" {
  for_each = {
    "aspmx.l.google.com"      = 1
    "alt1.aspmx.l.google.com" = 5
    "alt2.aspmx.l.google.com" = 5
    "alt3.aspmx.l.google.com" = 10
    "alt4.aspmx.l.google.com" = 10
  }

  zone_id  = data.cloudflare_zone.this.zone_id
  name     = var.zone_name
  type     = "MX"
  content  = each.key
  priority = each.value
  ttl      = 3600
}

resource "cloudflare_dns_record" "spf" {
  zone_id = data.cloudflare_zone.this.zone_id
  name    = var.zone_name
  type    = "TXT"
  content = "\"v=spf1 include:_spf.google.com ~all\""
  ttl     = 3600
}

resource "cloudflare_dns_record" "dmarc" {
  zone_id = data.cloudflare_zone.this.zone_id
  name    = "_dmarc.${var.zone_name}"
  type    = "TXT"
  content = "\"v=DMARC1; p=quarantine\""
  ttl     = 3600
}

# --- Domain verification --------------------------------------------------

# Two Search Console properties are verified against this zone: nordbye.it and
# blog.nordbye.it. Removing either un-verifies a property.
resource "cloudflare_dns_record" "google_verification_1" {
  zone_id = data.cloudflare_zone.this.zone_id
  name    = var.zone_name
  type    = "TXT"
  content = "\"google-site-verification=nZvJnfeqepcZVfqeG9LKRIbZQll06rxwsOi93EzoWHU\""
  ttl     = 3600
}

resource "cloudflare_dns_record" "google_verification_2" {
  zone_id = data.cloudflare_zone.this.zone_id
  name    = var.zone_name
  type    = "TXT"
  content = "\"google-site-verification=pW0Dln3ShXs7R0R610g7fo0jeDAkiSQfmzgLI_KJolE\""
  ttl     = 3600
}

# Azure App Service custom domain verification ID.
resource "cloudflare_dns_record" "asuid" {
  zone_id = data.cloudflare_zone.this.zone_id
  name    = "asuid.${var.zone_name}"
  type    = "TXT"
  content = "\"17D18F37325E41EA89D80F0E2BB5977B800AC2DCBA06E506C4049F68A11EC9BC\""
  ttl     = 1
}
