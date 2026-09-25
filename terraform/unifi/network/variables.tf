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

variable "wifi_passphrases" {
  description = "WPA passphrases keyed by SSID role: trusted, iot, guest. A value different from the console's rotates that SSID's password on apply."
  type        = map(string)
  sensitive   = true

  validation {
    condition     = alltrue([for k in ["trusted", "iot", "guest"] : !contains(["", "REPLACE_ME"], lookup(var.wifi_passphrases, k, ""))])
    error_message = "Still a placeholder or empty; paste the current value from the console."
  }
}

variable "ddns_cloudflare_tokens" {
  description = "Cloudflare API tokens for the gateway's dynamic DNS clients, keyed by zone: bigd.no, nordbye.it."
  type        = map(string)
  sensitive   = true

  validation {
    condition     = alltrue([for k in ["bigd.no", "nordbye.it"] : !contains(["", "REPLACE_ME"], lookup(var.ddns_cloudflare_tokens, k, ""))])
    error_message = "Still a placeholder or empty; paste the current value from the console."
  }
}
