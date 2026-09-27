# Cloudflare: logeverylift.com

Zone settings, the apex and www records, the www redirect, SPF and DMARC, and
the Email Routing catch-all.

## Use

State is in the shared azurerm backend under `cloudflare/logeverylift-com.tfstate`.

```bash
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

`terraform.tfvars` needs `cloudflare_api_token` with Zone:Read, DNS:Edit, Zone
Settings:Edit and Cache Rules:Edit, in a policy scoped to zones.
`var.forward_to` must already be a verified Email Routing destination.

The apex and SPF records already exist and must be imported before the first
apply in a fresh state:

```bash
ZONE_ID=$(terraform output -raw zone_id)
terraform import cloudflare_dns_record.apex "$ZONE_ID/<record id>"
terraform import cloudflare_dns_record.spf  "$ZONE_ID/<record id>"
```

Docs: [`docs/platform/network/cloudflare.md`](../../../docs/platform/network/cloudflare.md#logeveryliftcom)
