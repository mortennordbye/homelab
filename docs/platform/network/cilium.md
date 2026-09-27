# Cilium

Cilium is the CNI, replaces kube-proxy, announces the LoadBalancer VIPs on L2 and applies
the CiliumNetworkPolicies, in audit mode. It runs in `kube-system` from the Helm chart
in [`kustomization.yaml`](../../../k8s/talos/infra/cilium/kustomization.yaml) with
[`values.yaml`](../../../k8s/talos/infra/cilium/values.yaml). Cilium's own Gateway API
support is off; Traefik handles ingress ([`traefik.md`](traefik.md)).

## Bootstrap

Talos boots with `cni: none` and `proxy.disabled`, so no node becomes Ready until Cilium
runs. Terraform installs the first release from the same `values.yaml` and then applies the
IP pool and L2 policies with kubectl
([`k8s-cilium.tf`](../../../terraform/proxmox/hyper-cluster/k8s/talos/k8s-cilium.tf)). It
ignores later changes to version and values, and Argo CD owns the release from then on.
See [`../cluster/talos.md`](../cluster/talos.md).

Settings that tie Cilium to Talos:

- `k8sServiceHost: localhost`, `k8sServicePort: 7445`: the API through KubePrism.
- `ipam.mode: kubernetes`: Talos assigns the node pod CIDRs.
- `ipv4NativeRoutingCIDR: 10.244.0.0/16` must equal the cluster pod subnet. That is the
  Talos default; `talos-cluster.tf` does not override it. Native routing is required for
  the DSR load balancer mode (`loadBalancer.mode: dsr`, `algorithm: maglev`).
- `bpf.hostLegacyRouting: true`: Talos forwards kube-dns to the host DNS, which breaks
  without it.
- `cgroup.autoMount.enabled: false` with `hostRoot: /sys/fs/cgroup`: reuse the Talos mount.
- The agent's capability list leaves out `SYS_MODULE`; Talos does not let workloads load
  kernel modules.
- The operator tolerates every taint (`operator.tolerations: [{operator: Exists}]`). Nodes
  stay NotReady until Cilium runs, so the operator has to schedule on NotReady nodes during
  bootstrap. It runs two replicas with a PDB.

## L2 announcements and LB IPAM

`CiliumLoadBalancerIPPool` `default-pool` hands out `10.3.10.100/29`
([`loadbalancer-ippool.yaml`](../../../k8s/talos/infra/cilium/loadbalancer-ippool.yaml)). The
assigned VIPs are listed in [`README.md`](README.md). Services pin their address with the
`lbipam.cilium.io/ips` annotation.

Three `CiliumL2AnnouncementPolicy` objects
([`l2-announcement-policy.yaml`](../../../k8s/talos/infra/cilium/l2-announcement-policy.yaml))
decide which nodes answer ARP for a VIP:

| Policy | Services | Nodes |
| --- | --- | --- |
| `traefik-public-l2-policy` | label `network.nordbye.it/vip: public` | workers |
| `traefik-private-l2-policy` | label `network.nordbye.it/vip: private` | control planes |
| `default-l2-policy` | every Service without the label | all |

The Traefik VIPs get disjoint node sets so one bad node cannot take both gateways down. A
new LoadBalancer Service with no label falls under the default policy.

After any change that rolls the agent DaemonSet, check the BPF LB map on each node, see
[`../observability/incidents.md`](../observability/incidents.md).

## Hubble

Hubble, the relay and the UI are on. The UI is at `hubble.local.bigd.no` on the private
gateway ([`httproute-hubble.yaml`](../../../k8s/talos/infra/cilium/httproute-hubble.yaml)).
Hubble metrics, including policy verdicts per workload and namespace, go to Prometheus on
port 9965; agent, operator and Envoy metrics are on 9962, 9963 and 9964.

Hubble's TLS certificates are issued in-cluster by certgen (`hubble.tls.auto.method:
cronJob`), not by Helm, which would mint a new CA on every render and rotate it under the
agents on each Argo CD sync. Leaves are valid for 365 days (`certValidityDuration`) and
reissued by the cron schedule `0 0 1 */4 *`. The leaf lifetime must end before the CA's
(`tls.ca`, three years) or certgen refuses to issue.

## Network policies

Every app namespace except `home-assistant`, and most infra namespaces, has a
`ciliumnetworkpolicy.yaml`. List them with `kubectl get ciliumnetworkpolicy -A`.
`policyAuditMode: true` is a single agent-wide setting: drops are logged as `AUDIT`
verdicts in Hubble and counted in `hubble_policy_verdicts_total`, not enforced. The move to
enforcement is tracked in `docs/backlog/README.md`.

Cilium default-denies a direction only once a policy has a rule for it. An ingress-only
policy leaves egress open.

A new app's policy, copied from the one closest to it:

- Ingress from Traefik on the container port. Every app uses the same selector:

  ```yaml
  - fromEndpoints:
      - matchLabels:
          "k8s:io.kubernetes.pod.namespace": traefik
          "k8s:app.kubernetes.io/instance": traefik-traefik
    toPorts:
      - ports:
          - port: "8080"
            protocol: TCP
  ```

- Ingress from the KEDA interceptor as well if the app scales to zero, and always
  `fromEntities: [host, health]` for probes.
  [`it-tools/ciliumnetworkpolicy.yaml`](../../../k8s/talos/apps/it-tools/ciliumnetworkpolicy.yaml)
  has all three.
- No egress rules if the app needs broad outbound access, as
  [`verksted/ciliumnetworkpolicy.yaml`](../../../k8s/talos/apps/verksted/ciliumnetworkpolicy.yaml).
- For restricted egress, allow DNS to `kube-dns` with an L7 `dns` rule and then
  `toFQDNs` for the external names.
  [`external-dns/ciliumnetworkpolicy.yaml`](../../../k8s/talos/infra/external-dns/ciliumnetworkpolicy.yaml)
  is the template. Without the `rules.dns` block Cilium never learns the addresses behind a
  name, and the `toFQDNs` rule matches nothing.
- Prometheus scrapes come from pods labelled `app.kubernetes.io/name: prometheus` in
  `monitoring`.

Check a new policy by looking for audited flows involving the app, in Hubble or with this
query in Prometheus:

```promql
sum by (source, destination, direction) (increase(hubble_policy_verdicts_total{action="audit", destination_namespace="<ns>"}[1h]))
```

In that metric `destination` is the pod the policy applies to and `source` is the peer, in
both directions.
