resource "proxmox_storage_nfs" "nfs_vmstore" {
  id               = "nfs-vmstore"
  server           = "nas.local.bigd.no"
  export           = "/volume1/pve-vmstore"
  content          = ["images", "import", "iso", "rootdir", "snippets", "vztmpl"]
  nodes            = []
  create_base_path = true
  create_subdirs   = true
  disable          = false
}

# Backups go to PBS as pve@pbs!hyper-cluster (see ../../pbs). PBS refuses a
# backup into a group owned by another auth ID, so changing username means
# handing the existing groups over first (../../BOOTSTRAP.md).
#
# username and password force replacement in bpg/proxmox, and the recreate
# connects to PBS, so a slow or unreachable PBS leaves no storage at all.
# The password is only used at creation: a rotated token is applied with an
# in-place edit of the storage (Datacenter → Storage → pbs), not here.
resource "proxmox_storage_pbs" "pbs" {
  id          = "pbs"
  server      = "pbs.local.bigd.no"
  datastore   = "Synology"
  username    = "pve@pbs!hyper-cluster"
  password    = var.pbs_backup_token
  fingerprint = "6a:f7:97:ca:c3:b4:5d:ed:b8:31:8e:8f:f1:af:91:43:7b:d3:cf:5a:6d:e7:bd:9d:0f:4b:d9:e7:a4:b5:c6:b0"
  content     = ["backup"]
  nodes       = []
  disable     = false

  lifecycle {
    ignore_changes = [password]
  }
}
