# Internal DNS: local.bigd.no

`local.bigd.no` is the LAN-only half of a split horizon. The UniFi gateway's
resolver (`10.3.10.1`) serves it, shown in the console under Settings > Policy
Table > DNS Records. The public half is the `bigd.no` zone in Cloudflare, see
[`cloudflare.md`](cloudflare.md).

## Who writes what

| Records | Written by |
| --- | --- |
| Gateway VIPs and app aliases (user-defined) | `terraform/unifi/dns/records.tf` |
| Host names for fixed-IP clients (console "Default Policies") | generated from the DHCP reservations in `terraform/unifi/network/clients.tf` |
| Public `*.bigd.no` app hostnames | external-dns, in Cloudflare |

external-dns must never write this zone. `k8s/talos/infra/external-dns/values.yaml`
lists `local.bigd.no` under `excludeDomains`, so an internal hostname cannot leak
into the public zone even if a route slips the gateway filter. Do not remove it.

## Records

`records.tf` declares two sets:

- `local.vips`: A records for the Cilium LB-IPAM VIPs, `traefik-gateway-public`
  (`10.3.10.101`), `traefik-gateway-private` (`10.3.10.102`) and `plex`
  (`10.3.10.103`). These are VIPs, not hosts; if one is reassigned in
  `k8s/talos/infra/cilium`, the map has to follow.
- `local.aliases`: CNAMEs to `traefik-gateway-private.local.bigd.no`, one per
  HTTPRoute attached to `gateway-private`.

Adding an internal app means adding its name to `local.aliases`. The list is
hand-maintained; nothing reconciles it with the HTTPRoutes.

## Generated host records

The console also lists records it generates from DHCP reservations (`nas`, `pbs`,
`hyper1`-`hyper3`, `home`, `hue-bridge-pro`, the six `genesis-*` nodes). They
are absent from both the `static-dns` API and the newer `dns/policies` API, so
there is nothing to import. Declaring one in `records.tf` would create a second,
user-defined record shadowing the generated one. Rename or renumber those in
`clients.tf` instead.

## Provider notes

- `ttl` is unset everywhere. The console stores "Auto" as 0 and the provider maps
  0 to a null TTL, so setting a TTL would show as a change against every record.
- `site` and `enabled` are unset too. Both are Optional+Computed and settle on
  the controller's values.
- The provider talks to the undocumented `v2/api/site/<site>/static-dns`
  endpoint. The official `integration/v1/sites/<id>/dns/policies` API returns
  the same records but no Terraform provider implements it. A firmware release
  that drops the v2 route breaks this stack, and the `filipowm/unifi` fork uses
  the same route, so switching provider is not the fix.

## Rebuilding state

`name` forces replacement, so applying into a populated controller without
state recreates live records instead of adopting them. If the state is lost,
list the records and write a temporary `imports.tf`:

```bash
curl -sk -H "X-API-KEY: $KEY" \
  https://10.3.10.1/proxy/network/v2/api/site/default/static-dns
```

Each `_id` becomes `id` in an `import` block addressing
`unifi_dns_record.vip["<name>"]` or `unifi_dns_record.alias["<name>"]`. Apply
only when the plan reports imports and no adds, changes or destroys, then delete
the file.
