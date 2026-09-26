# The Proxmox CSI driver's identity. Every proxmox-local PVC in the cluster is
# attached through it. Its API token lives in the cluster, not here.
# terraform-prov@pve is deliberately not managed: a bad apply could remove the
# access this stack runs with.
resource "proxmox_virtual_environment_user" "kubernetes_csi" {
  user_id         = "kubernetes-csi@pve"
  enabled         = true
  expiration_date = "1970-01-01T00:00:00Z"
  groups          = []
}

resource "proxmox_virtual_environment_role" "csi" {
  role_id    = "CSI"
  privileges = ["Datastore.Allocate", "Datastore.AllocateSpace", "Datastore.Audit", "Sys.Audit", "VM.Audit", "VM.Config.Disk"]
}

resource "proxmox_acl" "kubernetes_csi" {
  path      = "/"
  user_id   = proxmox_virtual_environment_user.kubernetes_csi.user_id
  role_id   = proxmox_virtual_environment_role.csi.role_id
  propagate = true
}

# Read-only identity for prometheus-pve-exporter (k8s/talos/infra/pve-exporter).
# Copy its token into Bitwarden as proxmox-exporter-token after apply.
resource "proxmox_virtual_environment_user" "prometheus" {
  user_id         = "prometheus@pve"
  enabled         = true
  expiration_date = "1970-01-01T00:00:00Z"
  groups          = []
}

resource "proxmox_acl" "prometheus" {
  path      = "/"
  user_id   = proxmox_virtual_environment_user.prometheus.user_id
  role_id   = "PVEAuditor"
  propagate = true
}

resource "proxmox_user_token" "prometheus" {
  user_id               = proxmox_virtual_environment_user.prometheus.user_id
  token_name            = "exporter"
  comment               = "prometheus-pve-exporter"
  privileges_separation = false
}

output "prometheus_exporter_token" {
  description = "user@realm!token=secret for prometheus-pve-exporter; store in Bitwarden as proxmox-exporter-token."
  value       = proxmox_user_token.prometheus.value
  sensitive   = true
}
