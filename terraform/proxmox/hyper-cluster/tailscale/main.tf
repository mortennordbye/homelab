resource "proxmox_download_file" "debian_image" {
  node_name    = var.proxmox_node
  content_type = "iso"
  datastore_id = var.snippets_datastore
  # The .img extension makes Proxmox accept a qcow2 as an importable disk image.
  file_name = "debian-13-genericcloud-amd64.img"
  url       = "https://cloud.debian.org/images/cloud/trixie/latest/debian-13-genericcloud-amd64.qcow2"
  overwrite = false

  lifecycle {
    ignore_changes = [url] # "latest" moves; the VM keeps the image it booted from
  }
}

resource "proxmox_virtual_environment_file" "cloud_init" {
  node_name    = var.proxmox_node
  content_type = "snippets"
  datastore_id = var.snippets_datastore

  source_raw {
    file_name = "tailscale-router-cloud-init.yaml"
    data = templatefile("${path.module}/cloud-init.yaml.tftpl", {
      authkey = tailscale_tailnet_key.router.key
      routes  = join(",", var.advertised_routes)
    })
  }
}

resource "proxmox_virtual_environment_vm" "tailscale_router" {
  name        = "tailscale-router"
  node_name   = var.proxmox_node
  vm_id       = var.vm_id
  description = "Tailscale subnet router: advertises the LAN to the tailnet"
  tags        = ["tailscale"]
  on_boot     = true

  machine       = "q35"
  scsi_hardware = "virtio-scsi-single"
  bios          = "seabios"

  agent {
    enabled = true
  }

  cpu {
    cores = 1
    type  = "host"
  }

  memory {
    dedicated = 1024
  }

  network_device {
    bridge = "vmbr0"
  }

  disk {
    datastore_id = var.datastore
    interface    = "scsi0"
    size         = 10
    file_format  = "raw"
    discard      = "on"
    ssd          = true
    file_id      = proxmox_download_file.debian_image.id
  }

  boot_order = ["scsi0"]

  # Debian cloud images log to the serial console.
  serial_device {}

  operating_system {
    type = "l26"
  }

  initialization {
    datastore_id      = var.datastore
    user_data_file_id = proxmox_virtual_environment_file.cloud_init.id

    ip_config {
      ipv4 {
        address = "${var.router_ip}/${var.network_subnet_mask}"
        gateway = var.network_gateway
      }
    }
  }
}
