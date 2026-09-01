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
  description = "Proxmox API token"
  type        = string
  sensitive   = true
}

variable "proxmox_ssh_username" {
  description = "SSH username for snippet upload"
  type        = string
  default     = "root"
}

variable "proxmox_ssh_password" {
  description = "SSH password (empty = use agent)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "tailscale_oauth_client_id" {
  description = "OAuth client with write scope on Keys:Auth Keys (tag:subnet-router), Policy File and DNS. See README for the one-time bootstrap."
  type        = string
  sensitive   = true
}

variable "tailscale_oauth_client_secret" {
  description = "Secret for the OAuth client above"
  type        = string
  sensitive   = true
}

variable "proxmox_node" {
  description = "Proxmox node the router VM runs on"
  type        = string
  default     = "hyper1"
}

variable "vm_id" {
  description = "Proxmox VM ID. Talos nodes hold 131-136."
  type        = number
  default     = 140
}

variable "datastore" {
  description = "Datastore for the VM disk"
  type        = string
  default     = "local-lvm"
}

variable "snippets_datastore" {
  description = "Datastore holding the cloud image and cloud-init snippet. Needs the ISO image and Snippets content types; nfs-vmstore has both."
  type        = string
  default     = "nfs-vmstore"
}

variable "router_ip" {
  description = "Static LAN IP for the router VM"
  type        = string
  default     = "10.3.10.40"
}

variable "network_gateway" {
  description = "Gateway IP"
  type        = string
  default     = "10.3.10.1"
}

variable "network_subnet_mask" {
  description = "Subnet mask"
  type        = string
  default     = "24"
}

variable "advertised_routes" {
  description = "LAN routes the router advertises to the tailnet. Auto-approved via the ACL's autoApprovers."
  type        = list(string)
  default     = ["10.3.10.0/24"]
}

variable "internal_domain" {
  description = "Internal DNS zone resolved via split DNS on the tailnet"
  type        = string
  default     = "local.bigd.no"
}

variable "internal_dns_server" {
  description = "LAN nameserver answering for the internal domain"
  type        = string
  default     = "10.3.10.1"
}
