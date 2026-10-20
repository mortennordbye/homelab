# Alert runbooks

One section per alert in `k8s/talos/infra/kube-prometheus-stack/homelab-alerts.yaml`, plus
the SLO alerts Pyrra generates and one section for the chart's Alertmanager rule group.
Every rule's `runbook_url` points at its section here, and the Discord message carries the
link. Reelsmith's alerts are documented in
[`../../apps/reelsmith/README.md`](../../apps/reelsmith/README.md#alerts).

All commands assume the Homelab kubeconfig:
`export KUBECONFIG=~/Documents/Code/github/Homelab/terraform/proxmox/hyper-cluster/k8s/talos/kubeconfig`.

The order inside every section: what it means, what users see, how to find the cause, how
to fix it. If the fix is not obvious within 30 minutes, write down what was ruled out and
open an entry in [incidents.md](incidents.md).

## SLOs

### ErrorBudgetBurn

The public-site probe SLO ([slos.md](slos.md)) is using its 7-day budget faster than it
can sustain. The `exhaustion` label says when the budget runs out at this rate, `long` and
`short` name the window pair, and `instance` names the site.

Users see the site failing or flapping from outside.

- Check the site: `curl -sI https://<instance>`.
- Open the Pyrra detail view at https://pyrra.local.bigd.no for the error rate over time.
- Probe detail: `probe_http_status_code{job="public-sites"}`, `probe_ssl_earliest_cert_expiry`
  and `probe_duration_seconds` in Prometheus. A status code of 0 is DNS, TLS or a timeout,
  anything else is the app or Traefik.
- `InternetDown` firing at the same time means the home line, not the site.

Fix the cause as for [PublicSiteDown](#publicsitedown). Afterwards check the budget left
and apply the [error budget policy](slos.md#error-budget-policy).

### SLOMetricAbsent

The metric behind an SLO has stopped existing, so the SLO reads as perfect while measuring
nothing. For the probe SLO that is `probe_success{job="public-sites"}`.

No user impact by itself; the paging SLO is blind.

- `kubectl -n monitoring get pods -l app.kubernetes.io/name=prometheus-blackbox-exporter`
- `kubectl -n monitoring get probe public-sites`
- Prometheus targets page, job `public-sites`.

Fix the exporter or the Probe, then check `probe_success` is back.

## Workloads

### ContainerRestartingFrequently

A container restarted more than 3 times in 15 minutes. Warning, not sent to Discord.

Users may see short errors while it restarts.

- `kubectl -n <namespace> logs <pod> -c <container> --previous`
- `kubectl -n <namespace> describe pod <pod>` for the last state and exit code. Exit code
  137 is a kill (often OOM, see [ContainerOOMKilled](#containeroomkilled)).

Fix the crash in the app or its config. A failing liveness probe also restarts the
container; check the probe timing against how long the app takes to start.

### DeploymentUnavailable

A Deployment wants replicas but has none available for 5 minutes. KEDA scale-to-zero apps
do not fire this, since their spec replicas are 0.

The app is down.

- `kubectl -n <namespace> describe deploy <deployment>` and the newest ReplicaSet's events.
- `kubectl -n <namespace> get pods` then `describe` a pod: `Pending` is scheduling (resources,
  the GPU, a PVC on another host), `ImagePullBackOff` is the tag, `CrashLoopBackOff` is the
  app.
- A PVC stuck attaching on Proxmox CSI: see [`../storage/README.md`](../storage/README.md).

Roll back by reverting the commit that changed it, or for a Kargo-promoted app promote the
previous freight ([`../delivery/kargo.md`](../delivery/kargo.md)).

### PodCrashLooping

A container has been in CrashLoopBackOff for 10 minutes. This fires even when an old pod
still serves during a rolling update, so the new revision is broken.

Users may see nothing yet, but the rollout is stuck and the next eviction takes the app down.

- `kubectl -n <namespace> logs <pod> -c <container> --previous`
- `kubectl -n <namespace> rollout history deploy/<name>` to see what changed.

Revert the change through Git. Do not `kubectl rollout undo`: Argo CD puts the broken
revision back.

### ContainerOOMKilled

A container was OOM-killed in the last 10 minutes. Warning, not sent to Discord.

Requests in flight fail when it dies.

- `kubectl -n <namespace> describe pod <pod>` for the limit.
- Memory against limit for the namespace on the SPOG Workloads row.

Raise the memory limit in the app's manifest, or find the leak if usage climbs without a
plateau.

## Platform

### ArgoCDAppDegraded

An Argo CD Application has not been Healthy for 15 minutes. Warning, not sent.

Depends on the app; a Degraded health usually means one of its resources is failing.

- `kubectl -n argocd describe application <name>`
- The Argo CD UI shows which resource is unhealthy.

Fix the failing resource through Git ([`../delivery/argocd.md`](../delivery/argocd.md#gotchas)).

### ArgoCDAppSyncStuck

An Application has been OutOfSync or Unknown for 20 minutes. Unknown with health still
Healthy is a manifest generation failure (ComparisonError). Warning, not sent.

Changes on `main` are not reaching the cluster.

- `kubectl -n argocd get application <name> -o jsonpath='{range .status.conditions[*]}{.type}: {.message}{"\n"}{end}'`
- Render locally: `kustomize build --enable-helm k8s/talos/<apps|infra>/<name>`.
- Permanent drift on a field the server defaults: `kubectl diff --field-manager=argocd-controller`
  shows it.

Fix the render error, or spell out the defaulted field in the manifest.

### ExternalSecretNotReady

An ExternalSecret has been NotReady for 30 minutes. Warning, not sent.

The existing Secret keeps its last value, so nothing breaks until a pod needs a new or
rotated value.

- `kubectl -n <namespace> describe externalsecret <name>` for the error.
- Usual causes: the Bitwarden id in `remoteRef.key` is wrong, the secret is not in the
  Homelab project, or the machine account token expired.

See [`../secrets/README.md`](../secrets/README.md#gotchas).

### CertificateExpiringSoon

A cert-manager certificate expires within 7 days. cert-manager renews at 30 days left, so
renewal has been failing for over three weeks.

When it expires, browsers refuse the site.

- `kubectl -n <namespace> describe certificate <name>`, then the newest CertificateRequest,
  Order and Challenge.
- DNS-01 failures are usually the Cloudflare API token.

See [`../network/certificates.md`](../network/certificates.md#renewal).

### KubeHpaMaxedOut

A CPU or memory HPA has been at max replicas for 15 minutes. KEDA HPAs are excluded.
Warning, not sent.

The app may be slow under load.

- `kubectl -n <namespace> describe hpa <name>`

Raise `maxReplicas` or the resource requests, or find what is driving the load.

### PersistentVolumeFillingUp

A PVC is under half free and, at the rate of the last 6 hours, full within 4 days. The
app's writes fail when it fills; a database stops.

- `kubectl -n <namespace> exec <pod> -- du -sh /<mount>/*` to find what grew.

Cut retention or delete what should not be there. To grow it, raise the PVC's
`resources.requests.storage` in Git; both `proxmox-local` and the NFS classes allow
expansion ([`../storage/README.md`](../storage/README.md)).

## Media stack

### ArrQueueStuck

Sonarr or Radarr has queue items in a warning or error state for 2 hours. They wait for a
manual import or removal and never clear on their own.

New episodes or films stop arriving.

Open Activity > Queue in the app, read the item's message, then import it by hand or remove
it. See [`../../apps/media-stack/README.md`](../../apps/media-stack/README.md).

### MediaRootFolderLow

A Sonarr or Radarr root folder has less than 200 GB free. Imports fail once it fills.

- NAS Volume 1 usage on the SPOG NAS row.

Free space on the NAS, or remove media no longer wanted.

### ArrAppUnreachable

exportarr reports the app's API as down for 15 minutes while the exporter itself runs.

The app's UI and automation are down.

- `kubectl -n <namespace> logs deploy/<job>`
- `kubectl -n <namespace> get pods`

Usually a crashed app or a changed API key in its ExternalSecret.

### MediaExporterDown

Prometheus cannot scrape a media stack exporter for 15 minutes, so the other media alerts
are blind.

- `kubectl -n arr-stack get pods`

Restart or fix the exporter sidecar.

### QbittorrentDisconnected

qBittorrent has had no connection for 30 minutes. It runs inside the gluetun VPN pod, so
this is the tunnel.

Downloads stall.

- `kubectl -n gluetun-vpn logs deploy/gluetun -c gluetun`

Restart the pod if the tunnel does not come back; check the VPN credentials if it never
connects.

## Backups

### BackupJobStale

`etcd-backup`, a `*-db-backup` or a `*-backup-check` CronJob has not succeeded in 26 hours,
or has been scheduled and never succeeded.

No user impact now; the next restore would lose more data.

- `kubectl -n <namespace> get jobs,pods`, then the failed pod's logs.

Fix the job and run it once by hand: `kubectl -n <namespace> create job --from=cronjob/<cronjob> <cronjob>-manual`.
Restore paths are in [`../backups/restore.md`](../backups/restore.md).

### RestoreTestFailed

The monthly restore test did not pass, or has not passed for 32 days. The backups may not
restore.

- `kubectl -n backup-check logs job/<latest restore-test job> --all-containers`

Find which layer failed and run that restore by hand following
[`../backups/restore.md`](../backups/restore.md#testing). Treat a failure as an incident:
an unverified backup is not a backup.

### VolSyncBackupStale

A VolSync ReplicationSource missed its nightly restic backup by more than 6 hours.

- `kubectl -n <namespace> describe replicationsource <name>`
- logs of the `volsync-src-<name>` pod.

Usually a locked restic repository or a PVC that could not be snapshotted. See
[`../backups/restore.md`](../backups/restore.md#app-volume-volsync).

## Alerting

### Alertmanager

Any `Alertmanager*` alert from the chart's Alertmanager group. The ones that reach Discord:

| Alert | Means |
|---|---|
| `AlertmanagerFailedReload` | the last config reload failed; the replica keeps running the previous config |
| `AlertmanagerConfigInconsistent` | the two replicas run different configs |
| `AlertmanagerMembersInconsistent`, `AlertmanagerClusterDown` | the replicas do not see each other, or half or more are down |
| `AlertmanagerClusterCrashlooping` | half or more of the replicas restarted more than 4 times in 10 min |
| `AlertmanagerClusterFailedToSendAlerts` | every replica fails to deliver to one integration (`discord`, or `webhook` for the heartbeat) |

A failing Discord integration cannot announce itself on Discord: that alert arrives once
delivery works again, or shows up in the weekly review. A dead Alertmanager is caught by the
Cloudflare watchdog instead ([README.md](README.md#alert-path)).

```bash
kubectl -n monitoring get pods -l app.kubernetes.io/name=alertmanager
kubectl -n monitoring logs alertmanager-kube-prometheus-stack-alertmanager-0 -c config-reloader
kubectl -n monitoring logs alertmanager-kube-prometheus-stack-alertmanager-0 -c alertmanager
```

- Reload failure or inconsistent config: the last change to `alertmanager.config` in
  `k8s/talos/infra/kube-prometheus-stack/values.yaml`, or a changed key in the
  `alertmanager-discord-webhook` or `alertmanager-heartbeat` secrets. Revert in Git.
- Failed sends to `discord`: the webhook may be revoked; rotate it as in
  [`../secrets/README.md`](../secrets/README.md#rotation-and-refresh). Failed sends to `webhook`: see the
  watchdog notes in [`../network/cloudflare.md`](../network/cloudflare.md#watchdog-worker).

## Network

### InternetDown

Every internet probe has failed for a minute. This message arrives after the line is back,
with the start time.

Every public site is down for visitors, and nothing reaches Discord until the line returns.

- The UniFi gateway's system log in Loki (`{application="unifi_system_log"}`) shows whether
  the WAN dropped.
- `probe_duration_seconds{job="internet"}` for latency before the drop.

Nothing to fix in the cluster. If outages repeat, take it up with the ISP with the outage
history from the SPOG Internet row.

### PublicSiteDown

A public site has failed through public DNS and Cloudflare for 5 minutes while the internet
is up.

The site is down for visitors.

- `curl -sI https://<instance>` from outside the LAN.
- `kubectl -n <namespace> get pods,httproute`.
- `probe_http_status_code`: 0 is DNS, TLS or a timeout; 5xx is the app or Traefik; 52x is
  Cloudflare unable to reach the origin.
- Traefik public gateway: `kubectl -n traefik get pods` and its logs.

See [`../network/traefik.md`](../network/traefik.md) and
[`../network/cloudflare.md`](../network/cloudflare.md).

## NAS

### NasDiskUnhealthy

DSM reports a disk as not normal.

No impact while the RAID holds; a second failure loses data.

Check Storage Manager > HDD/SSD on nas.local.bigd.no and replace the disk.

### NasRaidDegraded

DSM reports the RAID as not normal.

The NAS holds the media, every NFS volume and every backup. Stop writing to it before
anything else, then check Storage Manager on nas.local.bigd.no.

### NasVolumeAlmostFull

Volume 1 is over 90 % full. It holds the media, the cluster volumes and every backup.

Writes, including backups, fail when it fills.

Free space: old media first, then backup retention on PBS
([`../backups/pbs.md`](../backups/pbs.md)).

### NasVolumeFillingUp

At the rate of the last 6 hours, Volume 1 is full within 4 days. This fires before
`NasVolumeAlmostFull` when something writes fast, usually a large download, a backup
that grew, or a runaway log.

Find the writer before freeing space: DSM > Storage Manager > Volume 1 shows usage per
shared folder, and the cluster volumes live under the `k8s-volumes` share. The same fixes
as [NasVolumeAlmostFull](#nasvolumealmostfull) apply.

### NasMetricsDown

Prometheus has not reached the NAS over SNMPv3 for 30 minutes, so the NAS alerts are blind.

- `kubectl -n monitoring logs deploy/snmp-exporter`
- DSM > Terminal & SNMP: SNMP still on, user `snmp-exporter` still there.

## Proxmox

### ProxmoxHostDown

The Proxmox cluster reports a host offline for 5 minutes; its Talos VMs are down with it.

Pods on those VMs reschedule, except those pinned to the node (the GPU node, proxmox-local
PVCs).

Check the host's power and network, then the Proxmox UI. See
[`../cluster/proxmox.md`](../cluster/proxmox.md).

### ProxmoxStorageAlmostFull

A Proxmox storage is over 85 % full. `local-lvm` holds the proxmox-local PVCs, where
Proxmox CSI leaves orphaned volumes; `pbs` holds every VM backup.

- For `local-lvm`, compare `lvs` on the host against `kubectl get pv`; volumes with no PV
  are orphans ([`../storage/README.md`](../storage/README.md#deleting-a-pvc)).

### ProxmoxStorageFillingUp

At the rate of the last 6 hours, a Proxmox storage is full within 4 days.

- `local-lvm`: a PVC on `proxmox-local` growing, or orphaned volumes piling up. Check as
  for [ProxmoxStorageAlmostFull](#proxmoxstoragealmostfull).
- `pbs`: backups growing faster than prune and GC remove them
  ([`../backups/pbs.md`](../backups/pbs.md)).

### ProxmoxMetricsDown

Prometheus has not reached the Proxmox API for 30 minutes, so the Proxmox alerts are blind.

- `kubectl -n monitoring logs deploy/pve-exporter`
- The `prometheus@pve` token in Bitwarden still valid.

### ProxmoxHostHot

A host's CPU has been above 90 °C for 10 minutes. The i5-11400T throttles at 100 °C.

Workloads on that host slow down.

Check for a blocked fan or dust, and what is loading the host.

### ProxmoxSensorsDown

node-exporter on no Proxmox host has been reachable for 30 minutes, so ProxmoxHostHot is
blind.

- `systemctl status prometheus-node-exporter` on the hosts.
- `terraform/proxmox/hyper-cluster/datacenter/sensors.tf` installs it.
