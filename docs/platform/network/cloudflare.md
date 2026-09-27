# Cloudflare

Three public zones and one Worker, each its own Terraform stack under
`terraform/cloudflare/` with state in the shared azurerm backend
(`cloudflare/<stack>.tfstate`).

| Stack | Manages |
| --- | --- |
| `nordbye-it` | origin record, portfolio, blog and app hostnames, mail and verification records, HTML cache rule, Web Analytics |
| `logeverylift-com` | apex and www, www redirect, SPF and DMARC, Email Routing catch-all |
| `bigd-no` | origin record and zone settings only; app hostnames belong to external-dns |
| `watchdog` | the outside-in monitoring Worker on `watchdog.bigd.no` |

## Origin and proxying

The WAN address is published through two A records, `ddns.nordbye.it` and
`ddns.bigd.no`. The UniFi gateway's DDNS client rewrites them (see
[`unifi.md`](unifi.md)), so Terraform ignores their `content`. Every web
hostname is a CNAME onto one of them; `logeverylift.com` chains across zones
onto `ddns.nordbye.it`, which works because both zones are on the same account.

`ddns.nordbye.it` is proxied, so the residential address never appears in its
zone. The DDNS client never sends the proxied flag, so it survives updates.

`ddns.bigd.no` stays DNS-only. Proxying it would route every hostname pointing
at it through the edge, audiobookshelf's audio included, which Cloudflare's
terms exclude outside Enterprise. The record publishes the residential address
as a result. For the same reason audiobookshelf's route pins
`external-dns.kubernetes.io/cloudflare-proxied: "false"`. Plex is not in DNS at
all; it is a TCPRoute on port 32400 and advertises the address to plex.tv
directly.

## Zone settings

| Setting | nordbye.it | logeverylift.com | bigd.no |
| --- | --- | --- | --- |
| SSL | Full (Strict) | Full (Strict) | Full (Strict) |
| Always Use HTTPS | on | on | on |
| Always Online | on | off | off |
| Browser cache TTL | `var.edge_cache_ttl_seconds` (4 h) | 4 h | 4 h |
| Minimum TLS | 1.0 | 1.0 | 1.0 |

Full (Strict) works because the origin serves Let's Encrypt certificates for
each zone. Always Online is on only for the static sites: a stale archived page
from an authenticated or stateful app can show one visitor a page built for
another. Minimum TLS is Cloudflare's default, declared so a dashboard change
shows up as drift.

## nordbye.it

Proxied CNAMEs to `ddns.nordbye.it`: the apex, `www`, `blog`, `gate` (reelsmith,
behind Authentik) and `headroom` (headroom-demo). Mail is Google Workspace (five
MX, SPF, DMARC `p=quarantine`). TXT records also verify two Search Console
properties (removing one un-verifies it), TikTok on `gate` (reelsmith publishing
depends on it) and an Azure App Service custom domain (`asuid`).

`_acme-challenge` is not managed: cert-manager creates and deletes it on every
DNS-01 issuance.

