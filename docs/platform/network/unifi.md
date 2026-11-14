# UniFi site

`terraform/unifi/network` declares the UniFi site: networks, WAN, Wi-Fi,
adopted devices, DHCP reservations, firewall policies, port forwards, the
WireGuard server, dynamic DNS and most site settings. The console is for
reading. Changes go through Terraform. The user-defined `local.bigd.no` records
are a separate stack, see [`dns.md`](dns.md).

## Networks and Wi-Fi

| Network | VLAN | Subnet | Firewall zone | SSID |
| --- | --- | --- | --- | --- |
| Trusted | untagged | `10.3.10.0/24` | Internal | Eden-Trusted (2.4 and 5 GHz) |
| IoT | 20 | `10.3.20.0/24` | Unsecure Zone | Eden-IoT (2.4 GHz only) |
| Guest | 1000 | `192.168.100.0/24` | Hotspot | Eden-Guest (guest, L2 isolation) |

Every network gives its clients Home Assistant (`10.3.10.15`, AdGuard add-on) as
the DNS server. The primary WAN uses it too. DHCP pools run from `.6` to `.254`. The
three SSIDs are WPA2 with WPA3 transition and optional PMF.

`Internet 1` is the active WAN (DHCP, weighted, priority 1). `Internet 2` is
declared but disabled, failover-only.

## Devices

| Device | Address | Notes |
| --- | --- | --- |
| Cloud Gateway Fiber | `10.3.10.1` | router, firewall, resolver for `local.bigd.no` |
| USW-Lite-8-PoE | `10.3.10.3` | port 6 is "LG TV" with IoT as native network |
| U6+ | `10.3.10.2` | LED off; 2.4 GHz on channel 13 to stay clear of Zigbee channel 20, 5 GHz on 108 |

The cluster, NAS and PBS connect through the switch.

## Reservations

`clients.tf` holds the fixed IPs: NAS `.10`, PBS `.11`, hyper1-3 `.12`-`.14`,
Home Assistant `.15`, Hue Bridge Pro `.16`, MacBook Pro `.20` (Wi-Fi), Talos
control plane `.31`-`.33` and workers `.34`-`.36`, all on Trusted, plus the Bluetooth proxy on IoT
(`10.3.20.39`). Each Trusted reservation also sets `local_dns_record`. The
generated `<name>.local.bigd.no` records in the console come from that field.

The DHCP pool covers the reserved addresses, but the gateway never leases a reserved
address to a different MAC. A new fixed IP is therefore a reservation here, not a
manual address on the device. A manual address in the pool can collide with a
lease.

The MacBook Pro reservation uses the fixed private Wi-Fi MAC of the Mac on
Eden-Trusted, not the hardware MAC. Keep System Settings > Wi-Fi > Eden-Trusted >
Details > Private Wi-Fi address on Fixed. The Mac keeps that MAC on this network
and still uses other private MACs on other networks. Off or Rotating changes the
MAC, and the Mac then gets a normal lease instead of `.20`. If the network is
forgotten and joined again, macOS can make a new fixed MAC. Then copy the new
Wi-Fi address from the same window into `clients.tf`.

## Firewall

[![UniFi site: the internet reaches the Cloud Gateway Fiber on ports 80, 443, 32400 and 51820, which forwards to Traefik and Plex on the Trusted network; IoT devices are blocked from Trusted except DNS and 8123 to Home Assistant and per-device holes from the LG TV and Voice PE to the cluster; Guest gets internet only](../../assets/diagrams/network-unifi.svg)](../../assets/diagrams/network-unifi.svg)

The predefined Block All policies of the controller isolate IoT from Trusted. They
are not managed here. Every policy in `firewall.tf` is a hole through that block:

| Policy | From | To |
| --- | --- | --- |
| Allow Internal to Unsecure Zone | Trusted | IoT, any |
| IoT -> Home Assistant | IoT | `10.3.10.15` tcp/udp 53, 8123 |
| LG TV -> Plex | LG TV MAC | `10.3.10.103` tcp 32400 |
| LG TV -> jarvis | LG TV MAC | `10.3.10.102` (private Traefik) tcp 443 |
| Voice PE -> innestemme | Voice PE MAC | `10.3.10.99` tcp 9090 |

Home Assistant connects out to ESPHome, Hue and Sonos. Trusted therefore reaches IoT
without limits, and IoT only answers. IoT reaches Home Assistant for DNS and for TTS
audio on 8123.

