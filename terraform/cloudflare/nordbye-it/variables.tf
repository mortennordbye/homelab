variable "cloudflare_api_token" {
  description = "API token with Zone:Read, DNS:Edit, Zone Settings:Edit and Cache Rules:Edit on this zone. The token external-dns and cert-manager share is DNS-only and will not cover the zone setting or ruleset resources."
  type        = string
  sensitive   = true
}

variable "zone_name" {
  description = "Cloudflare zone managed by this configuration"
  type        = string
  default     = "nordbye.it"
}

variable "origin_hostname" {
  description = "Hostname every web record points at. Its A record is written by the DDNS client, so Terraform does not manage it."
  type        = string
  default     = "ddns.nordbye.it"
}

variable "proxied_hostnames" {
  description = "Hostnames served through the Cloudflare proxy, used to scope the cache rule"
  type        = list(string)
  default     = ["blog.nordbye.it", "nordbye.it", "www.nordbye.it"]
}

variable "edge_cache_ttl_seconds" {
  description = "Edge TTL for HTML. Short so deploys appear without a purge step: blog sends no Cache-Control and the Next.js portfolio sends s-maxage=31536000, so neither origin header is worth respecting."
  type        = number
  default     = 60
}
