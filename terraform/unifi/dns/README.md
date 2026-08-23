# UniFi: local.bigd.no

The 27 user-defined records in the internal split-horizon zone served by the
UniFi gateway's resolver, shown in the console under Settings > Policy Table >
DNS Records. State lives in the shared azurerm backend.

This is the counterpart to `terraform/cloudflare/bigd-no`. That zone is public
and external-dns writes the app hostnames into it; this one is LAN-only and
external-dns is barred from it by `excludeDomains: [local.bigd.no]` in
`k8s/talos/infra/external-dns/values.yaml`. Nothing else writes the user-defined
records, so Terraform can own all of them - but see the scope note below for the
14 records the console shows that Terraform deliberately does not manage.

## Use

```bash
cp terraform.tfvars.example terraform.tfvars   # paste an API key
terraform init
terraform plan
terraform apply
```

The API key comes from the console at `/network/default/integrations` (left nav:
Integrations) via **Create New API Key**. It is shown once. A key bypasses 2FA,
so it does not need the local-only limited admin account the provider README
suggests. Note this is a Network API key, not the per-admin UniFi OS key.

## Import (done)

The 27 records already existed in the controller and were adopted with a
one-shot `imports.tf`, since removed. The apply reported `27 imported, 0 added,
0 changed, 0 destroyed` and the controller was byte-identical afterwards.

If the state is ever lost, rebuild that file rather than applying into a
populated controller - `name` carries `RequiresReplace`, so an apply without
import blocks recreates live records instead of adopting them:

```bash
curl -sk -H "X-API-KEY: $KEY" \
  https://10.3.10.1/proxy/network/v2/api/site/default/static-dns
```

Each `_id` becomes `id` in an `import` block addressing
`unifi_dns_record.vip["<name>"]` or `.alias["<name>"]`. Confirm the plan reports
imports and no adds, changes or destroys before applying.

## Scope: 27 records, not the 41 the console shows

The console's DNS Records view counts 41 because "View Default Policies (14)" is
on. Those 14 are generated from DHCP fixed-IP reservations - `nas`, `pbs`,
`hyper1`-`hyper3`, `home`, `hue-bridge-pro`, `adguard`, `genesis-ctrl-01..03`,
`genesis-worker-01..03`. They are absent from both the legacy `static-dns` API
and the newer `dns/policies` API, which return the same 27 `USER_DEFINED`
records, so there is nothing to import. Declaring one here would create a second,
user-defined record shadowing the generated one. Rename or renumber those in the
DHCP reservation instead.

## Notes

- `ttl` is unset everywhere on purpose. The console stores "Auto" as 0 and the
  provider maps 0 to a null TTL, so setting a TTL would show as a change against
  every existing record.
- `site` and `enabled` are likewise unset. Both are Optional+Computed and settle
  on the controller's own values.
- Adding an app means adding a name to `local.aliases` in `records.tf`. That
  list is hand-maintained and mirrors the HTTPRoutes attached to
  `gateway-private`; nothing reconciles the two automatically.
- The three `.10x` addresses are Cilium LB-IPAM VIPs, not hosts. If a VIP is
  reassigned in `k8s/talos/infra/cilium`, `local.vips` has to follow.
- The provider talks to the undocumented `v2/api/site/<site>/static-dns` endpoint
  (`go-unifi/unifi/dns_record.generated.go`), which this firmware still serves.
  Network 10.1 added an official `network/integration/v1/sites/<id>/dns/policies`
  API - verified present here, returning the same 27 records - and no Terraform
  provider implements it yet. A future release that drops the v2 route would
  break this module, and the `filipowm/unifi` fork uses the same route, so
  switching provider is not the fix if that happens.
