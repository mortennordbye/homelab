# Cloudflare: bigd.no

The `ddns.bigd.no` origin record, zone settings and the Web Analytics site for
bigd.no. App hostnames in this zone are written by external-dns, not here.

## Use

State is in the shared azurerm backend under `cloudflare/bigd-no.tfstate`.

```bash
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

`terraform.tfvars` needs `cloudflare_api_token` with Zone:Read, DNS:Edit and
Zone Settings:Edit on the zone, plus account-level Web Analytics:Edit.

`ddns.bigd.no` already exists and must be imported before the first apply in a
fresh state:

```bash
terraform import cloudflare_dns_record.ddns <zone_id>/<record_id>
```

`terraform output web_analytics_site_token` gives the beacon token for
`k8s/talos/apps/bigd/index.html`.

Docs: [`docs/platform/network/cloudflare.md`](../../../docs/platform/network/cloudflare.md#bigdno)
