output "zone_id" {
  description = "Cloudflare zone ID, useful for API calls and imports"
  value       = data.cloudflare_zone.this.zone_id
}
