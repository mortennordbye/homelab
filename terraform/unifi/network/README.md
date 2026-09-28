# UniFi: network

The UniFi site as code: networks, WAN, Wi-Fi, devices, DHCP reservations,
firewall policies, port forwards, the WireGuard server, dynamic DNS and the
site settings. The console is for reading; changes go through here.
`local.bigd.no` records live in `../dns`.

## Use

State is in the shared azurerm backend under `unifi/network.tfstate`.

```bash
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

`terraform.tfvars` needs:

- `unifi_api_key`: a Network API key from the console at
  `/network/default/integrations` (Create New API Key, shown once).
- `wifi_passphrases` (`trusted`, `iot`, `guest`) and `ddns_cloudflare_tokens`
  (`bigd.no`, `nordbye.it`): the values the controller already has. The provider
  writes them on every update, so a wrong value disconnects an SSID or stops the
  DDNS updates.

`unifi_api_url` defaults to `https://10.3.10.1`.

Docs: [`docs/platform/network/unifi.md`](../../../docs/platform/network/unifi.md),
remote access in [`docs/platform/network/remote-access.md`](../../../docs/platform/network/remote-access.md).
