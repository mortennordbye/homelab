# The Proxmox API, called directly. See notifications.tf for why not bpg/proxmox.
provider "restapi" {
  uri      = "${trimsuffix(var.proxmox_endpoint, "/")}/api2/json"
  insecure = var.proxmox_insecure
  headers = {
    Authorization = "PVEAPIToken=${var.proxmox_api_token}"
    Content-Type  = "application/json"
  }
  id_attribute = "name"
}
