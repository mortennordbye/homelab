# Certificates

cert-manager issues one Let's Encrypt wildcard certificate per zone. All of them live in the
`cert-manager` namespace, and the Traefik Gateways reference the secrets there. Apps never
hold certificates of their own. The chart and its values are in
[`k8s/talos/infra/cert-manager/`](../../../k8s/talos/infra/cert-manager/kustomization.yaml).

## Issuer

`letsencrypt-prod` is a ClusterIssuer on the Let's Encrypt production ACME endpoint
([`letsencrypt-prod.yaml`](../../../k8s/talos/infra/cert-manager/issuers/letsencrypt-prod.yaml)).
It solves DNS-01 through Cloudflare for the zones `bigd.no`, `nordbye.it` and
`logeverylift.com`, creating and deleting the `_acme-challenge` TXT record on each issuance.

The Cloudflare token comes from the ExternalSecret `cloudflare-token-secret`
([`cloudflare-token-secret.yaml`](../../../k8s/talos/infra/cert-manager/cloudflare-token-secret.yaml)),
key `cloudflare-token`, Bitwarden id `621a3a65-abe5-4c24-9a32-b29e010850f5`. The same token
serves external-dns and the Kargo purge step; its permissions are in
[`cloudflare.md`](cloudflare.md#tokens-and-imports).

cert-manager checks DNS-01 propagation only against `1.1.1.1` and `9.9.9.9`
(`--dns01-recursive-nameservers-only`), and its pods use those two as their resolvers
(`podDnsPolicy: None`), set in
[`values.yaml`](../../../k8s/talos/infra/cert-manager/values.yaml). The cert-manager
[`ciliumnetworkpolicy.yaml`](../../../k8s/talos/infra/cert-manager/ciliumnetworkpolicy.yaml)
allows egress to `acme-v02.api.letsencrypt.org`, `api.cloudflare.com`, port 53 on the two
resolvers, kube-dns and the API server.

The only other issuers are internal to External Secrets: the self-signed ClusterIssuer
`bitwarden-bootstrap-issuer` and the CA `Issuer` `bitwarden-certificate-issuer` in
`external-secrets`, which sign the TLS certificate of the Bitwarden SDK server
([`cluster_issuer.yaml`](../../../k8s/talos/infra/external-secrets-operator/cluster_issuer.yaml),
[`bitwarden-certificate.yaml`](../../../k8s/talos/infra/external-secrets-operator/bitwarden-certificate.yaml)).
They never reach a Gateway.

## Wildcard certificates

Each certificate covers the apex and one wildcard level. Files are in
[`certificates/`](../../../k8s/talos/infra/cert-manager/certificates/bigd-no.yaml).

| Certificate | Names | Secret | Gateway listener |
| --- | --- | --- | --- |
| `bigd-no` | `bigd.no`, `*.bigd.no` | `bigd-no-tls` | `traefik-gateway-public` / `websecure` |
| `nordbye-it` | `nordbye.it`, `*.nordbye.it` | `nordbye-it-tls` | `traefik-gateway-public` / `websecure` |
| `logeverylift-com` | `logeverylift.com`, `*.logeverylift.com` | `logeverylift-com-tls` | `traefik-gateway-public` / `websecure` |
| `local-bigd-no` | `local.bigd.no`, `*.local.bigd.no` | `local-bigd-no-tls` | `traefik-gateway-private` / `local-bigd-no` |

The public `websecure` listener lists three secrets and Traefik picks one by SNI. A
hostname two levels below a zone, such as `a.b.bigd.no`, is covered by none of them;
`*.local.bigd.no` has its own certificate for that reason, validated through the `bigd.no`
zone.

## ReferenceGrant

The Gateways are in `traefik` and the secrets in `cert-manager`, so
[`reference-grant.yaml`](../../../k8s/talos/infra/cert-manager/reference-grant.yaml)
(`traefik-gateway-cert-access`) lets any Gateway in `traefik` read Secrets in
`cert-manager`. Without it the listener reports `ResolvedRefs: False` and serves no
certificate.

## Adding a certificate

1. The zone must be in Cloudflare on the account the token covers, and in the issuer's
   `dnsZones` list. Add it there if it is new.
2. Copy a file in `certificates/`, set `metadata.name`, `secretName`, `commonName` and
   `dnsNames`, and add it to `resources` in
   [`kustomization.yaml`](../../../k8s/talos/infra/cert-manager/kustomization.yaml).
3. Add the secret to the `certificateRefs` of the listener that should serve it, with
   `namespace: cert-manager`, in
   [`gateway-public.yaml`](../../../k8s/talos/infra/traefik/gateway-public.yaml) or
   [`gateway-private.yaml`](../../../k8s/talos/infra/traefik/gateway-private.yaml).

## Renewal

Let's Encrypt certificates last 90 days and cert-manager renews them 30 days before expiry
(its default, no `renewBefore` is set). `CertificateExpiringSoon` fires when any certificate
is within 7 days of expiry, and the Grafana SPOG shows readiness and days left (see
[`../observability/README.md`](../observability/README.md)).

By hand:

```bash
kubectl -n cert-manager get certificate \
  -o custom-columns=NAME:.metadata.name,READY:.status.conditions[0].status,RENEW:.status.renewalTime,EXPIRES:.status.notAfter
kubectl -n cert-manager describe certificate <name>
kubectl -n cert-manager get certificaterequest,order,challenge
kubectl -n cert-manager logs deploy/cert-manager
```

A stuck issuance usually shows on the `Challenge`: the TXT record not propagating, or a
Cloudflare API error from the token. `cmctl renew <name> -n cert-manager` forces a renewal.
