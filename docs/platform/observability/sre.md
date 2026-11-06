# Reliability practice

This page describes how the homelab stays up: what is measured, what pages, what to do when
something pages, and how a week is reviewed. Each piece has its own page. This page shows
how they fit together.

[![Signals and Pyrra rules feed Prometheus; critical alerts page Discord and lead to a runbook and a fix in Git, warnings go to the weekly review, and postmortem actions and review tuning also land as Git changes that Argo CD syncs with a deploy marker](../../assets/diagrams/sre-loop.svg)](../../assets/diagrams/sre-loop.svg)

## The pieces

| Piece | What it does | Where |
|---|---|---|
| SLOs and error budgets | the public sites, the gateway and the shared platform each have a 28-day objective, and the paging probe SLO alerts on burn rate | [slos.md](slos.md) |
| Alerts | only `critical` reaches Discord, and every rule links to its runbook section | [README.md](README.md#alert-path), [runbooks.md](runbooks.md) |
| Incidents | blameless postmortems, written when an event meets the criteria at the top of the page | [incidents.md](incidents.md) |
| Change tracking | every Argo CD sync is a deploy marker on the Homelab dashboards; Kargo holds a site's prod promotion for a manual merge when its budget is below 25 % | [argocd.md](../delivery/argocd.md#deploy-markers), [slos.md](slos.md#error-budget-policy) |
| Capacity | the NAS volume, Proxmox storages and PVCs page when they are on course to fill within 4 days, before the fixed thresholds fire | [runbooks.md](runbooks.md#persistentvolumefillingup) |
| Watching the watchers | the Cloudflare watchdog reports a missing Alertmanager heartbeat, the chart's Alertmanager rules catch a failed reload, split replicas or failed sends, `SLOMetricAbsent` fires when an SLO loses its metric, and every exporter has a `*MetricsDown` alert | [README.md](README.md#alert-path) |

## What pages

An alert is `critical` only when someone has to act within hours. Only this severity reaches
Discord. The cases are: something that users can see is down, data is at risk, or a safety
net has stopped (backups, or the alerting path itself). Everything else is `warning`.
Prometheus records a warning, never sends it, and the weekly review reads it. Fix a false
positive by tuning the rule or its upstream macro. Do not raise the threshold until the
alert is quiet.

A new alert needs a section in [runbooks.md](runbooks.md), a `runbook_url` that points to it,
and a row in the alert table in [README.md](README.md#alerts).

## When something pages

1. Open the runbook link in the Discord message and follow it.
2. Mitigate first, then diagnose. For a bad release, revert the promotion commit or roll
   back the app's image in Git, and let Argo CD sync. A restart is acceptable when the
   runbook says so.
3. On Homelab-SPOG, look for a deploy marker a short time before the first symptom. Hover
   it to see the app and the commit.
4. If the event meets the criteria in [incidents.md](incidents.md), write the postmortem
   there. End it with actions that make the next occurrence shorter or impossible.

## Weekly review

Fifteen minutes, once a week. The queries run in Grafana's Explore against Prometheus.

| Question | Where | Act when |
|---|---|---|
| What fired, including warnings? | `group by (alertname, severity) (max_over_time(ALERTS{alertstate="firing"}[7d]))` | a critical that needed no action: tune it; a warning that needed action: make it critical |
| How much budget did each SLO spend? | [Pyrra](https://pyrra.local.bigd.no), and the "SLOs & error budgets" row on Homelab-SPOG | a budget below 25 %: find the cause before the next promotion |
| What was OOM-killed? | `group by (namespace, pod, container) (max_over_time(kube_pod_container_status_last_terminated_reason{reason="OOMKilled"}[7d]) == 1)` | any result: see the memory rule below |
| What runs close to its memory limit? | `max by (namespace, pod, container) (max_over_time(container_memory_working_set_bytes{container!="", container!="POD"}[7d])) / max by (namespace, pod, container) (kube_pod_container_resource_limits{resource="memory"}) > 0.8` | above 0.8: raise the limit before it is killed |
| What keeps restarting? | `sum by (namespace, pod, container) (increase(kube_pod_container_status_restarts_total[7d])) > 3` | any result: read its logs on Homelab-Log-SPOG |
| What fills within a month? | `predict_linear(kubelet_volume_stats_available_bytes{job="kubelet"}[1d], 30 * 86400) < 0` | any result: expand the PVC or cut retention |
| Which postmortem actions are open? | `grep -n -- "- \[ \]" docs/platform/observability/incidents.md` | an action older than a month: do it or drop it in the postmortem |

## Memory limits

Set a container's memory limit from its 7-day peak working set, plus room for its own
spikes. Do not set it from its idle use. Query engines spike far above their steady state: a
heavy Grafana dashboard adds more than 100Mi, and a Tempo search adds 500Mi or more. The
request matches the steady working set, so the scheduler places the pod on a node that has
the memory.
