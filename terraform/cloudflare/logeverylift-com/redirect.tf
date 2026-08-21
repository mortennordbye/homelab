# www exists only to not be a dead hostname. Redirecting at the edge keeps the
# app on one canonical host, which avoids serving the same pages on two
# hostnames, and means the cluster never sees the request.
resource "cloudflare_ruleset" "redirect" {
  zone_id     = data.cloudflare_zone.this.zone_id
  name        = "default"
  kind        = "zone"
  phase       = "http_request_dynamic_redirect"
  description = "Canonical host redirects"

  rules = [
    {
      ref         = "www_to_apex"
      description = "Send www to the apex"
      expression  = "http.host eq \"www.${var.zone_name}\""
      action      = "redirect"
      action_parameters = {
        from_value = {
          status_code           = 301
          preserve_query_string = true
          target_url = {
            expression = "concat(\"https://${var.zone_name}\", http.request.uri.path)"
          }
        }
      }
    }
  ]
}
