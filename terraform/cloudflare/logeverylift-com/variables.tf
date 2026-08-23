variable "cloudflare_api_token" {
  description = "API token with Zone:Read, DNS:Edit, Zone Settings:Edit and Cache Rules:Edit on this zone. The token external-dns and cert-manager share is DNS-only and will not cover the zone setting or ruleset resources."
  type        = string
  sensitive   = true
}

variable "zone_name" {
  description = "Cloudflare zone managed by this configuration"
  type        = string
  default     = "logeverylift.com"
}

variable "origin_hostname" {
  description = "Hostname the apex points at. Its A record lives in the nordbye.it zone and is written by the DDNS client."
  type        = string
  default     = "ddns.nordbye.it"
}
