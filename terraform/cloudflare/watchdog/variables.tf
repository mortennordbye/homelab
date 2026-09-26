variable "cloudflare_api_token" {
  description = "API token with account-level Workers Scripts:Edit and Workers KV Storage:Edit."
  type        = string
  sensitive   = true
}

variable "account_id" {
  description = "Cloudflare account that owns the Worker"
  type        = string
}

variable "bitwarden_project_id" {
  description = "Bitwarden Secrets Manager project the heartbeat URL is written to"
  type        = string
  default     = "1ea61322-5f4a-44a4-b4d0-b29b00ba1134"
}

variable "sites" {
  description = "Public URLs checked from Cloudflare every minute. Keep in step with the public-sites Probe in k8s/talos/infra/blackbox-exporter/probe.yaml."
  type        = list(string)
  default = [
    "https://nordbye.it",
    "https://blog.nordbye.it",
    "https://logeverylift.com",
    "https://auth.bigd.no",
    "https://hub.bigd.no",
  ]
}

variable "workers_subdomain" {
  description = "The account's workers.dev subdomain (Workers & Pages > Overview), used to build the heartbeat URL."
  type        = string
}
