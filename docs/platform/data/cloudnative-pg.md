# CloudNativePG and Garage

The CloudNativePG operator runs Postgres as `Cluster` resources, and Garage is the
in-cluster S3 store their base backups and WAL archive go to.

## Operator

`k8s/talos/infra/cloudnative-pg/` renders two charts into `cnpg-system`:

- `cloudnative-pg`: the operator and its CRDs (`postgresql.cnpg.io`). Its own metrics
  are scraped through the chart's PodMonitor.
- `plugin-barman-cloud`: the Barman Cloud plugin and its `ObjectStore` CRD
  (`barmancloud.cnpg.io`). It must run in the operator's namespace. It gets its TLS
  certificates from a self-signed cert-manager `Issuer` the chart creates, and it adds
  a sidecar to every instance pod of a `Cluster` that names it under `plugins`; that
  sidecar is what writes to S3.

Both pin their image tag to the chart's `appVersion`, so a chart bump is the image bump.
CRD changes ride along through `includeCRDs`.

## Garage

`k8s/talos/infra/garage/` runs a single-node Garage (`replication_factor = 1`) in the
`garage` namespace. The S3 endpoint is `http://garage.garage.svc:3900`, region `garage`,
path-style addressing.

| Volume | Class | Holds |
|---|---|---|
| `garage-data` | `syno-nfs-csi` | object blocks under `data/`, metadata snapshots under `meta-snapshots/` |
| `garage-meta` | `proxmox-local` | the live LMDB metadata |

LMDB corrupts on NFS, so the metadata lives on block storage and Garage snapshots it to
the NAS volume every 6 hours. Everything a restore needs is therefore on the NAS, under
its Btrfs snapshots and the Hyper Backup offsite copy
([`../backups/README.md`](../backups/README.md)).

The pod runs as uid 1000 with `fsGroup: 1000`. The NFS driver's `File` fsGroupPolicy
lets kubelet hand the fresh, root-only NAS directory to that group on first mount
([`../storage/README.md`](../storage/README.md#synology-nfs)).

The network policy admits S3 only from CloudNativePG pods (any pod labelled
`cnpg.io/cluster`, which covers recovery jobs) in the namespaces listed there. A new database namespace
has to be added to it.

### Secrets

| Bitwarden secret | Used by |
|---|---|
| `garage-rpc-secret` | Garage RPC, `garage-secrets` in `garage` |
| `garage-admin-token` | admin API, `garage-secrets` in `garage` |
| `garage-logeverylift-access-key-id`, `garage-logeverylift-secret-access-key` | the S3 key for logeverylift's bucket |

### Bootstrap

The cluster layout, buckets and keys are Garage state, not manifests. On a new or
rebuilt Garage, run once from the laptop:

```bash
export KUBECONFIG=~/Documents/Code/github/Homelab/terraform/proxmox/hyper-cluster/k8s/talos/kubeconfig
garage() { kubectl exec -n garage deploy/garage -- /garage "$@"; }

NODE=$(garage node id -q | cut -d@ -f1)
garage layout assign -z homelab -c 20G "$NODE"
garage layout apply --version 1
garage status
```

Then per database, a bucket and a key imported from Bitwarden, so the ID and secret
never pass through the terminal:

```bash
bws_get() { BWS_ACCESS_TOKEN=$(bws-token) bws secret get "$1" --output json | jq -r .value; }

garage bucket create cnpg-logeverylift
garage key import --yes -n logeverylift \
  "$(bws_get 5e61c8e6-3642-4bbc-8a6a-b4f400f0eb33)" \
  "$(bws_get 48d4180c-091c-48ec-8971-b4f400f0ecb3)" > /dev/null
garage bucket allow --read --write --owner cnpg-logeverylift --key logeverylift
```

`garage bucket info cnpg-logeverylift` shows its size and object count.

### Emptying a server's prefix

A new Cluster refuses to archive into a prefix that already holds WAL, so a Cluster
recreated under the same `serverName` (after a failed cutover, say) needs its old
prefix removed first. Garage has no CLI for objects; use any S3 client through a
port-forward, which the network policy admits as host traffic:

```bash
kubectl port-forward -n garage svc/garage 13900:3900 &
bws_get() { BWS_ACCESS_TOKEN=$(bws-token) bws secret get "$1" --output json | jq -r .value; }
docker run --rm \
  -e AWS_ACCESS_KEY_ID="$(bws_get 5e61c8e6-3642-4bbc-8a6a-b4f400f0eb33)" \
  -e AWS_SECRET_ACCESS_KEY="$(bws_get 48d4180c-091c-48ec-8971-b4f400f0ecb3)" \
  -e AWS_DEFAULT_REGION=garage amazon/aws-cli:2.27.50 \
  --endpoint-url http://host.docker.internal:13900 \
  s3 rm --recursive s3://cnpg-logeverylift/<serverName>/
```

### Restoring Garage itself

If `garage-meta` is lost, point `metadata_dir` at a copy of the newest directory under
`meta-snapshots/` (or restore the PVC and copy it in), start Garage, and the objects on
the NAS are readable again. If the NAS volume is lost, restore `garage-data` from the
Btrfs snapshot or Hyper Backup first.
