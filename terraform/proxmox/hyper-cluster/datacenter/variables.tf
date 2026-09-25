variable "proxmox_endpoint" {
  description = "Proxmox API URL"
  type        = string
}

variable "proxmox_insecure" {
  description = "Skip TLS verification"
  type        = bool
  default     = true
}

variable "proxmox_api_token" {
  description = "Proxmox API token (user@realm!tokenid=secret)"
  type        = string
  sensitive   = true
}

variable "pbs_backup_token" {
  description = "Secret of pve@pbs!hyper-cluster, the PBS identity the pbs storage backs up as. From ../../BOOTSTRAP.md."
  type        = string
  sensitive   = true
}
