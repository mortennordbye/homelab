# LinkGraph

LinkGraph shows who you know where, from your own LinkedIn data export. The cluster copy is for
lookups on the phone at events: a person, a company, and your notes on them. The separate
`mortennordbye/linkgraph` repo builds its image, `ghcr.io/mortennordbye/linkgraph`. The
manifests live in
[`k8s/talos/apps/linkgraph/`](../../../k8s/talos/apps/linkgraph/kustomization.yaml).

| | |
|---|---|
| URL | `https://linkgraph.local.bigd.no` |
| Namespace | `linkgraph` |
| Delivery | Kargo project `linkgraph-cd`, straight to prod through a promotion PR ([`../../platform/delivery/kargo.md`](../../platform/delivery/kargo.md)) |
| Backup | VolSync, nightly at 01:45 ([`../../platform/backups/README.md`](../../platform/backups/README.md)) |

## Get the export into the app

1. Request the export from LinkedIn. The steps are in the linkgraph README,
   [Get your LinkedIn data](https://github.com/mortennordbye/linkgraph#get-your-linkedin-data).
   Tick at least **Connections** and **Messages**. LinkedIn emails you after about 10 minutes.
2. Download the zip. On an iPhone, open the LinkedIn link in Safari, not in the LinkedIn app.
   The zip goes to **Files** > **Downloads**.
3. Open `https://linkgraph.local.bigd.no`, press **Import zip** in the header and pick the file.
   The app saves it to the volume and loads it. Older exports stay in the **Export** menu.

To install it as an app, choose **Share** > **Add to Home Screen** in Safari.

## Pod

One replica with `Recreate`, because the data PVC is ReadWriteOnce
([`deployment.yaml`](../../../k8s/talos/apps/linkgraph/deployment.yaml)). It runs as uid 1000,
`fsGroup: 1000`, with all capabilities dropped. `LINKGRAPH_ALLOWED_HOSTS` adds the hostname to
the app's Host-header allowlist; without it every request gets a 400.

## Storage

| Mount | Source | Holds |
|---|---|---|
| `/data` | PVC `linkgraph-data-pvc`, 5Gi, `syno-nfs-csi` | `exports/` (imported zips), `linkgraph-notes.json` (statuses, notes, merges), `logo-cache/` |

VolSync backs it up with restic to `/volume1/k8s-backups/volsync` on the NAS
([`volsync.yaml`](../../../k8s/talos/apps/linkgraph/volsync.yaml)).

## Exposure

The HTTPRoute attaches to `traefik-gateway-private` only. The app is reachable from the LAN and
over Tailscale, not from the internet. The app has no login and nothing in this repo puts one in
front of it, so every device on the LAN and the tailnet can read the contacts and messages.
Never give it a route on the public gateway. The internal DNS alias is in
`terraform/unifi/dns/records.tf`.

The CiliumNetworkPolicy allows ingress on 8765 from Traefik and the host. Egress is DNS and
https to public addresses only, for **Fetch logos**
([`ciliumnetworkpolicy.yaml`](../../../k8s/talos/apps/linkgraph/ciliumnetworkpolicy.yaml)).
