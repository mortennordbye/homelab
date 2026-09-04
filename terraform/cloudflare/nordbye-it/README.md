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
in a policy scoped to zones, plus Web Analytics:Edit in an account-scoped one.
An account-scoped policy alone does not grant DNS.
It is the same token external-dns, cert-manager and the Kargo purge step read
from Bitwarden, so it also carries Cache Purge, which nothing here needs.

A record added by hand in the dashboard has to be imported before Terraform will
manage it (`terraform import cloudflare_dns_record.<name> <zone_id>/<record_id>`),
otherwise apply fails with "record already exists".

## Publishing

The edge caches HTML for 4 hours. Promotions handle this themselves: the prod
Stages for portfolio and blog end with an `http` promotion step that POSTs
`purge_everything` to this zone, so a deploy is live at the edge as soon as
Kargo reports the promotion green. See `k8s/talos/infra/kargo-projects/`.

That covers content shipped inside an image. Anything changed outside a
promotion — a DNS or zone-setting apply here, a redirect — still needs a manual
purge from the dashboard (Caching → Configuration → Purge Everything, or purge
the single URL).

The purge step reads a `cloudflare-api-token` Secret in each Kargo Project
namespace — the shared broad token, not a purge-only one. It resolves the zone
ID by name at promotion time rather than carrying it, so nothing has to be
updated here if the zone is ever recreated.

## Web Analytics

`web-analytics.tf` adopts the two beacon sites that back nordbye.it and
blog.nordbye.it. Their tokens are hardcoded in the pages
(`portfolio/src/app/layout.tsx`, `blog/config/_default/params.toml`); an
in-place update leaves those tokens alone.

The two are not the same shape and cannot be made so. nordbye.it is bound to
the zone (`zone_tag`, orange in the dashboard); blog is a gray-clouded site
carrying a `host`. Cloudflare only builds that binding when a site is created,
so converting blog means recreating it, with a new token and no history. The
difference is cosmetic while the beacon is in the page.

## Notes

- `_acme-challenge` is not managed. cert-manager creates and deletes it.
- `ddns` content is ignored. The DDNS client owns the address.
- TXT values keep their escaped quotes, to match what the API returns.
- Token permission changes take a few minutes to propagate. Until they do, API
  calls fail intermittently. Wait rather than changing the config.
