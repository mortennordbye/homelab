variable "cloudflare_api_token" {
  description = "API token with account-level Workers Scripts:Edit and Workers KV Storage:Edit."
  type        = string
  sensitive   = true
}

variable "account_id" {
  description = "Cloudflare account that owns the Worker"
  type        = string
}

variable "discord_webhook_url" {
  description = "The Discord webhook Alertmanager uses (Bitwarden alertmanager-discord-webhook). A trailing /slack is removed; the Worker posts Discord's own format."
  type        = string
  sensitive   = true
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
  description = "The account's workers.dev subdomain (Workers & Pages > Overview), used only to build the heartbeat URL output."
  type        = string
}
