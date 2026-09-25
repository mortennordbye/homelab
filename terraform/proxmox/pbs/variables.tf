variable "pbs_endpoint" {
  description = "PBS API URL"
  type        = string
  default     = "https://pbs.local.bigd.no:8007"
}

variable "pbs_insecure" {
  description = "Skip TLS verification (PBS uses its self-signed certificate)"
  type        = bool
  default     = true
}

variable "pbs_api_token" {
  description = "Terraform's PBS token, user@realm!tokenid:secret. Created once by ../BOOTSTRAP.md."
  type        = string
  sensitive   = true
}
