# Proxmox notifications: errors (failed backups, replication, fencing) are
# posted to Alertmanager, which routes namespace="proxmox" to Discord. The
# built-in mail target and default-matcher are left as they are.
#
# Plain REST calls because bpg/proxmox has no notifications resources yet
# (bpg/terraform-provider-proxmox#2863). Proxmox wraps every response in
# {"data": ...}, so objects are read back through the list endpoint.

locals {
  # Handlebars, rendered by Proxmox per notification. The Proxmox message is
  # left out of the alert: a backup's carries the whole job log, which can
  # exceed Discord's limit and get the post rejected.
  alertmanager_webhook_body = <<-EOT
    [{"labels":{"alertname":"ProxmoxNotification","severity":"critical","namespace":"proxmox","node":"{{ fields.hostname }}","pve_severity":"{{ severity }}"},"annotations":{"summary":"{{ escape title }}","description":"Details in Datacenter → Tasks on {{ fields.hostname }}, or the notification mail."}}]
  EOT
}

resource "restapi_object" "notification_webhook_alertmanager" {
  path = "/cluster/notifications/endpoints/webhook"
  data = jsonencode({
    name    = "alertmanager"
    method  = "post"
    url     = "https://alertmanager.local.bigd.no/api/v2/alerts"
    header  = ["name=Content-Type,value=${base64encode("application/json")}"]
    body    = base64encode(trimspace(local.alertmanager_webhook_body))
    comment = "Managed by Terraform (terraform/proxmox/hyper-cluster/datacenter)"
  })
  read_search = {
    results_key  = "data"
    search_key   = "name"
    search_value = "alertmanager"
  }
  ignore_server_additions = true
}

resource "restapi_object" "notification_matcher_alertmanager" {
  path = "/cluster/notifications/matchers"
  data = jsonencode({
    name             = "alertmanager-errors"
    target           = ["alertmanager"]
    "match-severity" = ["error"]
    mode             = "all"
    comment          = "Managed by Terraform (terraform/proxmox/hyper-cluster/datacenter)"
  })
  read_search = {
    results_key  = "data"
    search_key   = "name"
    search_value = "alertmanager-errors"
  }
  ignore_server_additions = true

  depends_on = [restapi_object.notification_webhook_alertmanager]
}
