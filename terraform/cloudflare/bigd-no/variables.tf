variable "cloudflare_api_token" {
  description = "API token with Zone:Read, DNS:Edit and Zone Settings:Edit on this zone, plus account-level Web Analytics:Edit."
  type        = string
  sensitive   = true
}

variable "zone_name" {
  description = "Cloudflare zone managed by this configuration"
  type        = string
  default     = "bigd.no"
}
