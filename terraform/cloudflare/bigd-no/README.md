# Cloudflare: bigd.no

The origin record and zone settings. State lives in the shared azurerm backend.

Unlike `nordbye-it` and `logeverylift-com`, this config does not manage the app
hostnames. external-dns builds them from the HTTPRoutes on the public Traefik
gateway and reverts changes made underneath it, so proxy status belongs on the
route:

```yaml
metadata:
  annotations:
    external-dns.kubernetes.io/cloudflare-proxied: "true"
```

The prefix is pinned in `k8s/talos/infra/external-dns/values.yaml`.

## Use

```bash
cp terraform.tfvars.example terraform.tfvars   # paste an API token
terraform init
terraform plan
terraform apply
```

`ddns.bigd.no` already exists, so it has to be imported before the first apply,
otherwise apply fails with "record already exists":

```bash
terraform import cloudflare_dns_record.ddns <zone_id>/<record_id>
```

## Notes

- `ddns` content is ignored. The DDNS client owns the address.
- `ddns` stays DNS-only on purpose. See the comment in `dns.tf`: proxying it
  would route every hostname pointing at it through the edge, audiobookshelf
  included.
- Not every hostname here can be proxied. `audiobookshelf` serves audio, which
  Cloudflare's terms exclude outside Enterprise. Plex is not in DNS at all; it
  is a TCPRoute on port 32400 and advertises the address to plex.tv directly.
