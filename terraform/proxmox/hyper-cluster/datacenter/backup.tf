# Nightly backup of every guest to the PBS datastore on the Synology. Failures
# reach Discord through the notification matcher in notifications.tf.
resource "proxmox_backup_job" "daily" {
  id             = "backup-40e80644-aab2"
  schedule       = "03:00"
  storage        = "pbs"
  all            = true
  exclude        = ["1000"]
  mode           = "snapshot"
  compress       = "zstd"
  enabled        = true
  notes_template = "{{guestname}}"
  fleecing = {
    enabled = false
  }
  prune_backups = {
    keep-daily   = "1"
    keep-weekly  = "1"
    keep-monthly = "1"
  }
}
