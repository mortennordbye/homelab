# Cloudflare: nordbye.it

Zone settings, DNS records and the edge cache rule. State lives in the shared
azurerm backend.

## Use

```bash
cp terraform.tfvars.example terraform.tfvars   # paste an API token
terraform init
terraform plan
terraform apply
```

The token needs Zone:Read, DNS:Edit, Zone Settings:Edit and Cache Rules:Edit,
in a policy scoped to zones. An account-scoped policy alone does not grant DNS.

A record added by hand in the dashboard has to be imported before Terraform will
manage it (`terraform import cloudflare_dns_record.<name> <zone_id>/<record_id>`),
otherwise apply fails with "record already exists".

## Notes

- `_acme-challenge` is not managed. cert-manager creates and deletes it.
- `ddns` content is ignored. The DDNS client owns the address.
- TXT values keep their escaped quotes, to match what the API returns.
- Token permission changes take a few minutes to propagate. Until they do, API
  calls fail intermittently. Wait rather than changing the config.
