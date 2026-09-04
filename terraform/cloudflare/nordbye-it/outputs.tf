output "zone_id" {
  description = "Cloudflare zone ID, useful for API calls and imports"
  value       = data.cloudflare_zone.this.zone_id
}

output "web_analytics_site_tokens" {
  description = "Beacon tokens, matching the tags already embedded in each site's source"
  value = {
    portfolio = cloudflare_web_analytics_site.portfolio.site_token
    blog      = cloudflare_web_analytics_site.blog.site_token
  }
}
