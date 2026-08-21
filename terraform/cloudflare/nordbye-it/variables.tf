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
  description = "Hostnames whose HTML the cache rule may cache. Not the same as what is proxied: gate and headroom are proxied too but excluded here, because caching authenticated or stateful HTML at a shared edge can serve one visitor's page to another."
  type        = list(string)
  default     = ["blog.nordbye.it", "nordbye.it", "www.nordbye.it"]
}

variable "edge_cache_ttl_seconds" {
  description = "Edge TTL for HTML. Cloudflare caches per POP, so at this traffic level a short TTL expires before the next visitor from that POP arrives and almost everything misses. Four hours matches the zone's browser TTL. Purge from the dashboard after publishing."
  type        = number
  default     = 14400
}
