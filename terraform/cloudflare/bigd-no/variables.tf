variable "cloudflare_api_token" {
  description = "API token with Zone:Read, DNS:Edit and Zone Settings:Edit on this zone, plus account-level Web Analytics:Edit. The token external-dns and cert-manager share is DNS-only and will not cover the zone setting or Web Analytics resources."
  type        = string
  sensitive   = true
}

variable "zone_name" {
  description = "Cloudflare zone managed by this configuration"
  type        = string
  default     = "bigd.no"
}
