# prevent_destroy on every device: destroying a unifi_device forgets (unadopts)
# it by default, and a forgotten gateway or switch takes the house offline.

resource "unifi_device" "gateway" {
  name = "Cloud Gateway Fiber"
  mac  = "94:2a:6f:f4:ab:a8"

  lifecycle {
    prevent_destroy = true
  }
}

# Ports declared here are merged into the switch's overrides; undeclared ports
# keep their console settings, and dropping a block does not reset its port.
resource "unifi_device" "usw_lite_8" {
  name = "USW-Lite-8-PoE"
  mac  = "9c:05:d6:f4:d5:40"

  forget_on_destroy = false

  # Pinned so an update can never send the switch an empty management IP; the
  # cluster, NAS and PBS all uplink through it.
  config_network = {
    type      = "static"
    ip        = "10.3.10.3"
    netmask   = "255.255.255.0"
    gateway   = "10.3.10.1"
    dns1      = "1.1.1.1"
    dns2      = "8.8.8.8"
    dnssuffix = "local.bigd.no"
  }

  # Puts the wired TV in the IoT zone, where tv_to_plex matches it.
  port_override {
    index                 = 6
    name                  = "LG TV"
    native_networkconf_id = unifi_network.iot.id
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "unifi_device" "u6_plus" {
  name = "U6+"
  mac  = "0c:ea:14:5e:d6:8f"

  led_override = "off"

  # Same reason as the switch: an update must not blank the AP's address.
  config_network = {
    type      = "static"
    ip        = "10.3.10.2"
    netmask   = "255.255.255.0"
    gateway   = "10.3.10.1"
    dns1      = "1.1.1.1"
    dns2      = "8.8.8.8"
    dnssuffix = "local.bigd.no"
  }

  # 2.4 GHz channel 13 stays clear of the ZHA network on Zigbee channel 20.
  radio_table = [
    {
      name          = "ra0"
      radio         = "ng"
      channel       = "13"
      ht            = 20
      tx_power_mode = "auto"
    },
    {
      name          = "rai0"
      radio         = "na"
      channel       = "108"
      ht            = 40
      tx_power_mode = "auto"
    },
  ]

  lifecycle {
    prevent_destroy = true
  }
}
