# The identity Proxmox VE backs up as: pve@pbs with its token hyper-cluster.
# ../BOOTSTRAP.md creates both, like every credential, because PBS shows a token
# secret only once, in the create response. This file grants their rights.
# DatastorePowerUser, not DatastoreBackup: the backup job also prunes.

# A token's effective rights are the intersection of its own ACL and its
# user's, so both need the role. PBS has one /access/acl endpoint and no
# per-entry path, which restapi_object cannot track. An idempotent PUT sets
# each entry and re-runs whenever the entry changes. Manual drift is not
# detected, and removal of an entry from here does not revoke it.
resource "terraform_data" "pve_acl" {
  for_each = toset(["pve@pbs", "pve@pbs!hyper-cluster"])

  input = {
    path    = "/datastore/${local.datastore}"
    role    = "DatastorePowerUser"
    auth_id = each.key
  }

  provisioner "local-exec" {
    command = <<-EOT
      curl -fsS ${var.pbs_insecure ? "-k" : ""} --max-time 120 -X PUT \
        "${trimsuffix(var.pbs_endpoint, "/")}/api2/json/access/acl" \
        -H "Authorization: PBSAPIToken=$PBS_TOKEN" \
        --data-urlencode "path=${self.input.path}" \
        --data-urlencode "role=${self.input.role}" \
        --data-urlencode "auth-id=${self.input.auth_id}" \
        --data-urlencode "propagate=1"
    EOT
    environment = {
      PBS_TOKEN = var.pbs_api_token
    }
  }

}

# Read-only identity for k8s/talos/infra/pbs-exporter, created by ../BOOTSTRAP.md.
# Audit on / covers Sys.Audit (host stats) and Datastore.Audit (usage, snapshots).
resource "terraform_data" "exporter_acl" {
  for_each = toset(["prometheus@pbs", "prometheus@pbs!exporter"])

  input = {
    path    = "/"
    role    = "Audit"
    auth_id = each.key
  }

  provisioner "local-exec" {
    command = <<-EOT
      curl -fsS ${var.pbs_insecure ? "-k" : ""} --max-time 120 -X PUT \
        "${trimsuffix(var.pbs_endpoint, "/")}/api2/json/access/acl" \
        -H "Authorization: PBSAPIToken=$PBS_TOKEN" \
        --data-urlencode "path=${self.input.path}" \
        --data-urlencode "role=${self.input.role}" \
        --data-urlencode "auth-id=${self.input.auth_id}" \
        --data-urlencode "propagate=1"
    EOT
    environment = {
      PBS_TOKEN = var.pbs_api_token
    }
  }
}
