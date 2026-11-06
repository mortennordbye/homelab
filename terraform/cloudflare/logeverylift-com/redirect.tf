# www exists only so that the hostname is not dead. The redirect at the edge
# keeps the app on one canonical host, so the same pages are not served on two
# hostnames, and the cluster never sees the request.
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
