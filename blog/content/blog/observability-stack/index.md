---
title: "Seeing Into a Talos Cluster: The Observability Stack I Actually Run"
date: 2026-06-04
draft: false
tags: ["kubernetes", "observability", "prometheus", "grafana", "loki", "tempo", "falco", "intermediate"]
authors:
  - name: Morten Victor Nordbye
---

# Seeing Into a Talos Cluster: The Observability Stack I Actually Run

`kubectl logs` is not observability. It is a flashlight you point at one pod after you already know which pod broke.

By default a Kubernetes cluster tells you almost nothing. A pod flaps and recovers before you open a terminal. A certificate expires and the first sign is a browser warning. Something runs a shell inside a container at three in the morning and nobody hears about it. You find out when a user does.

The two ways people get this wrong are running nothing, or bolting on the full enterprise suite and drowning in dashboards nobody opens. This is the middle path. Three pillars (metrics, logs, traces) plus runtime security, each component earning its place by answering one question, all of it funnelling into a single screen.

_If you find this useful or just appreciate the over-engineering, drop a ⭐ on the [Homelab repo](https://github.com/mortennordbye/Homelab)._

This is the screen I check first when something feels off. One dashboard, every pillar, no clicking around.

<img src="/images/homelab-spog-dashboard.webp" alt="Homelab single pane of glass dashboard in Grafana, showing Traefik request rate, latency, 5xx rate and recent Loki errors" title="Homelab-SPOG dashboard" style="width:100%;" />

It is called Homelab-SPOG, for single pane of glass. The rest of this post is what sits behind each panel, and the one decision that mattered for each piece. Whether your cluster runs four pods or four hundred, the questions are the same. Only the blast radius changes.

## Metrics: What Is the Cluster Doing?

This is the foundation. [kube-prometheus-stack](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack) gives you Prometheus, Grafana, Alertmanager, node-exporter and kube-state-metrics in one Helm release that wires itself together.

The interesting part is not what I turned on. It is what I turned off.

**Full file:** [`kube-prometheus-stack/values.yaml`](https://github.com/mortennordbye/Homelab/blob/main/k8s/talos/infra/kube-prometheus-stack/values.yaml)

```yaml
prometheus:
  prometheusSpec:
    retention: 7d
    scrapeInterval: 30s          # 15s is the chart default; 30s halves the write load

## Minimal monitoring of k8s components
kubeApiServer:
  enabled: false
kubeControllerManager:
  enabled: false
kubeEtcd:
  enabled: false
kubeScheduler:
  enabled: false
kubeProxy:
  enabled: false                 # Cilium replaced kube-proxy; there is nothing to scrape
```

On Talos the control plane sits behind locked-down endpoints, and reaching etcd or the scheduler for scraping means extra wiring. At this scale their metrics tell me almost nothing I would act on. So I monitor what breaks workloads, not the managed control plane.

The kube-proxy line is the one worth pausing on. I run Cilium in kube-proxy replacement mode, and Talos starts no kube-proxy at all. So a `kubeProxy` scrape target is pointed at a process that does not exist. It is not a quiet target, it is a permanently failing one. I had it enabled for a while before I noticed, which is the small embarrassment that taught me to read my own scrape config against what is actually running. Network-drop visibility does not come from kube-proxy here anyway. It comes from Cilium, in the Cilium section of the same dashboard.

node-exporter and kube-state-metrics carry the weight. Here is what that buys you, the Node section of the same dashboard.

<img src="/images/homelab-spog-node.webp" alt="Per-node CPU, memory, disk and network panels across six Talos nodes, with one control-plane node memory gauge in the red at 90 percent" title="Per-node metrics from node-exporter" style="width:100%;" />

That genesis-ctrl-02 gauge reading 90.1% in the red is real, not a staged screenshot. Control-plane nodes run hot, and that gauge on the front page is exactly why I know to watch that one before it starts evicting pods. An honest dashboard shows you the thing you would rather not see.

One trade-off to copy with your eyes open. Retention is 7 days, on Synology NFS. NFS for the stateful control-plane components is a deliberate durability choice. It survives a node reboot, and metrics queries are infrequent enough that the network round-trip does not hurt.

## Logs: What Did It Say Before It Died?

Metrics tell you a pod restarted. They do not tell you why. For that you need the lines it printed on the way down.

[Loki](https://grafana.com/docs/loki/latest/) stores the logs. [Alloy](https://grafana.com/docs/alloy/latest/) collects them, a DaemonSet on every node that discovers pods through the Kubernetes API and ships their logs to Loki. If you remember Promtail, Alloy is its supported successor. Promtail reached end of life, so new clusters should start on Alloy.

The discipline that matters is label hygiene. Every label you attach becomes part of Loki's index, and a fat index is how Loki gets slow and expensive.

**Full file:** [`loki/alloy-values.yaml`](https://github.com/mortennordbye/Homelab/blob/main/k8s/talos/infra/loki/alloy-values.yaml)

```alloy
// Map k8s discovery metadata to stream labels.
// Keep this list short. Every label here becomes part of Loki's index.
discovery.relabel "pod_logs" {
  rule {
    source_labels = ["__meta_kubernetes_namespace"]
    target_label  = "namespace"
  }
  rule {
    source_labels = ["__meta_kubernetes_pod_name"]
    target_label  = "pod"
  }
  // ...container, app, k8s_app
}

mounts:
  varlog: true            # /var/log
  dockercontainers: true  # Talos uses containerd; reaches the symlinked log files
```

That `dockercontainers: true` line is the Talos gotcha. The name is a historical artifact. Talos runs containerd, not Docker, but the container log files still live behind the path that mount exposes. Leave it off and Alloy comes up healthy, discovers every pod, and ships nothing. No error, just an empty Loki. I lost an evening to that one.

The payoff is the "Recent errors (Loki)" panel on the dashboard up top. Those `GET /log/error.log` and `/errors/50x.html` lines returning 404 are not my apps misbehaving. They are bots probing the public ingress for files that do not exist. Metrics would have shown you a small bump in the 404 rate. The logs show you who, from where, looking for what. That is the difference between the two pillars in one panel.

Loki keeps 24 hours, on local block storage rather than NFS.

**Full file:** [`loki/values.yaml`](https://github.com/mortennordbye/Homelab/blob/main/k8s/talos/infra/loki/values.yaml)

```yaml
deploymentMode: SingleBinary   # one process; no microservices sprawl for a homelab
limits_config:
  retention_period: 24h
  reject_old_samples_max_age: 24h
persistence:
  size: 20Gi
  storageClass: "proxmox-local"  # local disk, not NFS: logs are high-write, low-value-after-a-day
```

Logs are written constantly and rarely read after a day. Local disk gives the write throughput, and if the disk dies I lose a day of logs I almost certainly was never going to open. That is an acceptable loss. Metrics get NFS, logs get local. The storage class encodes what I am willing to lose.

## Traces: Where Did the Request Actually Go?

A request comes in through Traefik, hits a service, which calls another service, which queries something. When it is slow, which hop ate the time? Metrics give you an aggregate. A trace gives you the single request, hop by hop.

[Tempo](https://grafana.com/docs/tempo/latest/) stores traces. Traefik emits them. Because Traefik already speaks OTLP (the OpenTelemetry wire protocol), Tempo only needs to listen for one protocol.

**Full file:** [`tempo/values.yaml`](https://github.com/mortennordbye/Homelab/blob/main/k8s/talos/infra/tempo/values.yaml)

```yaml
tempo:
  retention: 24h
  # OTLP-only: Traefik pushes OTLP gRPC. Drop the jaeger/zipkin/opencensus receivers.
  receivers:
    otlp:
      protocols:
        grpc:
        http:
```

Dropping the legacy receivers is not just tidiness. Every receiver you enable is a listening port and a parser you do not use. Turn off what nothing speaks to.

The Traefik side is one block, and the number in it is the opinionated bit.

**Full file:** [`traefik/values.yaml`](https://github.com/mortennordbye/Homelab/blob/main/k8s/talos/infra/traefik/values.yaml)

```yaml
# Emit OTLP traces for every ingress request to Tempo (blog.nordbye.it included).
tracing:
  serviceName: traefik
  sampleRate: 1.0                # 100%. Every request gets a trace.
  otlp:
    grpc:
      endpoint: tempo.monitoring:4317
      insecure: true
```

`sampleRate: 1.0` means every single request through the ingress gets a trace. Reload this post and your request shows up in Tempo. In production you would never do this. At a few requests per second the cost is nothing, and full sampling means when something is slow I have the trace, not a 1-in-1000 chance of having kept it. Where this breaks is traffic. Push real volume through 100% sampling and you drown Tempo in spans and pay for storage you will never query. Full sampling is a homelab luxury. Name the request rate where you would turn it down, and turn it down before you hit it.

## Runtime Security: Who Is Doing Something They Should Not?

The first three pillars tell you what your applications did. [Falco](https://falco.org/) tells you what they did that they were never supposed to. It watches syscalls and flags the suspicious ones. A shell spawned inside a container, a process reading `/etc/shadow`, an outbound connection from a pod that has no business making one.

On Talos there is exactly one way to run it.

**Full file:** [`falco/values.yaml`](https://github.com/mortennordbye/Homelab/blob/main/k8s/talos/infra/falco/values.yaml)

```yaml
# modern eBPF: the only driver that works on Talos (no kernel headers).
driver:
  kind: modern_ebpf
```

Talos is immutable and ships no kernel headers, so the classic kernel-module driver is a non-starter. The modern eBPF probe needs neither. This is the line that makes Falco run on Talos at all.

Out of the box Falco is loud. It fires on things that are perfectly normal for your cluster, and a security tool that cries wolf gets muted within a week. The wrong fix is to delete the noisy rules. The right fix is to tell the existing rules which specific behaviour is known and expected, through the template macros the upstream rules already read.

```yaml
customRules:
  tuning.yaml: |-
    # Cilium CNI plugin execs from /opt/cni/bin on every node. Not a workload.
    - macro: known_drop_and_execute_activities
      condition: (proc.name=cilium-cni and proc.exepath startswith /opt/cni/bin/)
      override:
        condition: replace

    # kubelet and Authentik wire stdio to sockets legitimately. Scoped to those
    # binaries so a real interactive shell still alerts.
    - macro: user_known_stand_streams_redirect_activities
      condition: (proc.name=kubelet) or (container.image.repository=ghcr.io/goauthentik/server and proc.name=authentik)
      override:
        condition: replace
```

The `override: condition: replace` is the part worth stealing. I am not disabling a rule and I am not raising a threshold. I am extending the macro the rule already consults for "things that are known and fine." When the upstream chart ships new rules, my exceptions still apply, because they hang off the macro, not off a specific rule I forked. Tuning that survives the next upgrade.

Note the scope. The kubelet exception names the kubelet binary. A random shell redirecting its streams to a socket still trips the alert, because it is not kubelet. You are carving out the known-good case narrowly, not waving everything else through.

This is what one looks like when it reaches Discord, and it doubles as a confession.

<img src="/images/falco-discord-alert.webp" alt="Falco Discord alert: Redirect STDOUT/STDIN to Network Connection in Container, Notice priority, argocd-repo-server on genesis-worker-01 connecting to a udp port 53 socket" title="A Falco notice that is the next tuning candidate" style="width:100%;" />

That is `argocd-repo-server` wiring stdout to a `udp` port 53 socket, which is the repo server resolving DNS. Benign, and the same stdio-to-socket shape as the kubelet and Authentik cases above. It still fires because I have not added it to the macro yet. It is the next line in that tuning block, scoped to the `argocd-repo-ser` process so a real shell in that pod still trips. Tuning is never finished. It is a list you work down as the cluster tells you what normal looks like.

## Alerting That Earns Its Keep

A dashboard is something you look at. An alert is something that looks for you. The failure mode is alerting on everything, which trains you to ignore the channel. So almost nothing pages me.

**Full file:** [`kube-prometheus-stack/values.yaml`](https://github.com/mortennordbye/Homelab/blob/main/k8s/talos/infra/kube-prometheus-stack/values.yaml)

```yaml
route:
  receiver: "null"             # default: drop it
  routes:
    - matchers:
        - severity = "critical"
      receiver: discord        # only critical climbs out to Discord
```

Everything that is not critical goes to a null receiver and disappears. Only critical reaches me. If an alert is not worth a Discord ping, it is not worth firing, and if it fires too often it gets demoted or fixed.

It was not always this quiet. Here is Discord on 23 May, two weeks earlier, when the route still sent everything to the channel.

<img src="/images/alertmanager-discord-alert.webp" alt="Alertmanager Discord message: FIRING:2 ContainerRestartingFrequently, severity warning, two stage-portfolio pods restarting, each with a kubectl check command" title="A warning pinging Discord, before the critical-only routing" style="width:100%;" />

Two stage-portfolio pods restarting more than three times in fifteen minutes. Severity warning. Useful the first time I saw it, noise by the tenth. On 31 May I flipped the default receiver to null and left only critical wired to Discord. Warnings live on the dashboard now, where I look when I want them, not in a channel that buzzes at people. One thing to keep from that message though. The description carries the exact `kubectl` command to run next. An alert that does not tell you what to do is half an alert.

There is a Discord gotcha here that cost me a confused half hour. Alertmanager has no native Discord receiver. The trick is to point a `slack_config` at Discord's Slack-compatibility endpoint, and the webhook URL has to end in `/slack` or Discord rejects the Slack-shaped payload with an HTTP 400. The URL itself lives in Bitwarden and is mounted as a file, never committed.

```yaml
receivers:
  - name: "null"
  - name: discord
    slack_configs:
      - api_url_file: /etc/alertmanager/secrets/alertmanager-discord-webhook/url
        send_resolved: true
```

The rules behind those messages take more thought than the routing does. Two examples from [`homelab-alerts.yaml`](https://github.com/mortennordbye/Homelab/blob/main/k8s/talos/infra/kube-prometheus-stack/homelab-alerts.yaml) that I got wrong before I got right.

```yaml
# Catches early flapping before CrashLoopBackOff. The upstream KubePodCrashLooping
# only fires after 15 min sustained; this catches the restart storm earlier.
- alert: ContainerRestartingFrequently
  expr: increase(kube_pod_container_status_restarts_total[15m]) > 3
  for: 2m

# last_terminated_reason stays 1 forever after an OOM, so AND it with a recency
# check on the timestamp. Otherwise the alert never clears once it has fired once.
- alert: ContainerOOMKilled
  expr: |
    kube_pod_container_status_last_terminated_reason{reason="OOMKilled"} == 1
    and on(namespace, pod, container)
    (time() - kube_pod_container_status_last_terminated_timestamp) < 600
  for: 1m
```

The OOM one is the kind of thing you only learn by getting it wrong. The metric is a sticky gauge. Once a container is OOMKilled it reads 1 for the rest of that pod's life. Alert on the raw value and you get a notification that never resolves, which is just noise you trained yourself to ignore. Anding it against the termination timestamp makes it auto-clear once the OOMs actually stop.

> **The rule of thumb.** If an alert fires and you do not act on it, the alert is wrong, not your attention. Fix the threshold or delete the rule.

## Common Mistakes to Avoid

I have made every one of these.

**Copying my retention numbers without thinking.** 24 hours of logs and traces is fine for me because I debug in near-real-time and nothing here is under audit. If you have a compliance requirement or you investigate incidents days later, 24h will betray you. Retention is a policy decision dressed up as a config value.

**Putting high-write data on network storage.** Logs and traces are written constantly. Point them at NFS and you will feel it. Local block storage for the firehose pillars, durable network storage for the metrics you want to keep. Let the storage class say what you are willing to lose.

**Committing a panel before the metric exists.** Dashboards-as-code is the right pattern, but it lets you add a panel for a metric that is not being scraped yet. The result is honest and a little embarrassing.

<img src="/images/homelab-spog-cilium.webp" alt="Cilium dashboard section with three panels reading No data next to a working network drops graph" title="Panels committed before their metrics were wired up" style="width:100%;" />

Three "No data" panels sitting next to a working one. The fix is not to delete them. It is to wire up the Hubble metrics they expect. The panel is a to-do list I checked into git, and I would rather see the gap than pretend it is not there.

**Alerting on everything.** The instinct is to alert on every rule the internet hands you. Resist it. An alert channel you have learned to ignore is worse than no channel, because it gives you the feeling of coverage without the substance.

## The Whole Thing Is in Git

The dashboard up top is not clicked together in the Grafana UI where it would vanish with the pod. It is a `ConfigMap`, [`homelab-spog.json`](https://github.com/mortennordbye/Homelab/blob/main/k8s/talos/infra/kube-prometheus-stack/dashboards/homelab-spog.json), that the Grafana sidecar discovers and loads. Same for every Helm value, every alert rule, every Falco exception in this post. ArgoCD reconciles all of it from `main`. If I delete the Grafana pod, the dashboard comes back exactly as it was.

That is the part that makes this maintainable rather than a pet. The cluster is blind by default. What you have read is the wiring that gives it sight, and all of it is text in a repo you can read.

Go clone the dashboard JSON, steal the Falco macros, and turn off an alert that has never once told you anything.
