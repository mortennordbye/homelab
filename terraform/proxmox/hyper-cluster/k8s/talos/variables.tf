variable "proxmox_endpoint" {
  description = "Proxmox API URL"
  type        = string
}

variable "proxmox_api_token" {
  description = "API token (user@realm!tokenid=secret)"
  type        = string
  sensitive   = true
}

variable "proxmox_insecure" {
  description = "Skip TLS verification"
  type        = bool
  default     = true
}

variable "proxmox_ssh_username" {
  description = "SSH username"
  type        = string
  default     = "root"
}

variable "proxmox_ssh_password" {
  description = "SSH password (empty = use agent)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "proxmox_iso_storage" {
  description = "ISO storage pool"
  type        = string
  default     = "local"
}

variable "cluster_name" {
  description = "Kubernetes cluster name"
  type        = string
}

variable "proxmox_cluster_name" {
  description = "Proxmox cluster name (for CSI topology region)"
  type        = string
}

variable "cluster_vip" {
  description = "Control plane VIP"
  type        = string
}

variable "network_gateway" {
  description = "Gateway IP"
  type        = string
}

variable "network_subnet_mask" {
  description = "Subnet mask"
  type        = string
  default     = "24"
}

# Target versions: what the nodes should be running after an upgrade. These drive the installer
# image passed to `talosctl upgrade` and the --to of `talosctl upgrade-k8s`.
variable "talos_version" {
  description = "Talos version the nodes should run"
  type        = string
}

variable "kubernetes_version" {
  description = "Kubernetes version the cluster should run"
  type        = string
}

# Config contracts: the versions machine configuration is generated against. These deliberately
# lag the target versions during an upgrade.
#
# A machine config generated for a newer contract is rejected outright by older nodes. The 1.12
# contract emits machine.install.grubUseUKICmdline, and a v1.11.6 node fails the apply with
# "unknown keys found during decoding". Terraform's graph runs machine_configuration_apply before
# the upgrade steps (config apply feeds bootstrap, which feeds kubeconfig, which feeds the
# upgrades), and that order cannot be reversed without a dependency cycle. So the contracts stay
# put while the nodes are upgraded, then get raised to match in a second apply.
#
# See the two-phase flow in README.md under Upgrades.
variable "talos_config_contract" {
  description = "Talos version contract for generating machine config. Raise only after nodes are upgraded."
  type        = string
  default     = "v1.11.6"
}

variable "kubernetes_config_contract" {
  description = "Kubernetes version used in generated machine config. Raise only after upgrade-k8s has run."
  type        = string
  default     = "v1.34.0"
}

# Version contract for talos_machine_secrets, deliberately decoupled from talos_version.
# Lowering this value makes the provider replace the secrets resource, which regenerates the
# cluster CA, etcd certs and service account keys, i.e. destroys the cluster. Pinning it here
# means rolling talos_version back after a failed upgrade is survivable. Only ever raise it.
variable "talos_secrets_contract" {
  description = "Talos version contract used to generate machine secrets. Raise only, never lower."
  type        = string
  default     = "v1.11.6"
}

variable "nodes" {
  description = "Node configuration"
  type = map(object({
    proxmox_node = string
    ip           = string
    mac_address  = string
    vmid         = number
    cpu_cores    = number
    memory_mb    = number
    disk_size_gb = number
    datastore    = string
    node_type    = string

    # Name of a Proxmox cluster resource mapping to pass through as hostpci0, or null for none.
    # A mapping name is used rather than a raw PCI id because the provider's hostpci.id field is
    # incompatible with API token auth, which is how this module authenticates.
    pci_mapping = optional(string)
  }))
}

variable "enable_talos_upgrade" {
  description = "Enable Talos upgrade"
  type        = bool
  default     = false
}

variable "enable_kubernetes_upgrade" {
  description = "Enable Kubernetes upgrade"
  type        = bool
  default     = false
}
