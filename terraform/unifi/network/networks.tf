locals {
  # Home Assistant runs the AdGuard add-on; every network resolves through it.
  dns_server = "10.3.10.15"
}

resource "unifi_network" "trusted" {
  name             = "Trusted"
  purpose          = "corporate"
  firewall_zone_id = data.unifi_firewall_zone.internal.id
  subnet           = "10.3.10.1/24"
  domain_name      = "local.bigd.no"

  dhcp_server = {
    enabled     = true
    start       = "10.3.10.6"
    stop        = "10.3.10.254"
    dns_servers = [local.dns_server]
    leasetime   = "24h0m0s"
  }

  multicast_dns       = true
  igmp_snooping       = false
  network_isolation   = false
  internet_access     = true
  ipv6_interface_type = "none"
  lte_lan             = false
  setting_preference  = "manual"
}

resource "unifi_network" "iot" {
  name             = "IoT"
  purpose          = "corporate"
  firewall_zone_id = data.unifi_firewall_zone.iot.id
  vlan             = 20
  subnet           = "10.3.20.1/24"

  dhcp_server = {
    enabled     = true
    start       = "10.3.20.6"
    stop        = "10.3.20.254"
    dns_servers = [local.dns_server]
    leasetime   = "24h0m0s"
  }

  multicast_dns       = true
  igmp_snooping       = false
  network_isolation   = true
  internet_access     = true
  ipv6_interface_type = "none"
  lte_lan             = true
  setting_preference  = "manual"
}

resource "unifi_network" "guest" {
  name             = "Guest"
  purpose          = "guest"
  firewall_zone_id = data.unifi_firewall_zone.hotspot.id
  vlan             = 1000
  subnet           = "192.168.100.1/24"

  dhcp_server = {
    enabled     = true
    start       = "192.168.100.6"
    stop        = "192.168.100.254"
    dns_servers = [local.dns_server]
    leasetime   = "24h0m0s"
  }

  multicast_dns       = false
  igmp_snooping       = false
  network_isolation   = false
  internet_access     = true
  ipv6_interface_type = "none"
  lte_lan             = true
  setting_preference  = "manual"
}

resource "unifi_wan" "internet_1" {
  name         = "Internet 1"
  networkgroup = "WAN"
  type         = "dhcp"
  type_v6      = "disabled"
  enabled      = true

  dns = {
    preference = "manual"
    primary    = local.dns_server
  }

  load_balance = {
    type              = "weighted"
    weight            = 99
    failover_priority = 1
  }

  provider_capabilities = {
    download_kilobits_per_second = 509000
    upload_kilobits_per_second   = 350000
  }
}

resource "unifi_wan" "internet_2" {
  name         = "Internet 2"
  networkgroup = "WAN2"
  type         = "dhcp"
  type_v6      = "disabled"
  enabled      = false

  load_balance = {
    type              = "failover-only"
    failover_priority = 2
  }
}
