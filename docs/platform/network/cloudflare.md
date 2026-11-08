# Cloudflare

Three public zones and one Worker. Each is its own Terraform stack under
`terraform/cloudflare/`, with state in the shared azurerm backend
(`cloudflare/<stack>.tfstate`).

| Stack | Manages |
| --- | --- |
| `nordbye-it` | origin record, portfolio, blog and app hostnames, mail and verification records, HTML cache rule, Tiered Cache, Web Analytics |
| `logeverylift-com` | apex and www, www redirect, SPF and DMARC, Email Routing catch-all |
| `bigd-no` | origin record and zone settings only; app hostnames belong to external-dns |
| `watchdog` | the outside-in monitoring Worker on `watchdog.bigd.no` |

The Grafana Cloudflare dashboard shows traffic, cache, DNS and Web Analytics for all
three zones ([`../observability/README.md`](../observability/README.md#cloudflare)).

## Origin and proxying

Two A records publish the WAN address: `ddns.nordbye.it` and `ddns.bigd.no`. The
DDNS client on the UniFi gateway rewrites them (see [`unifi.md`](unifi.md)), so
Terraform ignores their `content`. Every web hostname is a CNAME to one of them.
`logeverylift.com` chains across zones to `ddns.nordbye.it`. This works because both
zones are on the same account.

[![Visitors reach the three Cloudflare zones; nordbye.it and logeverylift.com chain onto the proxied ddns.nordbye.it, bigd.no apps onto the DNS-only ddns.bigd.no, and both lead through the home WAN to Traefik's public gateway, while the watchdog Worker probes the public sites every minute](../../assets/diagrams/network-cloudflare.svg)](../../assets/diagrams/network-cloudflare.svg)

`ddns.nordbye.it` is proxied, so the residential address never appears in its
zone. The DDNS client never sends the proxied flag, so the flag survives updates.

`ddns.bigd.no` stays DNS-only. A proxied record would route every hostname that points
at it through the edge. The record therefore publishes the residential address. Plex is
not in DNS at all. It is a TCPRoute on port 32400 and sends the address to plex.tv directly.

## Zone settings

| Setting | nordbye.it | logeverylift.com | bigd.no |
| --- | --- | --- | --- |
| SSL | Full (Strict) | Full (Strict) | Full (Strict) |
| Always Use HTTPS | on | on | on |
| Always Online | on | off | off |
| Browser cache TTL | `var.edge_cache_ttl_seconds` (4 h) | 4 h | 4 h |
| Minimum TLS | 1.0 | 1.0 | 1.0 |

Full (Strict) works because the origin serves Let's Encrypt certificates for
each zone. Always Online is on only for the static sites. A stale archived page
from an authenticated or stateful app can show one visitor a page built for
another. Minimum TLS is the Cloudflare default. It is declared so that a dashboard
change shows as drift.

## nordbye.it

Proxied CNAMEs to `ddns.nordbye.it`: the apex, `www`, `blog`, `gate` (reelsmith,
behind Authentik) and `headroom` (headroom-demo). Mail is Google Workspace (five
MX, SPF, DMARC `p=quarantine`). TXT records also verify two Search Console
properties (a removed record un-verifies its property), TikTok on `gate` (reelsmith
publishing depends on it) and an Azure App Service custom domain (`asuid`).

`docs` is an unproxied CNAME to `mortennordbye.github.io` for the GitHub Pages docs
site. GitHub issues its certificate, and it can only do that while the record is not
proxied.

`_github-pages-challenge-mortennordbye` is the TXT record that verifies `nordbye.it` for
GitHub Pages on the account. A removed record un-verifies the domain.

`_acme-challenge` is not managed. cert-manager creates and deletes it on every
DNS-01 issuance.

The cache rule caches HTML at the edge for the hosts in `var.proxied_hostnames`
(apex, `www`, `blog`) for four hours. `/api/` is excluded, because the README status
card must stay fresh. `/_next/` is excluded, because fingerprinted assets keep the
immutable headers of the origin and the 404s of a replaced build must not be pinned.
4xx and 5xx are never cached. `gate` and `headroom` are proxied but not in the rule,
because their HTML is authenticated or stateful. The zone browser TTL must stay equal
to the edge TTL. Both apply only to HTML.

Tiered Cache is on with the Smart topology (`tiered-cache.tf`). Cloudflare
caches per POP. At this traffic most POPs have not seen a page since the last purge,
so without Tiered Cache a miss went directly to the residential origin. With it, a
POP without the page asks an upper-tier POP near the origin first. Both settings are
free on every plan. Regional Tiered Cache (Enterprise) and Argo Smart Routing are paid
and stay off.

Portfolio and blog prod promotions purge the zone at the end (see
[`../delivery/kargo.md`](../delivery/kargo.md)). A deploy is therefore live at the edge
when Kargo reports it green. A change outside a promotion, such as a DNS or
zone-setting apply or a redirect, still needs a manual purge from the dashboard
(Caching > Configuration > Purge Everything, or a single URL).

`web-analytics.tf` adopts the two beacon sites for nordbye.it and
blog.nordbye.it. Their tokens are in the pages (`portfolio/src/app/layout.tsx`,
`blog/config/_default/params.toml`), so `auto_install` stays off. A second copy would
count twice. When a resource is removed, Cloudflare deletes the site and its history.
The two sites differ in shape: nordbye.it is bound to the zone (`zone_tag`), blog is a
host-based site. Cloudflare builds that binding only at creation. To convert blog, you
must recreate it with a new token and no history. An omitted `host` is sent as null
and clears the name of the site.

## logeverylift.com

The apex is a proxied CNAME to `ddns.nordbye.it`. `www` exists only so that the
hostname is not dead. The HTTPRoute serves the apex alone, so a dynamic redirect rule
sends `www` to the apex with a 301 before it reaches the cluster.

There is no cache rule. The app is authenticated and per-user, so its HTML must
not be cached at a shared edge. Static assets are still cached at the edge by
extension.

Cloudflare Email Routing receives the mail. Its three MX records and the DKIM TXT are
read-only through the API, so they are not in Terraform. The catch-all in `email.tf`
is the writable half. It forwards every address to `var.forward_to`. At its default
(drop, disabled) the zone would accept mail and deliver none. A new destination must be
verified through an emailed link before the rule accepts it. DMARC is `p=none`, because
forwarded mail often fails SPF alignment. Tighten it to quarantine when no legitimate
mail is affected.

## bigd.no

Terraform manages only `ddns.bigd.no`, the zone settings and the Web Analytics
site for `k8s/talos/apps/bigd/index.html` (token from
`terraform output web_analytics_site_token`, `auto_install` off because the
snippet is in the page).

external-dns writes every app hostname from the HTTPRoutes on the public
Traefik gateway (`domainFilters: [bigd.no]`, `policy: upsert-only`, TXT registry
with prefix `extdns-%{record_type}.`, all in
`k8s/talos/infra/external-dns/values.yaml`). Set the proxy status on the route, not
in Terraform:

```yaml
metadata:
  annotations:
    external-dns.kubernetes.io/cloudflare-proxied: "true"
```

`local.bigd.no` is excluded from external-dns and lives on the UniFi gateway,
see [`dns.md`](dns.md).

## Watchdog Worker

[`../observability/README.md`](../observability/README.md#alert-path) describes what
the Worker checks and how it alerts. Operating notes:

- Terraform reads the Discord webhook from Bitwarden (stored with `/slack`
  appended for Alertmanager; the Worker removes it) and writes the heartbeat URL
  back as `alertmanager-heartbeat-url`.
  `k8s/talos/infra/kube-prometheus-stack/alertmanager-heartbeat-secret.yaml`
  reads it.
- A replaced `random_password.heartbeat_token` changes the heartbeat URL.
  Terraform updates the Bitwarden secret. Alertmanager picks it up within the
  refresh interval of the ExternalSecret.
- Cron triggers need a workers.dev subdomain on the account (`bigd-no`).
  `terraform_data.workers_subdomain` sets it with a PUT. The Worker is not served
  on it, only on the custom domain. external-dns runs upsert-only, so it does not
  touch the record of the Worker.
- `var.sites` mirrors the `public-sites` Probe in
  `k8s/talos/infra/blackbox-exporter/probe.yaml`. The probe sees the sites from
  the LAN, the Worker from the internet. A site served from the Cloudflare cache
  counts as up, as it does for visitors.
- State is one KV key per check, written only on change.

## Tokens and imports

Each zone stack takes an API token in `terraform.tfvars`, with the permissions
listed in the `variables.tf` of that stack. Zone permissions must be in a policy
scoped to zones. An account-scoped policy alone does not grant DNS. Permission
changes take a few minutes to propagate, and API calls fail intermittently until
they do. Wait, do not change the config.

In the cluster, external-dns, cert-manager and the Kargo purge step all read one
token from Bitwarden (`621a3a65-abe5-4c24-9a32-b29e010850f5`). It is
broad and shared by design, not scoped per consumer.

A record created in the dashboard must be imported before Terraform can manage
it. Otherwise apply fails with "record already exists":

```bash
terraform import cloudflare_dns_record.<name> "$(terraform output -raw zone_id)/<record_id>"
```

TXT values keep their escaped quotes, as the API returns them. Bare values
plan as a diff on every run. Proxied records must have `ttl = 1`.
