provider "proxmox" {
  endpoint  = var.proxmox_endpoint
  insecure  = var.proxmox_insecure
  api_token = var.proxmox_api_token
}

# The Proxmox API, called directly, for what bpg/proxmox cannot manage yet.
# See notifications.tf.
provider "restapi" {
  uri      = "${trimsuffix(var.proxmox_endpoint, "/")}/api2/json"
  insecure = var.proxmox_insecure
  headers = {
    Authorization = "PVEAPIToken=${var.proxmox_api_token}"
    Content-Type  = "application/json"
  }
  id_attribute = "name"
}
