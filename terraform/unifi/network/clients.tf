# DHCP reservations. The console also derives its "Default Policies" DNS
# records from local_dns_record, so terraform/unifi/dns must not declare these.

locals {
  domain = "local.bigd.no"

  reservations = {
    nas               = { mac = "90:09:d0:74:6a:9d", ip = "10.3.10.10" }
    pbs               = { mac = "02:11:32:25:8c:d2", ip = "10.3.10.11" }
    hyper1            = { mac = "6c:24:08:28:50:8b", ip = "10.3.10.12" }
    hyper2            = { mac = "e8:6a:64:d7:22:5a", ip = "10.3.10.13" }
    hyper3            = { mac = "00:2b:67:1c:c7:29", ip = "10.3.10.14" }
    home              = { mac = "00:d0:b4:04:30:70", ip = "10.3.10.15", name = "Home Assistant" }
    hue-bridge-pro    = { mac = "c4:29:96:b8:8b:02", ip = "10.3.10.16", name = "Hue Bridge Pro" }
    adguard           = { mac = "bc:24:11:c3:9d:e7", ip = "10.3.10.25" }
    genesis-ctrl-01   = { mac = "bc:24:11:2e:c8:00", ip = "10.3.10.31" }
    genesis-ctrl-02   = { mac = "bc:24:11:2e:c8:01", ip = "10.3.10.32" }
    genesis-ctrl-03   = { mac = "bc:24:11:2e:c8:02", ip = "10.3.10.33" }
    genesis-worker-01 = { mac = "bc:24:11:2e:c8:03", ip = "10.3.10.34" }
    genesis-worker-02 = { mac = "bc:24:11:2e:c8:04", ip = "10.3.10.35" }
    genesis-worker-03 = { mac = "bc:24:11:2e:c8:05", ip = "10.3.10.36" }
    bluetooth-proxy   = { mac = "00:4b:12:a2:1a:24", ip = "10.3.20.39", name = "Bluetooth-Proxy", dns = false }
  }
}

resource "unifi_client" "reservation" {
  for_each = local.reservations

  mac              = each.value.mac
  name             = try(each.value.name, each.key)
  fixed_ip         = each.value.ip
  local_dns_record = try(each.value.dns, true) ? "${each.key}.${local.domain}" : null
}
