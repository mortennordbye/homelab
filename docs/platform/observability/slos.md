# SLOs and error budgets

Pyrra turns `ServiceLevelObjective` resources into Prometheus recording rules and
multi-window, multi-burn-rate alerts (the method from the Google SRE workbook). The
objectives are in `k8s/talos/infra/pyrra/slos.yaml`, the UI is at
https://pyrra.local.bigd.no, the SPOG dashboard has an "SLOs & error budgets" row, and
Pyrra ships its own "Pyrra - List" and "Pyrra - Detail" dashboards.

## Objectives

| SLO | SLI | Target | Window | Pages |
|---|---|---|---|---|
| `public-sites-probe` | blackbox probes that succeed, per site in the `public-sites` Probe | 99.5 % | 7d | yes |
| `portfolio-availability` | requests through the public gateway that do not answer 5xx | 99.5 % | 7d | no |
| `blog-availability` | same, blog | 99.5 % | 7d | no |
| `logeverylift-availability` | same, logeverylift | 99.5 % | 7d | no |
| `portfolio-latency` | requests served in under 300 ms at Traefik | 98 % | 7d | no |
| `blog-latency` | same, blog | 98 % | 7d | no |
| `logeverylift-latency` | requests served in under 1.2 s at Traefik | 99 % | 7d | no |
| `headroom-demo-availability` | requests through the public gateway that do not answer 5xx | 99.5 % | 7d | no |
| `reelsmith-gate-availability` | same, reelsmith's public gateway route | 99.5 % | 7d | no |
| `coredns-availability` | in-cluster DNS answers that are not SERVFAIL | 99.5 % | 7d | no |
| `certificates-ready` | cert-manager Certificates Ready, sampled over time | 99 % | 7d | no |
| `external-secrets-ready` | ExternalSecrets Ready, sampled over time | 99.9 % | 7d | no |
| `argocd-apps-healthy` | Argo CD Applications Healthy, from the recording rule `homelab:argocd_app_healthy` | 98 % | 7d | no |
| `volsync-in-sync` | VolSync sources within their schedule, from `homelab:volsync_in_sync` | 99 % | 7d | no |

99.5 % over 7 days is about 50 minutes of budget a week. The latency thresholds sit on
Traefik's histogram buckets (0.1, 0.3, 1.2, 5 s), since a latency SLI can only cut at a
bucket edge. Each target was set a little below what the site delivered over the 7 days
before it was introduced, so a fresh budget starts mostly unspent.

## Why these choices

The window is 7 days because Prometheus keeps 7 days. A 30-day window would compute its
budget over a week of data and call the rest perfect. Raising retention to 30 days would
need about four times the 20 GiB volume and more memory than Prometheus's 1 GiB limit.

The SLIs are measured at the edge. Traefik sees every request on the public gateway, so
the request SLOs need no instrumentation in the apps. The probe SLO goes through public DNS
and Cloudflare, so it also counts a broken record, an expired certificate or the home line
being down, which is what a visitor sees.

The platform SLOs, from `coredns-availability` down, give the shared components a budget
and a week of history. Each already has a symptom alert in `homelab-alerts.yaml`, so none
of them pages. Pyrra's `bool_gauge` takes a metric, not an expression, so Argo CD health
and VolSync lag go through 0/1 recording rules in the `homelab.sli` group of that file.

Only the probe SLO alerts. The sites get from a few requests an hour (blog) to a few a
minute (logeverylift), and a burn rate over a 15-minute window built from three requests
pages on one slow bot. The probe produces one sample a minute per site whatever the
traffic, so its burn rate means something. The request SLOs keep their budgets on the
dashboards and are read when reviewing a release or an incident.

## Alerts

Pyrra generates `ErrorBudgetBurn` with four window pairs. The two fast pairs are
`severity=critical` and reach Discord; the two slow pairs are `warning` and are not sent,
like every other warning (see [README.md](README.md#alert-path)). The `exhaustion` label
says how soon the budget runs out at the current rate.

| Short / long window | Burn rate | Budget gone in | Severity |
|---|---|---|---|
| 1m / 15m | 14x | 12 h | critical |
| 8m / 1h30m | 7x | 1 d | critical |
| 30m / 6h | 2x | 3.5 d | warning |
| 1h30m / 1d | 1x | 7 d | warning |

`SLOMetricAbsent` fires when the probe metric disappears, which would otherwise read as a
perfect SLO.

`PublicSiteDown` in `homelab-alerts.yaml` stays as the symptom alert for a site hard down
for 5 minutes with the internet up. The burn alert also catches flapping that never stays
down 5 minutes in a row.

## Error budget policy

- Budget left: ship as normal. Kargo promotes stage to prod on a green smoke test.
- A site's budget below 25 %: prod promotions for that site are merged by hand after looking
  at the Pyrra detail view, not auto-merged, until the budget recovers.
- Budget spent: no prod promotions for that site except fixes, and the cause gets an entry
  in [incidents.md](incidents.md).

## Add an SLO

1. Add a `ServiceLevelObjective` to `k8s/talos/infra/pyrra/slos.yaml`. Keep the
   `release: kube-prometheus-stack` label: Pyrra copies the SLO's labels onto the
   PrometheusRule it writes, and Prometheus only loads rules with that label.
2. Keep `window` at or below Prometheus retention.
3. For a low-traffic SLI set `alerting.disabled: true`, as above.
4. Check the rules locally before pushing: `pyrra generate --config-files='<dir>/*.yaml'
   --prometheus-folder=<out>/` with the `ghcr.io/pyrra-dev/pyrra` image, then look at the
   generated expressions.
5. After the sync, `kubectl -n monitoring get prometheusrules` shows one rule per SLO and
   the Prometheus rules page shows no evaluation errors.
