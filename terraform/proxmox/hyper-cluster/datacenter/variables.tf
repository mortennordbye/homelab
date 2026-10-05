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

variable "ssh_user" {
  description = "SSH user on hyper1-3 for the node-exporter install. Must run apt as root."
  type        = string
}

variable "ssh_password" {
  description = "Password of ssh_user on hyper1-3"
  type        = string
  sensitive   = true
}
