# Alert runbooks

One section per alert in `k8s/talos/infra/kube-prometheus-stack/homelab-alerts.yaml`. The
SLO alerts that Pyrra generates have sections too. The chart's etcd and Alertmanager rule
groups have one section each. Every rule's `runbook_url` points at its section here. The
Discord message carries the link.
[`../../apps/reelsmith/README.md`](../../apps/reelsmith/README.md#alerts) documents
Reelsmith's alerts.

All commands assume the Homelab kubeconfig:
`export KUBECONFIG=~/Documents/Code/github/Homelab/terraform/proxmox/hyper-cluster/k8s/talos/kubeconfig`.

Every section has the same order: what the alert means, what users see, how to find the
cause, how to fix it. If you do not find the fix within 30 minutes, write down what you
ruled out and open an entry in [incidents.md](incidents.md).

## SLOs

### ErrorBudgetBurn

The public-site probe SLO ([slos.md](slos.md)) spends its 28-day budget too fast. The
`exhaustion` label says when the budget runs out at this rate. `long` and `short` name the
window pair. `instance` names the site.

Users see the site failing or flapping from outside.

- Check the site: `curl -sI https://<instance>`.
- Open the Pyrra detail view at https://pyrra.local.bigd.no for the error rate over time.
- Probe detail: `probe_http_status_code{job="public-sites"}`, `probe_ssl_earliest_cert_expiry`
  and `probe_duration_seconds` in Prometheus. A status code of 0 means DNS, TLS or a
  timeout. Any other code means the app or Traefik.
- If `InternetDown` fires at the same time, the cause is the home line, not the site.

Fix the cause as for [PublicSiteDown](#publicsitedown). Then check the budget that is left
and apply the [error budget policy](slos.md#error-budget-policy).

### SLOMetricAbsent

The metric behind an SLO no longer exists. The SLO then reads as perfect but measures
nothing. For the probe SLO the metric is `probe_success{job="public-sites"}`.

No user impact by itself. The paging SLO is blind.

- `kubectl -n monitoring get pods -l app.kubernetes.io/name=prometheus-blackbox-exporter`
- `kubectl -n monitoring get probe public-sites`
- Prometheus targets page, job `public-sites`.

Fix the exporter or the Probe. Then check that `probe_success` is back.

## Workloads

### ContainerRestartingFrequently

A container restarted more than 3 times in 15 minutes. Warning, not sent to Discord.

Users may see short errors while it restarts.

- `kubectl -n <namespace> logs <pod> -c <container> --previous`
- `kubectl -n <namespace> describe pod <pod>` for the last state and exit code. Exit code
  137 is a kill, often OOM. See [ContainerOOMKilled](#containeroomkilled).

Fix the crash in the app or its config. A failing liveness probe also restarts the
container. Compare the probe timing with the start time of the app.

### DeploymentUnavailable

A Deployment wants replicas but has had none available for 5 minutes. KEDA scale-to-zero
apps do not fire this alert, because their spec replicas are 0.

The app is down.

- `kubectl -n <namespace> describe deploy <deployment>` and the newest ReplicaSet's events.
- `kubectl -n <namespace> get pods`, then `describe` a pod. `Pending` is a scheduling
  problem: resources, the GPU, or a PVC on another host. `ImagePullBackOff` is the tag.
  `CrashLoopBackOff` is the app.
- A PVC stuck attaching on Proxmox CSI: see [`../storage/README.md`](../storage/README.md).

Roll back: revert the commit that changed it. For a Kargo-promoted app, promote the
previous freight ([`../delivery/kargo.md`](../delivery/kargo.md)).

### PodCrashLooping

A container has been in CrashLoopBackOff for 10 minutes. This alert fires also when an old
pod still serves during a rolling update. In that case the new revision is broken.

Users may see nothing yet. But the rollout is stuck, and the next eviction takes the app
down.

- `kubectl -n <namespace> logs <pod> -c <container> --previous`
- `kubectl -n <namespace> rollout history deploy/<name>` to see what changed.

Revert the change through Git. Do not run `kubectl rollout undo`. Argo CD puts the broken
revision back.

### ContainerOOMKilled

A container was OOM-killed in the last 10 minutes. Warning, not sent to Discord.

Requests in flight fail when the container dies.

- `kubectl -n <namespace> describe pod <pod>` for the limit.
- Memory against limit for the namespace on the SPOG Workloads row.

Raise the memory limit in the app's manifest. If usage climbs without a plateau, find the
leak.

## Platform

### ArgoCDAppDegraded

An Argo CD Application has not been Healthy for 15 minutes. Warning, not sent.

The impact depends on the app. Degraded health usually means that one of its resources is
failing.

- `kubectl -n argocd describe application <name>`
- The Argo CD UI shows which resource is unhealthy.

Fix the failing resource through Git ([`../delivery/argocd.md`](../delivery/argocd.md#gotchas)).

### ArgoCDAppSyncStuck

An Application has been OutOfSync or Unknown for 20 minutes. Unknown with health still
Healthy is a manifest generation failure (ComparisonError). Warning, not sent.

Changes on `main` do not reach the cluster.

- `kubectl -n argocd get application <name> -o jsonpath='{range .status.conditions[*]}{.type}: {.message}{"\n"}{end}'`
- Render locally: `kustomize build --enable-helm k8s/talos/<apps|infra>/<name>`.
- Permanent drift on a field the server defaults: `kubectl diff --field-manager=argocd-controller`
  shows it.

Fix the render error, or spell out the defaulted field in the manifest.

### ExternalSecretNotReady

An ExternalSecret has been NotReady for 30 minutes. Warning, not sent.

The existing Secret keeps its last value. Nothing breaks until a pod needs a new or
rotated value.

- `kubectl -n <namespace> describe externalsecret <name>` for the error.
- Usual causes: the Bitwarden id in `remoteRef.key` is wrong, the secret is not in the
  Homelab project, or the machine account token expired.

See [`../secrets/README.md`](../secrets/README.md#gotchas).

### CertificateExpiringSoon

A cert-manager certificate expires within 7 days. cert-manager renews at 30 days left.
Renewal has therefore failed for more than three weeks.

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

Raise `maxReplicas` or the resource requests, or find what drives the load.

### PersistentVolumeFillingUp

A PVC has less than half of its space free. At the rate of the last 6 hours, it is full
within 4 days. The app's writes fail when it fills. A database stops.

- `kubectl -n <namespace> exec <pod> -- du -sh /<mount>/*` to find what grew.

Cut retention or delete what should not be there. To grow the PVC, raise its
`resources.requests.storage` in Git. Both `proxmox-local` and the NFS classes allow
expansion ([`../storage/README.md`](../storage/README.md)).

## Media stack

### ArrQueueStuck

Sonarr or Radarr has queue items in a warning or error state for 2 hours. These items wait
for a manual import or removal. They never clear on their own.

New episodes or films stop arriving.

Open Activity > Queue in the app and read the item's message. Then import the item by hand
or remove it. See [`../../apps/media-stack/README.md`](../../apps/media-stack/README.md).

### MediaRootFolderLow

A Sonarr or Radarr root folder has less than 200 GB free. Imports fail when it fills.

- NAS Volume 1 usage on the SPOG NAS row.

Free space on the NAS, or remove media that is no longer wanted.

### ArrAppUnreachable

exportarr reports the app's API as down for 15 minutes while the exporter itself runs.

The app's UI and automation are down.

- `kubectl -n <namespace> logs deploy/<job>`
- `kubectl -n <namespace> get pods`

The usual cause is a crashed app or a changed API key in its ExternalSecret.

### MediaExporterDown

Prometheus has not scraped a media stack exporter for 15 minutes. The other media alerts
are blind.

- `kubectl -n arr-stack get pods`

Restart or fix the exporter sidecar.

### QbittorrentDisconnected

qBittorrent has had no connection for 30 minutes. It runs inside the gluetun VPN pod, so
the cause is the tunnel.

Downloads stall.

- `kubectl -n gluetun-vpn logs deploy/gluetun -c gluetun`

Restart the pod if the tunnel does not come back. Check the VPN credentials if it never
connects.

## Backups

### BackupJobStale

`etcd-backup`, a `*-db-backup` or a `*-backup-check` CronJob has not succeeded in 26 hours,
or has been scheduled and never succeeded.

No user impact now. The next restore would lose more data.

- `kubectl -n <namespace> get jobs,pods`, then the failed pod's logs.
- `volsync-backup-check` prints `STALE` for each repository without a recent snapshot. Look for
  a leftover manual trigger: `kubectl -n <namespace> get replicationsource <name> -o jsonpath='{.spec.trigger}'`.

Fix the job and run it once by hand: `kubectl -n <namespace> create job --from=cronjob/<cronjob> <cronjob>-manual`.
Restore paths are in [`../backups/restore.md`](../backups/restore.md).

### PostgresBaseBackupStale

The newest CloudNativePG base backup in Garage is more than 26 hours old. WAL archiving
continues. But a restore has to replay all WAL since the last base backup, and retention
cannot drop old WAL.

- `kubectl -n <namespace> get scheduledbackup,backup`: the newest Backup's phase and
  error.
- The `plugin-barman-cloud` container logs on the instance that ran it, and Garage
  ([`../data/cloudnative-pg.md`](../data/cloudnative-pg.md)).
- When the cause is fixed, take one backup by hand with a `Backup` object of `method: plugin`.

### RestoreTestFailed

The monthly restore test did not pass, or has not passed for 32 days. The backups may not
restore.

- `kubectl -n backup-check logs job/<latest restore-test job> --all-containers`
- `kubectl -n logeverylift logs job/<latest logeverylift-db-restore-test job>` when that is the CronJob named in the alert

Find the layer that failed. Run that restore by hand as
[`../backups/restore.md`](../backups/restore.md#testing) describes. Treat a failure as an
incident. An unverified backup is not a backup.

### VolSyncBackupStale

A VolSync ReplicationSource missed its nightly restic backup by more than 6 hours.

- `kubectl -n <namespace> describe replicationsource <name>`
- logs of the `volsync-src-<name>` pod.

The usual cause is a locked restic repository, or a PVC that could not be snapshotted. See
[`../backups/restore.md`](../backups/restore.md#app-volume-volsync).

## Data

### PostgresDown

No instance of the CloudNativePG Cluster `logeverylift-db` reports itself as primary.
The app cannot write.

- `kubectl -n logeverylift get cluster logeverylift-db`: the phase says whether a
  failover is in progress or stuck.
- `kubectl -n logeverylift get pods -l cnpg.io/cluster=logeverylift-db` and the
  `postgres` container logs. A pod stuck in `ContainerCreating` is usually the NFS
  volume ([`../storage/README.md`](../storage/README.md#synology-nfs)).
- The operator's view: `kubectl -n cnpg-system logs deploy/cnpg-cloudnative-pg`.

More in [`../data/postgres.md`](../data/postgres.md).

### PostgresWalArchivingFailing

A CloudNativePG primary cannot ship WAL to Garage. Unarchived WAL stays on the
instance volume. This ends with a full volume and a stopped primary. Every minute of
it is missing from point-in-time restore.

- `kubectl -n <namespace> get cluster` and the `ContinuousArchiving` condition.
- The `plugin-barman-cloud` container logs on the primary show the S3 error.
- Garage itself: `kubectl -n garage get pods`, its logs, and `garage status`
  ([`../data/cloudnative-pg.md`](../data/cloudnative-pg.md)). An S3 `403` points at
  the key or the bucket grant. A timeout points at the `garage` network policy.

## Control plane

### etcd

Any `etcd*` alert from the chart's etcd group. The ones that reach Discord:

| Alert | Means |
|---|---|
| `etcdInsufficientMembers` | fewer than two of the three members answer the scrape: quorum is lost |
| `etcdNoLeader` | a member has no leader for a minute |
| `etcdHighNumberOfFailedGRPCRequests` | over 5 % of a gRPC method's requests fail |
| `etcdGRPCRequestsSlow` | p99 gRPC latency above 150 ms |
| `etcdHighFsyncDurations` | p99 WAL fsync above 1 s, the disk under etcd is too slow |
| `etcdDatabaseQuotaLowSpace` | the database is above 95 % of its quota; at 100 % etcd goes read-only |

Without quorum or a leader, the Kubernetes API stops accepting writes. No deploys, no
rescheduling, and Argo CD and cert-manager stall. Running pods keep serving.

```bash
export TALOSCONFIG=~/Documents/Code/github/Homelab/terraform/proxmox/hyper-cluster/k8s/talos/talosconfig
talosctl -n 10.3.10.31,10.3.10.32,10.3.10.33 etcd status
talosctl -n 10.3.10.31 etcd members
talosctl -n 10.3.10.31 etcd alarm list
talosctl -n <ip> logs etcd
```

- A member missing from `etcd status`: check its VM and Proxmox host first
  ([ProxmoxHostDown](#proxmoxhostdown)), then `talosctl -n <ip> service etcd`.
- Slow fsync or gRPC: the control plane disks are on each host's `local-lvm`. Look on the
  Proxmox row of SPOG for a backup, VolSync or Tdarr job that saturates that host's disk.
- Quota: run `talosctl -n <ip> etcd defrag` on one member at a time, never on two at once.
  Then run `talosctl -n <ip> etcd alarm disarm` if `alarm list` shows `NOSPACE`.

If a majority of members is lost, restore from the etcd snapshot
([`../backups/restore.md`](../backups/restore.md#etcd)). Do not remove or reset a member while
quorum is in doubt. See [`../cluster/talos.md`](../cluster/talos.md#remove-a-node).

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

A failing Discord integration cannot announce itself on Discord. That alert arrives when
delivery works again, or appears in the weekly review. The Cloudflare watchdog catches a
dead Alertmanager instead ([README.md](README.md#alert-path)).

```bash
kubectl -n monitoring get pods -l app.kubernetes.io/name=alertmanager
kubectl -n monitoring logs alertmanager-kube-prometheus-stack-alertmanager-0 -c config-reloader
kubectl -n monitoring logs alertmanager-kube-prometheus-stack-alertmanager-0 -c alertmanager
```

- Reload failure or inconsistent config: the last change to `alertmanager.config` in
  `k8s/talos/infra/kube-prometheus-stack/values.yaml`, or a changed key in the
  `alertmanager-discord-webhook` or `alertmanager-heartbeat` secrets. Revert in Git.
- Failed sends to `discord`: the webhook may be revoked. Rotate it as in
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

Nothing to fix in the cluster. If outages repeat, report them to the ISP with the outage
history from the SPOG Internet row.

### PublicSiteDown

A public site has failed through public DNS and Cloudflare for 5 minutes while the internet
is up.

The site is down for visitors.

- `curl -sI https://<instance>` from outside the LAN.
- `kubectl -n <namespace> get pods,httproute`.
- `probe_http_status_code`: 0 is DNS, TLS or a timeout. 5xx is the app or Traefik. 52x
  means that Cloudflare cannot reach the origin.
- Traefik public gateway: `kubectl -n traefik get pods` and its logs.

See [`../network/traefik.md`](../network/traefik.md) and
[`../network/cloudflare.md`](../network/cloudflare.md).

### InternalSiteDown

A `local.bigd.no` host has failed through the gateway's DNS and Traefik's private gateway for
10 minutes.

The app is unreachable on the LAN and over Tailscale, even if its pods are running.

- `kubectl -n <namespace> get pods,httproute`. The HTTPRoute status says whether the gateway
  accepted the route.
- `probe_http_status_code{job="internal-sites"}`: 0 is DNS, TLS or a timeout. 404 is a route
  that no longer matches the host. 5xx is the app or a backend with no endpoints.
- DNS: the name must be in `aliases` in `terraform/unifi/dns/records.tf`.
- TLS: `kubectl -n traefik get certificate`. The `*.local.bigd.no` wildcard covers one label.
- Traefik private gateway: `kubectl -n traefik get pods` and its logs.

Remove a host from the `internal-sites` Probe when it moves to KEDA scale to zero. Otherwise
the probe keeps it awake.

## User journeys

### UserJourneyFailing

A real browser signed in as the synthetic user failed the same step of a user journey on
two runs in a row ([README.md](README.md#user-journeys)).

Users probably see the same failure, even when the site's probes are green.

- The step and the page URL it failed on: `kubectl -n synthetics logs job/<newest
  logeverylift-journey-*>`, line `step <name> failed at <url>`.
- A fresh run: `kubectl -n synthetics create job journey-manual
  --from=cronjob/logeverylift-journey`.
- The latest logeverylift promotion: Kargo project `logeverylift-cd` and its newest
  `kargo/promotion/prod` PR. A failure directly after a deploy is a regression. Roll back:
  promote the previous Freight.
- Only `login` fails: check the synthetic user's password or the account itself before the
  app.
- `open-workout` fails: the synthetic user's program was renamed, deleted or emptied.

Delete `journey-manual` when done.

### UserJourneyNotRunning

No logeverylift journey result has reached Prometheus for 30 minutes.
`UserJourneyFailing` cannot fire.

- `kubectl -n synthetics get cronjob,jobs,pods`. An OOMKilled pod is Chromium over its 1 GiB.
- `kubectl -n synthetics get externalsecret`: the password must sync.
- The job log ends in a remote-write error: check the `synthetics` rule in the `prometheus`
  CiliumNetworkPolicy, or `enableRemoteWriteReceiver` in the chart values.

## NAS

### NasDiskUnhealthy

DSM reports a disk as not normal.

No impact while the RAID holds. A second failure loses data.

Check Storage Manager > HDD/SSD on nas.local.bigd.no and replace the disk.

### NasRaidDegraded

DSM reports the RAID as not normal.

The NAS holds the media, every NFS volume and every backup. First stop all writes to it.
Then check Storage Manager on nas.local.bigd.no.

### NasVolumeAlmostFull

Volume 1 is over 90 % full. It holds the media, the cluster volumes and every backup.

Writes, including backups, fail when it fills.

Free space: old media first, then backup retention on PBS
([`../backups/pbs.md`](../backups/pbs.md)).

### NasVolumeFillingUp

At the rate of the last 6 hours, Volume 1 is full within 4 days. This alert fires before
`NasVolumeAlmostFull` when something writes fast. The usual causes are a large download, a
backup that grew, or a log that grows without limit.

Find the writer before you free space. DSM > Storage Manager > Volume 1 shows usage per
shared folder. The cluster volumes are under the `k8s-volumes` share. The same fixes as for
[NasVolumeAlmostFull](#nasvolumealmostfull) apply.

### NasMetricsDown

Prometheus has not reached the NAS over SNMPv3 for 30 minutes. The NAS alerts are blind.

- `kubectl -n monitoring logs deploy/snmp-exporter`
- DSM > Terminal & SNMP: check that SNMP is still on and that user `snmp-exporter` still
  exists.

## Proxmox

### ProxmoxHostDown

The Proxmox cluster reports a host offline for 5 minutes. Its Talos VMs are down with it.

Pods on those VMs reschedule, except those pinned to the node (the GPU node, proxmox-local
PVCs).

Check the host's power and network, then the Proxmox UI. See
[`../cluster/proxmox.md`](../cluster/proxmox.md).

### ProxmoxStorageAlmostFull

A Proxmox storage is over 85 % full. `local-lvm` holds the proxmox-local PVCs, where
Proxmox CSI leaves orphaned volumes. `pbs` holds every VM backup.

- For `local-lvm`, compare `lvs` on the host with `kubectl get pv`. Volumes with no PV
  are orphans ([`../storage/README.md`](../storage/README.md#deleting-a-pvc)).

### ProxmoxStorageFillingUp

At the rate of the last 6 hours, a Proxmox storage is full within 4 days.

- `local-lvm`: a PVC on `proxmox-local` grows, or orphaned volumes accumulate. Check as
  for [ProxmoxStorageAlmostFull](#proxmoxstoragealmostfull).
- `pbs`: backups grow faster than prune and GC remove them
  ([`../backups/pbs.md`](../backups/pbs.md)).

### ProxmoxMetricsDown

Prometheus has not reached the Proxmox API for 30 minutes. The Proxmox alerts are blind.

- `kubectl -n monitoring logs deploy/pve-exporter`
- Check that the `prometheus@pve` token in Bitwarden is still valid.

### ProxmoxHostHot

A host's CPU has been above 90 °C for 10 minutes. The i5-11400T throttles at 100 °C.

Workloads on that host slow down.

Check for a blocked fan or dust, and find what loads the host.

### ProxmoxSensorsDown

Prometheus has not reached node-exporter on any Proxmox host for 30 minutes. ProxmoxHostHot
is blind.

- `systemctl status prometheus-node-exporter` on the hosts.
- `terraform/proxmox/hyper-cluster/datacenter/sensors.tf` installs it.
