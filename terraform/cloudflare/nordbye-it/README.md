# Cloudflare: nordbye.it

Zone settings, DNS records, the HTML edge cache rule and the two Web Analytics
sites for nordbye.it and blog.nordbye.it.

## Use

State is in the shared azurerm backend under `cloudflare/nordbye-it.tfstate`.

```bash
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

`terraform.tfvars` needs `cloudflare_api_token` with Zone:Read, DNS:Edit, Zone
Settings:Edit and Cache Rules:Edit in a policy scoped to zones, plus Web
Analytics:Edit in an account-scoped one.

A record added in the dashboard has to be imported before Terraform will manage
it:

```bash
terraform import cloudflare_dns_record.<name> <zone_id>/<record_id>
```

After an apply that changes what visitors see, purge the cache from the
dashboard; promotions purge on their own.

Docs: [`docs/platform/network/cloudflare.md`](../../../docs/platform/network/cloudflare.md#nordbyeit)
