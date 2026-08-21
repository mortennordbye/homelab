# Cloudflare decides default cache eligibility by file extension, so HTML is
# never cached without a rule regardless of origin headers. HTML is the request
# that costs ~700ms from the residential origin, so it is the one worth caching.
#
# browser_ttl is deliberately absent. This rule matches every path on these
# hosts except /api/, so overriding it would strip the immutable year off the
# fingerprinted CSS and JS. The zone's browser TTL only fills the gap where an
# origin sets no max-age, which is HTML alone, so assets are already correct.
#
# /api/ is excluded so nordbye.it/api/v1/infra, which feeds the README status
# card, keeps hitting origin and stays fresh.
resource "cloudflare_ruleset" "cache" {
  zone_id     = data.cloudflare_zone.this.zone_id
  name        = "default"
  kind        = "zone"
  phase       = "http_request_cache_settings"
  description = "Edge-cache HTML for the proxied sites"

  rules = [
    {
      ref         = "cache_html"
      description = "Cache HTML at the edge, excluding the infra API"
      expression = format(
        "(http.host in {%s}) and not starts_with(http.request.uri.path, \"/api/\")",
        join(" ", [for h in var.proxied_hostnames : "\"${h}\""])
      )
      action = "set_cache_settings"
      action_parameters = {
        cache = true
        edge_ttl = {
          mode    = "override_origin"
          default = var.edge_cache_ttl_seconds
        }
      }
    }
  ]
}
