# User-defined zone policies. The controller's predefined policies (the
# Block All defaults between zones) are not managed here; every policy below is
# a hole punched through one of them, so each should name one host and port.
#
# The provider cannot set `index`: a new policy is appended to its zone pair and
# reordering happens in the console only. Allow-only policies make order moot.

locals {
  home_assistant = "10.3.10.15"

  # Cilium LB-IPAM VIP from k8s/talos/apps/plex-media-stack/plex.yaml. The WAN
  # port forward for 32400 lands here too, so hairpinned traffic matches.
  plex = "10.3.10.103"

  lg_tv_mac = "58:96:0a:9e:e9:e2"
}

data "unifi_firewall_zone" "internal" {
  name = "Internal"
}

data "unifi_firewall_zone" "iot" {
  name = "Unsecure Zone"
}

data "unifi_firewall_zone" "hotspot" {
  name = "Hotspot"
}

# Home Assistant dials out to ESPHome (6053), Hue, Sonos and the rest, so the
# trusted side reaches IoT freely and IoT only ever answers.
resource "unifi_firewall_policy" "trusted_to_iot" {
  name                 = "Allow Internal to Unsecure Zone"
  action               = "ALLOW"
  protocol             = "all"
  ip_version           = "BOTH"
  create_allow_respond = true

  source = {
    zone_id         = data.unifi_firewall_zone.internal.id
    matching_target = "NETWORK"
    network_ids     = [unifi_network.trusted.id]
  }

  destination = {
    zone_id         = data.unifi_firewall_zone.iot.id
    matching_target = "ANY"
  }
}

# IoT DHCP hands out Home Assistant as its DNS server (AdGuard add-on), and
# ESPHome voice satellites fetch TTS audio from HA over 8123.
resource "unifi_firewall_policy" "iot_to_home_assistant" {
  name                 = "IoT -> Home Assistant"
  action               = "ALLOW"
  protocol             = "tcp_udp"
  ip_version           = "BOTH"
  create_allow_respond = true

  source = {
    zone_id         = data.unifi_firewall_zone.iot.id
    matching_target = "NETWORK"
    network_ids     = [unifi_network.iot.id]
  }

  destination = {
    zone_id            = data.unifi_firewall_zone.internal.id
    matching_target    = "IP"
    ips                = [local.home_assistant]
    port_matching_type = "SPECIFIC"
    port               = "53,8123"
  }
}

resource "unifi_firewall_policy" "tv_to_plex" {
  name                 = "LG TV -> Plex"
  action               = "ALLOW"
  protocol             = "tcp"
  ip_version           = "BOTH"
  create_allow_respond = true
  logging              = true

  source = {
    zone_id         = data.unifi_firewall_zone.iot.id
    matching_target = "CLIENT"
    client_macs     = [local.lg_tv_mac]
  }

  destination = {
    zone_id            = data.unifi_firewall_zone.internal.id
    matching_target    = "IP"
    ips                = [local.plex]
    port_matching_type = "SPECIFIC"
    port               = "32400"
  }
}
