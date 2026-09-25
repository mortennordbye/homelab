# The identity Proxmox VE backs up as, pve@pbs with its token hyper-cluster.
# Both are created by ../BOOTSTRAP.md, like every credential: PBS shows a token
# secret only once, in the create response. This file grants what they may do.
# DatastorePowerUser, not DatastoreBackup: the backup job also prunes.

# A token's effective rights are the intersection of its own ACL and its
# user's, so both need the role. PBS has one /access/acl endpoint and no
# per-entry path, which restapi_object cannot track, so each entry is set with
# an idempotent PUT that re-runs whenever the entry changes. Drift made by hand
# is not detected, and removing an entry from here does not revoke it.
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
