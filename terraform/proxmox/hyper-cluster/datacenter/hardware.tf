# hyper1's iGPU, passed through to the Talos worker there for Plex transcoding.
# Referenced by name from ../k8s/talos (pci_mapping).
resource "proxmox_hardware_mapping_pci" "igpu_hyper1" {
  name             = "igpu-hyper1"
  mediated_devices = false
  map = [
    {
      node         = "hyper1"
      id           = "8086:4c8b"
      subsystem_id = "17aa:31a7"
      path         = "0000:00:02.0"
      iommu_group  = 0
    },
  ]
}
