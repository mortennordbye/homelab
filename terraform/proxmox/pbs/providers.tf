# The PBS API, called directly: no maintained Terraform provider covers
# Proxmox Backup Server. PBS wraps every response in {"data": ...}, so objects
# are read back through their list endpoint with read_search.
provider "restapi" {
  uri      = "${trimsuffix(var.pbs_endpoint, "/")}/api2/json"
  insecure = var.pbs_insecure
  # PBS answers slowly while garbage collection saturates the NFS share; the
  # provider's default gives up mid-write and leaves objects created but
  # untracked.
  timeout = 120
  headers = {
    Authorization = "PBSAPIToken=${var.pbs_api_token}"
    Content-Type  = "application/json"
  }
}
