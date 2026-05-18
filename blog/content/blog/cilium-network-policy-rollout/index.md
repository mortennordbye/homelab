---
title: "Locking Down Your Cluster: Rolling Out Cilium Network Policies Without Breaking Everything"
date: 2026-05-16
draft: false
tags: ["kubernetes", "cilium", "network-policy", "ebpf", "hubble", "platform-engineering", "intermediate"]
authors:
  - name: Morten Victor Nordbye
---

# Locking Down Your Cluster: Rolling Out Cilium Network Policies Without Breaking Everything

<img src="/images/cilium-logo.svg" alt="Cilium" title="Cilium" style="width:30%;" />

Here is an uncomfortable truth about your Kubernetes cluster.

Right now, anything in `default` can open a TCP connection to anything in any other namespace. Your database Service? Reachable. Your internal admin UI? Reachable. That prototype someone deployed and never cleaned up? Yes, that too. Kubernetes ships flat by default. Cilium will happily run that flat network forever unless you tell it not to.

Here is how I locked it down.

_If you want to see how I did it, feel free to look at [my Homelab repo](https://github.com/mortennordbye/Homelab)._

Whether you are on-call, defending a design review, or running a homelab, the failure mode is the same. One compromised pod gets a free walk through every other one in the cluster. Different stakes, same broken default.

## Why CiliumNetworkPolicy, Not Just NetworkPolicy

Most of us picked Cilium because it was the buzzword CNI of the moment. eBPF, identities, Hubble, all the boxes ticked. Then we let it sit there routing packets and never touched the half that justified the install. This post is about that half.

Two options here.

The built-in `NetworkPolicy` resource is a fine starting point. It works on any CNI that supports it, which is most of them. The problem is that it speaks in IP/CIDR ranges and pod label selectors, and that's pretty much it. No L7. No DNS-aware egress. No identity-based reasoning. You will spend the first hour figuring out your pod CIDR and the next hour wondering why your policies don't behave the way you'd expect.

`CiliumNetworkPolicy` (and its cluster-scoped sibling `CiliumClusterwideNetworkPolicy`) is the one you want. It speaks in **identities**. A Cilium identity is roughly "the set of pods that share these labels," and Cilium tracks them across the cluster. Rules read like "any pod with `app=webapp` in namespace `webapp` may receive TCP on port 3000 from any pod in namespace `traefik`." No CIDRs. No fragility when the IPAM block changes.

It also gives you more vocabulary. L7 rules (HTTP path and method matching, Kafka topic matching), `toFQDNs` egress (allow this pod to reach `api.github.com` and nothing else), and live policy-verdict visibility through [Hubble](https://docs.cilium.io/en/stable/observability/hubble/).

If you're on Cilium already, write `CiliumNetworkPolicy`.

## Start With Hubble

Do not write a single policy before you can see traffic.

The fastest way to lock yourself out of your own cluster is to write a "deny everything except Traefik" policy and discover that your apps were quietly hitting an internal service you forgot about. Hubble shows you, in real time, which pod is talking to which, on which port, with what verdict.

Enabling Hubble in Cilium is mostly a values-file change. From my [`cilium/values.yaml`](https://github.com/mortennordbye/Homelab/blob/main/k8s/talos/infra/cilium/values.yaml):

```yaml
hubble:
  enabled: true
  metrics:
    enabled:
      - dns:query;answer    # capture both DNS questions and answers, not just queries
      - drop
      - tcp
      - flow
      - icmp
      - httpV2              # L7 HTTP visibility; "V2" is the current Cilium-side format
    enableOpenMetrics: true
    port: 9965              # non-default; matches the ServiceMonitor below
    serviceMonitor:
      enabled: true
      labels:
        release: kube-prometheus-stack   # must match your kube-prometheus-stack release label
  dashboards:
    enabled: true           # installs the Grafana dashboards as ConfigMaps
  ui:
    enabled: true
    rollOutPods: true       # force pod restart when values change, so config drifts can't sneak through
  relay:
    enabled: true
    rollOutPods: true
```

This gives you three things:

1. **Hubble Relay**. A gRPC service that aggregates per-node flow data into a cluster-wide view.
2. **Hubble UI**. A web app that draws a live service map, with red lines for drops and green for allowed flows.
3. **Hubble metrics**. Prometheus-scrapeable flow counts, broken down by protocol, verdict, identity. The accompanying Grafana dashboards are worth installing.

If you also use Gateway API or Traefik like I do, expose Hubble UI through an HTTPRoute behind whatever dashboard URL you use.

<img src="/images/hubble-service-map.png" alt="Hubble service map of the argocd namespace" title="Hubble UI service map" style="width:100%;" />

That's the `argocd` namespace in my cluster. Traefik fronts `argocd-server`, the ArgoCD components chat among themselves, Prometheus scrapes for metrics, and outbound calls land on `world` (Cilium's identity for the public internet).

The `world → 443` arrow is ArgoCD reaching out to GitHub for manifests. That is legitimate egress. ArgoCD has to talk to GitHub to do its job, so the job is to scope that dependency, not block it. An FQDN egress rule does exactly that. Worked example further down in "Locking ArgoCD to GitHub".

Every flow in the diagram is `forwarded`. No surprise sources. This is the picture you want of every namespace before you trust your policies.

CLI access is just as useful for grepping flows:

```bash
kubectl -n kube-system exec ds/cilium -- \
  hubble observe --server hubble-relay.kube-system.svc:80 \
  --namespace blog --last 200 -o compact   # everything that hit the blog pod recently
```

Note the `--server` flag pointing at the relay service. Without it, `hubble observe` from inside a Cilium agent pod only sees that one node's flows.

## Anatomy of a Policy

The blog you are reading right now is governed by the `CiliumNetworkPolicy` below. Your request hit Traefik, Traefik forwarded it to the blog pod on TCP/80, the policy waved it through. Anything else would be dropped, though the cluster is still in audit mode while I roll out the ArgoCD egress, so those blocks currently surface as `AUDIT` in Hubble. Here is the [actual file in the repo](https://github.com/mortennordbye/Homelab/blob/main/k8s/talos/apps/blog/ciliumnetworkpolicy.yaml):

```yaml
apiVersion: "cilium.io/v2"
kind: CiliumNetworkPolicy
metadata:
  name: blog-policy
  namespace: blog
spec:
  endpointSelector:
    matchLabels:
      app.kubernetes.io/name: blog
  ingress:
    - fromEndpoints:
        - matchLabels:
            "k8s:io.kubernetes.pod.namespace": traefik
            "k8s:app.kubernetes.io/instance": traefik-traefik
      toPorts:
        - ports:
            - port: "80"
              protocol: TCP
    - fromEntities:
        - host
        - health
```

Top to bottom, what the policy does.

**endpointSelector**

Picks which pods the policy applies to. Here, pods labelled `app.kubernetes.io/name: blog` in the blog namespace. The moment Cilium matches a pod, that pod flips into default-deny for the directions named in the spec. Here, that means ingress only.

**ingress.fromEndpoints**

The allow rule. Any pod in the traefik namespace with `app.kubernetes.io/instance=traefik-traefik` may send TCP on port 80 to a blog pod. That's the Traefik DaemonSet, and the rule your HTTP request just rode.

**toPorts.port**

The container port, not the Service port. Cilium's eBPF kube-proxy replacement does the DNAT itself, before policy evaluation, so the policy sees the port the container actually listens on (`targetPort` in Service-speak). If your Service maps port 8080 to targetPort 3000, the policy needs 3000. (If you run Cilium without kube-proxy replacement enabled, kube-proxy still handles the DNAT and the ordering can differ; verify with Hubble before assuming.) This trips up everyone.

**fromEntities: host and health**

Two infra entities that still need to reach your pod. `host` covers kubelet probes from the node; skip it and your pod fails its liveness check and goes NotReady twenty minutes into the rollout. `health` covers Cilium's own node-to-node health checks. Less critical, but free.

Five fields, 80% of the policies you'll ever write.

> A quick note on labels you'll see further down. Cilium imports every Kubernetes label with the `k8s:` prefix and matches with or without it. Both forms work. Prefix everything with `k8s:` if you want to be strict.

## Internal DNS vs Public Hostname

Imagine you wire a dashboard app to fetch a status feed from Grafana. You have two reasonable ways to address Grafana:

1. **Internal:** `http://grafana.monitoring.svc.cluster.local:3000/api/health`
2. **Public:** `https://grafana.example.com/api/health`

These look like they should behave identically. They do not.

In path 1, the dashboard pod resolves the in-cluster Service DNS, the packet goes directly to a Grafana pod, and Grafana sees the source identity as `dashboard`. To allow this, you need a `CiliumNetworkPolicy` on Grafana that explicitly accepts ingress from the `dashboard` namespace.

In path 2, the dashboard pod resolves the public hostname, gets back the LoadBalancer IP your cluster announces on the LAN, sends the packet there, and Cilium **hairpins** it. The traffic gets pulled back into the cluster, DNATs to Traefik, and Traefik proxies the request to Grafana. From Grafana's view, the source is Traefik. The "dashboard → monitoring" cross-namespace rule you so carefully wrote is dead code, because that traffic never arrived as `dashboard`.

This is not academic. I caught myself writing a bunch of cross-namespace allows for callers that were, in fact, going out the public ingress and right back in. The rules were harmless. They just weren't doing anything.

The fix is not policy-side. The fix is to **look at what Hubble tells you**:

```bash
hubble observe --namespace monitoring --to-label app.kubernetes.io/name=grafana --last 200 -o compact
```

If every source is `traefik/traefik-traefik-...`, your traffic hairpins through the public ingress. Your "Traefik → Grafana" rule already covers it. If you see `dashboard/dashboard-...` as a source, the call goes via internal DNS and you need an explicit cross-namespace allow.

Hubble is not optional. Hubble is the test suite for your policies.

## Multi-Tier Apps

The single-pod pattern (Traefik → app) takes you a long way. Eventually you'll want to lock down a tiered app with its own database. The Tier 1 rule is the same shape as the blog policy above, just on the app's container port. The new pattern is Tier 2, where the database accepts ingress only from the app pod that sits in front of it:

```yaml
apiVersion: "cilium.io/v2"
kind: CiliumNetworkPolicy
metadata:
  name: webapp-db-policy
  namespace: webapp
spec:
  endpointSelector:
    matchLabels:
      app: postgres                            # this policy applies to the postgres pod
  ingress:
    - fromEndpoints:
        - matchLabels:
            "k8s:io.kubernetes.pod.namespace": webapp
            app: webapp                        # only the app tier may reach the db
      toPorts:
        - ports:
            - port: "5432"                     # postgres listens here
              protocol: TCP
    - fromEntities:
        - host
        - health
```

The namespace match is technically redundant in a `CiliumNetworkPolicy`. The resource is namespace-scoped, so `fromEndpoints` only matches pods in the same namespace anyway. I leave the label in because it makes the intent unmissable on copy-paste. It also matters if you ever promote this rule to a `CiliumClusterwideNetworkPolicy`, where the namespace label flips from redundant to load-bearing: drop it in a CCNP and the database starts accepting traffic from any namespace that happens to have a pod labelled `app: webapp`.

Postgres is now unreachable from anywhere except its own app. Not from another namespace, and not even from a pod in the same namespace that doesn't carry the `app: webapp` label. The blast radius is one pod and the database it speaks to.

This is the pattern. Replicate it everywhere you have an app with a backend.

## The Safety Net: `policyAuditMode`

This is the trick that turns "ship the policy and hope" into a confident rollout.

Cilium has a global setting called `policyAuditMode`. When it's enabled, your CiliumNetworkPolicies are **still evaluated**, but drops are only **logged**, not enforced. Every flow that would have been blocked shows up in Hubble with the verdict `AUDIT` instead of `DROP`.

One thing to know before you flip the switch. `policyAuditMode` is cluster-wide and applies to every policy Cilium enforces, including standard Kubernetes `NetworkPolicy` resources (Cilium translates those into CNP-equivalents internally). If you already have existing `NetworkPolicy` resources doing real isolation work, turning on audit mode opens those holes too for the duration of the window. Plan the audit-mode window around that, and keep it short. Long audit windows also accumulate `AUDIT` events on every node, which loads the Cilium agents over time.

In `cilium/values.yaml`:

```yaml
# Policy audit mode. TEMPORARY.
# When true, CiliumNetworkPolicies are evaluated but drops are *logged only*
# (Hubble verdict: AUDIT) rather than enforced. Use to vet new policies
# without risk of breakage. Flip back to false once Hubble shows zero AUDIT
# events for normal workflows.
policyAuditMode: true
```

Roll it out. Commit. Push. ArgoCD reconciles, the Cilium agents restart, and now every policy in the cluster runs in dry-run.

Give the agents a minute to finish reconciling before you check. Running the next command too early returns the old config. `kubectl -n kube-system rollout status ds/cilium` if you want to be sure.

Confirm it took:

```bash
kubectl -n kube-system exec ds/cilium -- cilium-dbg config | grep -i policyauditmode
# expect: PolicyAuditMode: Enabled
```

Then drive a pipe of `AUDIT` events out of Hubble while you exercise your apps. Reload this post. If anything in the blog policy were incomplete, the request would surface here.

```bash
kubectl -n kube-system exec ds/cilium -- \
  hubble observe --server hubble-relay.kube-system.svc:80 \
  --verdict AUDIT -f -o compact
```

Every line is a flow that would have been dropped. Each one is either:

- A legitimate flow you forgot to allow (add it to the policy), or
- An unwanted flow you didn't realise was happening (decide what to do with it).

The second category is the underrated win.

## Locking ArgoCD to GitHub

The other half of locking down a namespace is egress. Most pods talk to one or two external destinations and have no business reaching anywhere else. ArgoCD is a clean example. It has to pull manifests from GitHub, talk to the Kubernetes API, and chat with its own internal components. That is it.

The GitHub part of the [argocd CNP](https://github.com/mortennordbye/Homelab/blob/main/k8s/talos/infra/argocd/ciliumnetworkpolicy.yaml) I run in this cluster:

```yaml
egress:
  - toFQDNs:
      - matchPattern: "*.github.com"            # api.github.com, codeload.github.com, etc.
      - matchPattern: "*.githubusercontent.com" # raw.githubusercontent.com for raw files
    toPorts:
      - ports: [{ port: "443", protocol: TCP }]
  - toEndpoints:
      - matchLabels:
          k8s:io.kubernetes.pod.namespace: kube-system
          k8s:k8s-app: kube-dns
    toPorts:
      - ports: [{ port: "53", protocol: ANY }]   # DNS companion rule, see below
```

Cilium enforces this by snooping DNS responses and minting ephemeral identities for the resolved IPs. The full policy in the repo also allows the Kubernetes API and internal argocd-to-argocd traffic, but the FQDN chunk above is the interesting part.

The DNS rule is not decoration. `toFQDNs` works by snooping DNS responses, so the pod has to be allowed to reach CoreDNS first. Without that allow, the resolver call fails before Cilium ever sees an answer to learn the IP from, and the FQDN rule never gets a chance to match. Every FQDN egress rule needs a DNS companion rule.

I rolled this policy out under `policyAuditMode: true`. Any ArgoCD flow my rules do not cover surfaces as an `AUDIT` verdict in Hubble rather than breaking sync. As I write this, the audit stream is what I am watching. Once it stays quiet through a few sync cycles I will flip the mode and let the policy enforce. The same pattern fits any pod with a narrow external scope: CI runners, backup uploaders, webhook senders.

## The Rollout Pattern

1. **Enable Hubble** and confirm you can stream flows from the relay. Leave the UI open.
2. **Pick one low-stakes namespace.** The blog you are reading was mine. One pod, one allowed source, nobody cries if it goes down for a minute. Write a single policy following the anatomy above.
3. **Turn on `policyAuditMode: true`** cluster-wide. From this point you cannot accidentally break anything with a policy, because nothing is enforced.
4. **Ship all the policies you want to apply** via GitOps in one batch. Commit, push, let ArgoCD reconcile.
5. **Use the apps normally for a day or two.** Browse, log in, schedule a thing, kick off a backup. Whatever your usage looks like.
6. **Tail `hubble observe --verdict AUDIT -f`.** Every entry is a hole in your policies. Fix them.
7. **Set `policyAuditMode: false`.** Policies now enforce for real. Hubble verdicts flip from `AUDIT` to either `FORWARDED` or `DROPPED`.
8. **Optional but recommended.** Add a cluster-wide `CiliumClusterwideNetworkPolicy` that default-denies all ingress except DNS to `kube-system/coredns`. Put both rules in the same policy resource so the DNS allow is live the instant the default-deny lands; applying them in two passes will drop cluster DNS between them. New namespaces now start secure-by-default.

The whole rollout took me about three days of relaxed observation. The audit-mode window meant zero outages.

## Common Mistakes to Avoid

I have made every one of these. So have you, probably.

**Putting the Service port in `toPorts` instead of the container port.** The policy match is on `targetPort`, not the Service `port`. A `port: 8080 → targetPort: 3000` Service needs `port: "3000"` in the CNP. If your policy looks right but flows are still being dropped, this is the first thing to check.

**Forgetting `fromEntities: host`.** Without it, kubelet probes get refused as soon as enforcement turns on, the pod is marked NotReady, and the Service stops sending traffic to it. Always include `host` on ingress rules for pods with health probes.

**Skipping audit mode entirely.** "I'll just write good policies." No, you won't. There is always one app calling another in a way you forgot about. Audit mode is free. Use it.

**Writing CIDR-based rules instead of endpoint selectors.** It works, but you've thrown away the half of Cilium that makes Cilium worth the install. Endpoint selectors are robust to IPAM churn, more readable, and L7-extensible.

**Assuming everything talks via internal DNS.** It doesn't. Most apps end up wired with their public ingress hostnames because that's what the engineer setting them up typed into the UI. Those calls hairpin through your ingress controller and show up to the destination as ingress-controller traffic. Hubble tells you which is which. Trust it.

## What's Next?

The ArgoCD FQDN policy above gives you the pattern for one narrow-scope pod. There's more you can do once your ingress and egress are both clean.

**Transparent encryption on the wire.** One flag in Cilium values turns on WireGuard between nodes:

```yaml
encryption:
  enabled: true
  type: wireguard
  nodeEncryption: true   # also encrypts host-network traffic between nodes (kubelet, etcd peers, etc.), not just pod-to-pod
```

All pod-to-pod traffic that crosses a node boundary is now WireGuard-encrypted. Trivial to enable. Most clusters skip it. There's no reason yours has to.

**Cluster-wide default-deny.** Once your per-namespace policies are clean, push a `CiliumClusterwideNetworkPolicy` that denies all ingress except DNS. New namespaces start secure-by-default, and "did I forget a policy?" stops being a question.

**Tetragon.** Cilium has a sibling project called [Tetragon](https://tetragon.io/) that does eBPF-based runtime security at the process level. Exec events, syscall filtering, file access, the works. Different mental model, complements your network policies. Worth a serious look once those are settled.

## Resources

- [Cilium docs, Network Policies](https://docs.cilium.io/en/stable/security/policy/). The canonical reference, well-organised.
- [Hubble docs](https://docs.cilium.io/en/stable/observability/hubble/). Covers the UI, the CLI, and the metrics export.
- [Cilium policy audit mode](https://docs.cilium.io/en/stable/security/policy-creation/#policy-audit-mode). The official write-up of the safety net we used.
- [The repository behind this post](https://github.com/mortennordbye/Homelab). Actual policies, Cilium values, everything. Steal what you like.

## Final Thoughts

Network policy used to be a thing you put off forever because the failure mode was "the cluster mysteriously stops working." Audit mode plus Hubble flips that. You ship policies you're 80% sure about, watch Hubble for a day, fix the 20% you got wrong, and turn enforcement on with no drama.

Default-flat is a Kubernetes convention. It is not a Kubernetes requirement. Lock yours down.

Now go open the Hubble tab.
