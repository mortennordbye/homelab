# Cloudflare: logeverylift.com

Zone settings, DNS records and the www redirect. State lives in the shared
azurerm backend.

No cache rule: the app is authenticated and per-user, so its HTML must not be
cached at a shared edge. Static assets are still edge-cached by extension.

## Use

```bash
cp terraform.tfvars.example terraform.tfvars   # paste an API token
terraform init
terraform plan
terraform apply
```

The token needs Zone:Read, DNS:Edit, Zone Settings:Edit and Cache Rules:Edit,
in a policy scoped to zones. An account-scoped policy alone does not grant DNS.

The apex and SPF records already exist and must be imported before the first
apply, otherwise it fails with "record already exists":

```bash
ZONE_ID=$(terraform output -raw zone_id)
terraform import cloudflare_dns_record.apex "$ZONE_ID/<record id>"
terraform import cloudflare_dns_record.spf  "$ZONE_ID/<record id>"
```

## Notes

- The three MX records and the DKIM TXT are not managed. Cloudflare Email
  Routing owns them and the API rejects writes. The catch-all is the writable
  half and lives in `email.tf`; it forwards every address to `var.forward_to`.
  A new destination has to be verified through an emailed link before the rule
  will accept it.
- TXT values keep their escaped quotes, to match what the API returns.
- DMARC is `p=none` on purpose. Email Routing forwards mail, and forwarded mail
  routinely fails SPF alignment. Tighten to quarantine once monitoring is clean.
- Token permission changes take a few minutes to propagate. Until they do, API
  calls fail intermittently.
