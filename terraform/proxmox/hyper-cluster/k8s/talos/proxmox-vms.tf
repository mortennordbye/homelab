resource "proxmox_virtual_environment_vm" "talos_nodes" {
  for_each = var.nodes

  name        = each.key
  node_name   = each.value.proxmox_node
  migrate     = true
  vm_id       = each.value.vmid
  description = "Talos Kubernetes ${each.value.node_type == "controlplane" ? "Control Plane" : "Worker"} Node"
  tags        = ["kubernetes", "talos", each.value.node_type]
  on_boot     = true

  machine       = "q35"
  scsi_hardware = "virtio-scsi-single"
  bios          = "seabios"

  agent {
    enabled = true
  }

  cpu {
    cores = each.value.cpu_cores
    type  = "host"
  }

  memory {
    dedicated = each.value.memory_mb
  }

  network_device {
    bridge      = "vmbr0"
    mac_address = each.value.mac_address
  }

  disk {
    datastore_id = each.value.datastore
    interface    = "scsi0"
    size         = each.value.disk_size_gb
    file_format  = "raw"
    iothread     = true
    cache        = "writethrough"
    discard      = "on"
    ssd          = true
    file_id      = proxmox_download_file.talos_image[each.value.proxmox_node].id
  }

  # Optional PCI passthrough, currently the hyper1 iGPU for Plex QuickSync. Exclusive: Rocket Lake
  # is Gen12 and has no GVT-g or SR-IOV, so the device belongs to exactly one VM.
  dynamic "hostpci" {
    for_each = each.value.pci_mapping != null ? [each.value.pci_mapping] : []

    content {
      device  = "hostpci0"
      mapping = hostpci.value
      pcie    = true
    }
  }

  boot_order = ["scsi0"] # Boot from disk only

  operating_system {
    type = "l26"
  }

  initialization {
    datastore_id = each.value.datastore

    ip_config {
      ipv4 {
        address = "${each.value.ip}/${var.network_subnet_mask}"
        gateway = var.network_gateway
      }
    }
  }

  lifecycle {
    ignore_changes = [
      disk[0].file_id, # Upgrades via talosctl
    ]
  }
}