A new IoT device that needs something on Trusted gets its own policy, limited to
that device (`CLIENT` plus MAC) and destination port. Never add a network-to-network
allow. That opens the whole Trusted side again. A device moved from Wi-Fi to cable
gets a new MAC, so its policy must change too, and its switch port needs the IoT
native network in `devices.tf`.

## Port forwards and remote access

| Forward | WAN port | Target |
| --- | --- | --- |
| trefik-http | 80 tcp/udp | `10.3.10.101` (public Traefik gateway) |
| trefik-https | 443 tcp/udp (UDP for HTTP/3) | `10.3.10.101` |
| plex | 32400 tcp/udp | `10.3.10.103` (Plex VIP) |

`remote-access.tf` holds the emergency fallback WireGuard server (UDP 51820, clients
in `192.168.3.0/24`) and the Cloudflare dynamic DNS clients of the gateway. The DDNS
clients keep `ddns.bigd.no` and `ddns.nordbye.it` on the current WAN address. Normal
remote access is Tailscale, see [`remote-access.md`](remote-access.md).

## Secrets in tfvars

The Wi-Fi passphrases and DDNS tokens in `terraform.tfvars` must be the values
that the controller already has. The provider writes them on every update of their
resource. A wrong passphrase disconnects that SSID, and a wrong DDNS token
stops the WAN address updates. To rotate a secret, set a new value here.

The WireGuard private key is not declared. The console never shows it. A declared
key would put the key that every peer trusts into tfvars and state.

## Provider traps

- The provider fills unset arguments with its own defaults, not with the values of
  the controller. Arguments that look redundant (`setting_preference`,
  `lte_lan`, `group_rekey`, `bss_transition`, `ap_group.ids`, `wlan_band`) are
  therefore pinned to the console values. A removed argument shows as a change in
  `plan`.
- Band steering is set on the access point (`unifi_device`), not on the WLAN. On
  `unifi_wlan`, `bandsteering_mode` is deprecated and never reaches the controller.
- Devices have `prevent_destroy`. A destroyed `unifi_device` is forgotten (unadopted).
  `config_network` is pinned on the switch and AP, so an update can never
  send an empty management address.
- `unifi_device` manages only the ports declared in `port_override`. Other ports
  keep their console settings. A removed block does not reset its port.
- Zones are data sources by name. The Default user group and the "All APs" group
  are hardcoded IDs (no data source exists). When "Unsecure Zone",
  "Internal" or "Hotspot" is renamed in the console, the plan breaks until the name
  is updated here.
- `index` on firewall policies is read-only. A new policy is added at the end of its
  zone pair. With allow-only policies the order does not matter.
- Terraform sees only what it manages. Objects created in the console stay
  invisible to `plan`.

## Site settings

`settings.tf` holds the site-level settings as one `unifi_setting`: country
(578, Norway, which decides the legal Wi-Fi channels), NTP, DPI, IPS, DNS over
HTTPS, syslog, IGMP snooping, the gateway touchscreen, network optimization,
the daily speedtest and the management settings.

- The provider writes only the declared sections, and the controller merges a
  partial section into the stored one. Fields that the provider does not model
  therefore keep their console values. This is why IPS ad blocking, DNS filtering
  and the SSH credentials under `mgmt` stay out of the repo and are not reset.
- A declared section must list every field that the provider models. Unset fields
  are sent as `false` or empty, not skipped. `mgmt`,
  `igmp_snooping` and `radius` are the exception. The provider reads the live
  section first and overlays only the declared fields.
- `usg` (conntrack timeouts, ALG modules, UPnP, mDNS) is not declared. The
  provider rebuilds it from scratch and always sends fields that it does not model,
  `mdns_enabled` and `lldp_enable_all` included. A declared section would
  switch them off.

## Rebuilding state

Everything here was created in the console first and adopted with import blocks.
If the state is lost, write a temporary `imports.tf` from the `_id`s of the
controller (`/proxy/network/api/s/default/rest/*` and
`/proxy/network/v2/api/site/default/firewall-policies`). Clients import by MAC.
Apply only when the plan reports imports and no adds or destroys. Then delete the
file.

## Not managed here

The gateway settings in the `usg` section (see above), the mDNS reflector,
Teleport, the predefined zones and their default policies, admin accounts and
backups.
