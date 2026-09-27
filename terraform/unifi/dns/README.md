# UniFi: local.bigd.no

The user-defined records in the internal `local.bigd.no` zone served by the
UniFi gateway's resolver: A records for the gateway VIPs and a CNAME per app on
the private Traefik gateway. A new internal app is a name in `local.aliases` in
`records.tf`.

## Use

State is in the shared azurerm backend under `unifi/dns.tfstate`.

```bash
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

`terraform.tfvars` needs `unifi_api_key`, a Network API key from the console at
`/network/default/integrations` (Create New API Key, shown once). It bypasses
2FA, so no local-only admin account is needed. `unifi_api_url` defaults to
`https://10.3.10.1`.

Never apply into a populated controller without state: `name` forces
replacement. The import procedure is in the docs.

Docs: [`docs/platform/network/dns.md`](../../../docs/platform/network/dns.md)
