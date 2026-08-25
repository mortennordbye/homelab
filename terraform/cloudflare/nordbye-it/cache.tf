# Cloudflare decides default cache eligibility by file extension, so HTML is
# never cached without a rule regardless of origin headers. HTML is the request
# that costs ~700ms from the residential origin, so it is the one worth caching.
#
# browser_ttl is deliberately absent. The zone's browser TTL only fills the gap
# where an origin sets no max-age, which is HTML alone, so assets keep whatever
# the origin sent.
#
# /api/ is excluded so nordbye.it/api/v1/infra, which feeds the README status
# card, keeps hitting origin and stays fresh.
#
# /_next/ is excluded because override_origin applies to every response the rule
# matches, not just the ones worth caching:
#
#   - The fingerprinted CSS/JS under /_next/static/ ship
#     `public, max-age=31536000, immutable`, and forcing a 4h edge TTL on them
#     made the edge re-fetch a year-immutable file six times a day. Left to the
#     default extension rules Cloudflare caches them and respects that year.
#   - More importantly, a 404 for a chunk name from a superseded build also
#     inherited the 4h TTL. After the 2026-08-25 portfolio promotion the edge
#     held both a stale HTML document and a cached 404 for every asset it
#     referenced, so the site rendered unstyled until a manual purge. The origin
#     answers those with `no-store`, which Cloudflare now honours again.
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
          # An error page is never worth holding for four hours. -1 is
          # Cloudflare's shorthand for no-store, so a promotion that briefly
          # 5xxs, or a URL that 404s mid-deploy, cannot pin that answer at the
          # edge long after the origin recovered.
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
