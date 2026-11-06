# Without a rule, Cloudflare caches by file extension only. HTML is the slow
# request from the residential origin, so it needs this rule to be cached.
#
# browser_ttl is absent on purpose. The zone default applies only where the
# origin sets no max-age (HTML alone), so assets keep the value the origin sent.
#
# /api/ is excluded so nordbye.it/api/v1/infra (README status card) stays fresh.
#
# /_next/ is excluded because override_origin applies to every matched
# response. It would re-fetch the immutable fingerprinted assets on the short
# TTL, and it would pin a superseded build's 404s at the edge. Without the
# rule, Cloudflare respects the origin's immutable and no-store headers there.
resource "cloudflare_ruleset" "cache" {
  zone_id     = data.cloudflare_zone.this.zone_id
  name        = "default"
  kind        = "zone"
  phase       = "http_request_cache_settings"
  description = "Edge-cache HTML for the proxied sites"

  rules = [
    {
      ref         = "cache_html"
      description = "Cache HTML at the edge, excluding the infra API and build assets"
      expression = format(
        "(http.host in {%s}) and not starts_with(http.request.uri.path, \"/api/\") and not starts_with(http.request.uri.path, \"/_next/\")",
        join(" ", [for h in var.proxied_hostnames : "\"${h}\""])
      )
      action = "set_cache_settings"
      action_parameters = {
        cache = true
        edge_ttl = {
          mode    = "override_origin"
          default = var.edge_cache_ttl_seconds
          # -1 is Cloudflare's no-store shorthand: an error during a deploy
          # must not stay pinned at the edge after the origin recovers.
          status_code_ttl = [
            {
              status_code_range = {
                from = 400
                to   = 599
              }
              value = -1
            }
          ]
        }
      }
    }
  ]
}
