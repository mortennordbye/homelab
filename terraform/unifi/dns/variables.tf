variable "unifi_api_key" {
  description = "UniFi Network API key, created in the console at /network/default/integrations. Ignores username/password when set, and does not work with 2FA-protected accounts because it bypasses them entirely."
  type        = string
  sensitive   = true
}

variable "unifi_api_url" {
  description = "Base URL of the UniFi console. No /api path - the SDK discovers it."
  type        = string
  default     = "https://10.3.10.1"
}

variable "domain" {
  description = "Internal split-horizon domain these records live in. external-dns is barred from it by excludeDomains in k8s/talos/infra/external-dns/values.yaml."
  type        = string
  default     = "local.bigd.no"
}
