output "zone_id" {
  description = "Cloudflare zone ID, useful for API calls and imports"
  value       = data.cloudflare_zone.this.zone_id
}

output "web_analytics_site_token" {
  description = "Beacon token for the snippet in k8s/talos/apps/bigd/index.html"
  value       = cloudflare_web_analytics_site.bigd.site_token
}
