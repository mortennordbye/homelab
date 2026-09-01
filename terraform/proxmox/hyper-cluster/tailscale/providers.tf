provider "proxmox" {
  endpoint  = var.proxmox_endpoint
  insecure  = var.proxmox_insecure
  api_token = var.proxmox_api_token

  # Uploading the cloud-init snippet goes over SSH, not the API.
  ssh {
    agent    = var.proxmox_ssh_password == "" ? true : false
    username = var.proxmox_ssh_username
    password = var.proxmox_ssh_password != "" ? var.proxmox_ssh_password : null
  }
}

provider "tailscale" {
  oauth_client_id     = var.tailscale_oauth_client_id
  oauth_client_secret = var.tailscale_oauth_client_secret
}
