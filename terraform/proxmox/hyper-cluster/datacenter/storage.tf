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
