# PBS errors (failed garbage collection, prune, verify) go to Alertmanager and
# from there to Discord, the same path as ../hyper-cluster/datacenter. The
# builtin default-matcher only matches info, so without this an error reaches
# nobody. node is fixed: not every PBS notification carries a hostname field.
locals {
  alertmanager_webhook_body = <<-EOT
    [{"labels":{"alertname":"ProxmoxNotification","severity":"critical","namespace":"proxmox","node":"pbs","pve_severity":"{{ severity }}"},"annotations":{"summary":"{{ escape title }}","description":"Details in the PBS task log (pbs.local.bigd.no:8007), or the notification mail."}}]
  EOT
}

resource "restapi_object" "notification_webhook_alertmanager" {
  path         = "/config/notifications/endpoints/webhook"
  id_attribute = "name"
  data = jsonencode({
    name    = "alertmanager"
    method  = "post"
    url     = "https://alertmanager.local.bigd.no/api/v2/alerts"
    header  = ["name=Content-Type,value=${base64encode("application/json")}"]
    body    = base64encode(trimspace(local.alertmanager_webhook_body))
    comment = "Managed by Terraform (terraform/proxmox/pbs)"
  })
  read_search = {
    results_key  = "data"
    search_key   = "name"
    search_value = "alertmanager"
  }
  ignore_server_additions = true
}

resource "restapi_object" "notification_matcher_alertmanager" {
  path         = "/config/notifications/matchers"
  id_attribute = "name"
  data = jsonencode({
    name             = "alertmanager-errors"
    target           = ["alertmanager"]
    "match-severity" = ["error"]
    mode             = "all"
    comment          = "Managed by Terraform (terraform/proxmox/pbs)"
  })
  read_search = {
    results_key  = "data"
    search_key   = "name"
    search_value = "alertmanager-errors"
  }
  ignore_server_additions = true

  depends_on = [restapi_object.notification_webhook_alertmanager]
}
