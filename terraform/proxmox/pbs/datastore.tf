locals {
  datastore = "Synology"
}

# The datastore on the Synology NFS share 10.3.10.10:/volume1/pve-backup,
# mounted at /mnt/synology. Only its schedules and notification mode are
# managed; the path is fixed at creation. Garbage collection refuses to run if
# anything in that path is unreadable by the backup user, so nothing but PBS
# may write there: never point a Proxmox VE storage at this share.
resource "restapi_object" "datastore" {
  path         = "/config/datastore"
  id_attribute = "name"
  data = jsonencode({
    name              = local.datastore
    comment           = "Synology mount"
    gc-schedule       = "daily"
    notification-mode = "notification-system"
  })
  read_search = {
    results_key  = "data"
    search_key   = "name"
    search_value = local.datastore
  }
  ignore_server_additions = true
}

resource "restapi_object" "prune_daily" {
  path         = "/config/prune"
  id_attribute = "id"
  data = jsonencode({
    id           = "default-Synology-380f8064-0478-4"
    store        = local.datastore
    schedule     = "daily"
    keep-daily   = 1
    keep-weekly  = 1
    keep-monthly = 1
  })
  read_search = {
    results_key  = "data"
    search_key   = "id"
    search_value = "default-Synology-380f8064-0478-4"
  }
  ignore_server_additions = true
}
