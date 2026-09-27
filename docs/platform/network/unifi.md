# UniFi site

The UniFi site is declared in `terraform/unifi/network`: networks, WAN, Wi-Fi,
adopted devices, DHCP reservations, firewall policies, port forwards, the
WireGuard server and dynamic DNS. The console is for reading; changes go through
Terraform. The user-defined `local.bigd.no` records are a separate stack, see
[`dns.md`](dns.md).

## Networks and Wi-Fi

| Network | VLAN | Subnet | Firewall zone | SSID |
| --- | --- | --- | --- | --- |
| Trusted | untagged | `10.3.10.0/24` | Internal | Eden-Trusted (2.4 and 5 GHz) |
| IoT | 20 | `10.3.20.0/24` | Unsecure Zone | Eden-IoT (2.4 GHz only) |
| Guest | 1000 | `192.168.100.0/24` | Hotspot | Eden-Guest (guest, L2 isolation) |

Every network hands out Home Assistant (`10.3.10.15`, AdGuard add-on) as its DNS
server, and so does the primary WAN. DHCP pools run from `.6` to `.254`. The
three SSIDs are WPA2 with WPA3 transition and optional PMF.

`Internet 1` is the active WAN (DHCP, weighted, priority 1). `Internet 2` is
declared but disabled, failover-only.

## Devices

| Device | Address | Notes |
| --- | --- | --- |
| Cloud Gateway Fiber | `10.3.10.1` | router, firewall, resolver for `local.bigd.no` |
| USW-Lite-8-PoE | `10.3.10.3` | port 6 is "LG TV" with IoT as native network |
| U6+ | `10.3.10.2` | LED off; 2.4 GHz on channel 13 to stay clear of Zigbee channel 20, 5 GHz on 108 |

The cluster, NAS and PBS uplink through the switch.

## Reservations

`clients.tf` holds the fixed IPs: NAS `.10`, PBS `.11`, hyper1-3 `.12`-`.14`,
Home Assistant `.15`, Hue Bridge Pro `.16`, Talos control plane `.31`-`.33` and
workers `.34`-`.36`, all on Trusted, plus the Bluetooth proxy on IoT
(`10.3.20.39`). Each Trusted reservation also sets `local_dns_record`, which is
where the console's generated `<name>.local.bigd.no` records come from.

## Firewall

IoT is isolated from Trusted by the controller's predefined Block All policies,
which are not managed here. Every policy in `firewall.tf` is a hole through that
block:

| Policy | From | To |
| --- | --- | --- |
| Allow Internal to Unsecure Zone | Trusted | IoT, any |
| IoT -> Home Assistant | IoT | `10.3.10.15` tcp/udp 53, 8123 |
| LG TV -> Plex | LG TV MAC | `10.3.10.103` tcp 32400 |

Home Assistant dials out to ESPHome, Hue and Sonos, so Trusted reaches IoT freely
and IoT only answers. IoT reaches Home Assistant for DNS and for TTS audio on
8123.

A new IoT device that needs something on Trusted gets its own policy, scoped to
that device (`CLIENT` plus MAC) and destination port. Never a network-to-network
allow: that reopens the whole Trusted side. A device moved from Wi-Fi to cable
gets a new MAC, so its policy has to follow, and its switch port needs the IoT
native network in `devices.tf`.

## Port forwards and remote access

| Forward | WAN port | Target |
| --- | --- | --- |
| trefik-http | 80 tcp/udp | `10.3.10.101` (public Traefik gateway) |
| trefik-https | 443 tcp/udp (UDP for HTTP/3) | `10.3.10.101` |
| plex | 32400 tcp/udp | `10.3.10.103` (Plex VIP) |

`remote-access.tf` holds the break-glass WireGuard server (UDP 51820, clients in
`192.168.3.0/24`) and the gateway's Cloudflare dynamic DNS clients, which keep
`ddns.bigd.no` and `ddns.nordbye.it` on the current WAN address. Day-to-day
remote access is Tailscale, see [`remote-access.md`](remote-access.md).

## Secrets in tfvars

The Wi-Fi passphrases and DDNS tokens in `terraform.tfvars` must be the values
the controller already has. The provider writes them on every update of their
resource, so a wrong passphrase disconnects that SSID and a wrong DDNS token
stops the WAN address updates. A new value here is how a secret is rotated.

The WireGuard private key is not declared. The console never shows it, and
declaring it would put the key every peer trusts into tfvars and state.

## Provider traps

- The provider fills unset arguments with its own defaults rather than the
  controller's, so arguments that look redundant (`setting_preference`,
  `lte_lan`, `group_rekey`, `bss_transition`, `ap_group_ids`, `wlan_band`) are
  pinned to the console's values. Removing one shows up as a change in `plan`.
- `bandsteering_mode` must stay declared on every WLAN. Unset, it plans as
  unknown on every run and re-pushes the SSID, dropping every client.
- Devices have `prevent_destroy`: destroying a `unifi_device` forgets (unadopts)
  it. `config_network` is pinned on the switch and AP so an update can never
  send an empty management address.
- `unifi_device` manages only the ports declared in `port_override`. Other ports
  keep their console settings, and dropping a block does not reset its port.
- Zones are data sources by name, and the Default user group and "All APs" group
  are hardcoded IDs (no data source exists). Renaming "Unsecure Zone",
  "Internal" or "Hotspot" in the console breaks the plan until the name follows.
- `index` on firewall policies is read-only; a new policy lands at the end of its
  zone pair. With allow-only policies the order is moot.
- Terraform sees only what it manages. Things created in the console stay
  invisible to `plan`.

## Rebuilding state

Everything here was created in the console first and adopted with import blocks.
If the state is ever lost, write a temporary `imports.tf` from the controller's
`_id`s (`/proxy/network/api/s/default/rest/*` and
`/proxy/network/v2/api/site/default/firewall-policies`); clients import by MAC.
Apply only when the plan reports imports and no adds or destroys, then delete the
file.

## Not managed here

Site settings (country, NTP, IGMP, DPI, IPS, speedtest; `unifi_setting` imports
empty, see `docs/backlog/README.md`), the mDNS reflector, Teleport, the
predefined zones and their default policies, admin accounts and backups.
