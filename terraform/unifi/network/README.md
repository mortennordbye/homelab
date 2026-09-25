# UniFi: network

The UniFi site as code: networks, WAN, Wi-Fi, devices, DHCP reservations,
firewall policies, port forwards, the WireGuard server and dynamic DNS. The
console is for reading; changes go through here. DNS records live in
`../dns`. State lives in the shared azurerm backend under `unifi/network.tfstate`.

| File               | Contents                                                  |
| ------------------ | --------------------------------------------------------- |
| `networks.tf`      | Trusted, IoT (VLAN 20), Guest (VLAN 1000), Internet 1/2   |
| `wifi.tf`          | Eden-Trusted, Eden-IoT (2.4 GHz only), Eden-Guest (WPA)   |
| `devices.tf`       | gateway, USW-Lite-8-PoE (port overrides), U6+ radios      |
| `clients.tf`       | DHCP reservations and their `local.bigd.no` names         |
| `firewall.tf`      | zone policies between Trusted and IoT                     |
| `port-forwards.tf` | 80/443 to Traefik, 32400 to Plex                          |
| `remote-access.tf` | WireGuard server (break-glass), Cloudflare DDNS           |

## Use

```bash
cp terraform.tfvars.example terraform.tfvars   # API key + current secrets
terraform init
terraform plan
terraform apply
```

The secrets in `terraform.tfvars` must be the values the controller already
has. The provider writes them on every update of their resource, so a wrong
Wi-Fi passphrase disconnects that SSID and a wrong DDNS token stops the WAN
address updates.

## Firewall

IoT is isolated from Trusted by the controller's predefined Block All policies,
which are not managed here. Every policy in `firewall.tf` is a hole through that
block and names one host and port on the Trusted side:

| Policy                          | From      | To                         |
| ------------------------------- | --------- | -------------------------- |
| Allow Internal to Unsecure Zone | Trusted   | IoT, any                   |
| IoT -> Home Assistant           | IoT       | 10.3.10.15 tcp/udp 53,8123 |
| LG TV -> Plex                   | LG TV MAC | 10.3.10.103 tcp 32400      |

A new IoT device that needs something on Trusted gets its own policy, scoped to
that device (`CLIENT` + MAC) and destination port. Never a network-to-network
allow: that reopens the whole Trusted side. A device moved from Wi-Fi to cable
gets a new MAC, so its policy has to follow, and its switch port needs the IoT
native network in `devices.tf`.

## Import (in progress)

Everything was created in the console first and is adopted by `imports.tf`.
Delete that file after the first apply. If the state is ever lost, rebuild the
import blocks from the controller's `_id`s (`/proxy/network/api/s/default/rest/*`
and `/proxy/network/v2/api/site/default/firewall-policies`); clients import by
MAC. Confirm the plan reports imports and no adds or destroys before applying.

## Notes

- The provider fills unset arguments with its own defaults rather than the
  controller's, so several arguments that look redundant (`setting_preference`,
  `lte_lan`, `group_rekey`, `bss_transition`, `ap_group_ids`, `wlan_band`) are
  pinned to what the console had. Removing one shows up as a change in `plan`.
- The WireGuard private key is deliberately not declared. The console never
  shows it, the import leaves it untouched, and declaring it would put the key
  that every peer trusts into tfvars and state for no gain.
- Devices have `prevent_destroy`: destroying a `unifi_device` forgets (unadopts)
  it. `config_network` is pinned on the switch and AP so an update can never
  send an empty management address.
- `unifi_device` manages only the ports declared in `port_override`. The other
  ports keep their console settings, and dropping a block does not reset its
  port.
- Zones are data sources by name, and so are the Default user group and "All
  APs" group (as IDs, no data source exists). Renaming "Unsecure Zone",
  "Internal" or "Hotspot" in the console breaks the plan until the name follows.
- `index` on firewall policies is read-only in the provider; new policies land
  at the end of their zone pair. With allow-only policies the order is moot.
- Terraform sees only what it manages. Things created in the console stay
  invisible to `plan`.

## Not managed here

Site settings (country, NTP, IGMP, DPI, IPS, speedtest; `unifi_setting` imports
empty, see `BACKLOG.md`), the mDNS reflector, Teleport, the predefined zones and
their default policies, admin accounts and backups.
