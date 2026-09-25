locals {
  nodes = toset(["hyper1", "hyper2", "hyper3"])
}

resource "proxmox_virtual_environment_dns" "node" {
  for_each = local.nodes

  node_name = each.key
  domain    = "local.bigd.no"
  servers   = ["10.3.10.1"]
}

resource "proxmox_virtual_environment_time" "node" {
  for_each = local.nodes

  node_name = each.key
  time_zone = "Europe/Oslo"
}

# No subscription: the community repo on, both enterprise repos off, or apt
# update fails with a 401 on every node.
resource "proxmox_apt_standard_repository" "no_subscription" {
  for_each = local.nodes

  node   = each.key
  handle = "no-subscription"
}

resource "proxmox_apt_repository" "pve_enterprise" {
  for_each = local.nodes

  node      = each.key
  file_path = "/etc/apt/sources.list.d/pve-enterprise.sources"
  index     = 0
  enabled   = false
}

resource "proxmox_apt_repository" "ceph_enterprise" {
  for_each = local.nodes

  node      = each.key
  file_path = "/etc/apt/sources.list.d/ceph.sources"
  index     = 0
  enabled   = false
}