The cache rule edge-caches HTML for the hosts in `var.proxied_hostnames`
(apex, `www`, `blog`) for four hours, except `/api/` (the README status card
must stay fresh) and `/_next/` (fingerprinted assets keep the origin's immutable
headers, and a superseded build's 404s must not be pinned). 4xx and 5xx are
never cached. `gate` and `headroom` are proxied but left out of the rule, since
their HTML is authenticated or stateful. The zone browser TTL must stay equal to
the edge TTL; both apply only to HTML.

Portfolio and blog prod promotions purge the zone at the end (see
[`../delivery/kargo.md`](../delivery/kargo.md)), so a deploy is live at the edge
once Kargo reports it green. Anything changed outside a promotion, such as a DNS
or zone-setting apply or a redirect, still needs a manual purge from the
dashboard (Caching > Configuration > Purge Everything, or a single URL).

`web-analytics.tf` adopts the two beacon sites for nordbye.it and
blog.nordbye.it. Their tokens are in the pages (`portfolio/src/app/layout.tsx`,
`blog/config/_default/params.toml`), so `auto_install` stays off to avoid a
second, double-counting copy. Removing a resource deletes the site and its
history. The two differ in shape: nordbye.it is bound to the zone (`zone_tag`),
blog is a host-based site. Cloudflare builds that binding only at creation, so
converting blog means recreating it with a new token and no history; an omitted
`host` is sent as null and wipes the site's name.

## logeverylift.com

The apex is a proxied CNAME to `ddns.nordbye.it`. `www` exists only to not be a
dead hostname: the HTTPRoute serves the apex alone, so a dynamic redirect rule
sends `www` to the apex with a 301 before it reaches the cluster.

There is no cache rule. The app is authenticated and per-user, so its HTML must
not be cached at a shared edge; static assets are still edge-cached by
extension.

Mail is received through Cloudflare Email Routing. Its three MX records and the
DKIM TXT are read-only through the API and therefore not in Terraform. The
catch-all in `email.tf` is the writable half and forwards every address to
`var.forward_to`; left at its default (drop, disabled) the zone would accept mail
and deliver none. A new destination has to be verified through an emailed link
before the rule accepts it. DMARC is `p=none` because forwarded mail routinely
fails SPF alignment; tighten to quarantine once nothing legitimate is affected.

## bigd.no

Terraform manages only `ddns.bigd.no`, the zone settings and the Web Analytics
site for `k8s/talos/apps/bigd/index.html` (token from
`terraform output web_analytics_site_token`, `auto_install` off since the
snippet is in the page).

Every app hostname is written by external-dns from the HTTPRoutes on the public
Traefik gateway (`domainFilters: [bigd.no]`, `policy: upsert-only`, TXT registry
with prefix `extdns-%{record_type}.`, all in
`k8s/talos/infra/external-dns/values.yaml`). Set proxy status on the route, not
in Terraform:

```yaml
metadata:
  annotations:
    external-dns.kubernetes.io/cloudflare-proxied: "true"
```

`local.bigd.no` is excluded from external-dns and lives on the UniFi gateway,
see [`dns.md`](dns.md).

## Watchdog Worker

What the Worker checks and how it alerts is in
[`../observability/README.md`](../observability/README.md#alert-path). Operating
notes:

- Terraform reads the Discord webhook from Bitwarden (stored with `/slack`
  appended for Alertmanager; the Worker strips it) and writes the heartbeat URL
  back as `alertmanager-heartbeat-url`, which
  `k8s/talos/infra/kube-prometheus-stack/alertmanager-heartbeat-secret.yaml`
  reads.
- Replacing `random_password.heartbeat_token` changes the heartbeat URL.
  Terraform updates the Bitwarden secret and Alertmanager picks it up within the
  ExternalSecret's refresh.
- Cron triggers need the account to have a workers.dev subdomain (`bigd-no`),
  set by `terraform_data.workers_subdomain` with a PUT. The Worker is not served
  on it, only on the custom domain. external-dns runs upsert-only, so it leaves
  the Worker's record alone.
- `var.sites` mirrors the `public-sites` Probe in
  `k8s/talos/infra/blackbox-exporter/probe.yaml`: the probe sees the sites from
  the LAN, the Worker from the internet. A site served from Cloudflare's cache
  counts as up, as it does for visitors.
- State is one KV key per check, written only on change.

## Tokens and imports

Each zone stack takes an API token in `terraform.tfvars`, with the permissions
listed in that stack's `variables.tf`. Zone permissions must be in a policy
scoped to zones; an account-scoped policy alone does not grant DNS. Permission
changes take a few minutes to propagate, and API calls fail intermittently until
they do, so wait rather than changing the config.

In-cluster, external-dns, cert-manager and the Kargo purge step all read one
token from Bitwarden (`621a3a65-abe5-4c24-9a32-b29e010850f5`).

A record created in the dashboard must be imported before Terraform can manage
it, or apply fails with "record already exists":

```bash
terraform import cloudflare_dns_record.<name> "$(terraform output -raw zone_id)/<record_id>"
```

TXT values keep their escaped quotes, matching what the API returns; bare values
plan as a diff on every run. Proxied records must have `ttl = 1`.
