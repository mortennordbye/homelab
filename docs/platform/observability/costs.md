# Costs

OpenCost converts the usage in Prometheus into a cost per namespace, controller and pod, at
<https://opencost.local.bigd.no>. It is defined in `k8s/talos/infra/opencost/` and runs in the
`monitoring` namespace, behind the private gateway.

[![Kube-state-metrics, cAdvisor and the electricity price feed Prometheus; OpenCost reads usage from Prometheus and fixed rates from its ConfigMap, then publishes price and allocation metrics back; Grafana's SPOG reads those from Prometheus and OpenCost serves its own UI](../../assets/diagrams/observability-cost.svg)](../../assets/diagrams/observability-cost.svg)

## What the numbers mean

The figures are estimates of electricity only. They do not include the hardware, the NAS, the
network gear and storage. The cluster draw is also an estimate. No host has a power meter.

| Input | Value | Source |
|---|---|---|
| Cluster draw | 100 W | estimate, three hosts with 35 W CPUs |
| Split | 85 % CPU, 15 % memory | estimate |
| Capacity | 34 vCPU, 70 GiB | `kube_node_status_capacity` |
| Electricity | 2.52 NOK/kWh | 30-day NO1 spot of 1.70, plus 25 % VAT, plus 0.39 grid fee |

```text
CPU rate = 100 W x 0.85 / 34 vCPU   x 2.52 NOK/kWh / 1000 = 0.00629 NOK per vCPU-hour
RAM rate = 100 W x 0.15 / 70 GiB    x 2.52 NOK/kWh / 1000 = 0.00054 NOK per GiB-hour
```

The rates spread the whole draw over the capacity. The cluster total is therefore about
0.25 NOK an hour. The 10 W per core in the KEDA panels is a different number. It is the extra
draw of a busy core. That value is correct for a saving and far too high for a total.

## Where to read it

The Cost, estimated (OpenCost) row on the SPOG dashboard shows the 30-day cost, the idle cost and
share, allocated CPU and memory, cost per namespace, and allocated against idle over time. The row
reads OpenCost's metrics from Prometheus. A figure agrees with the OpenCost UI only over the same
window. Allocation is the larger of a container's request and its use. Idle is the rest of the node
cost. The Price against OpenCost rate tile compares today's price with the price that the rates
imply. It uses the dashboard's Cluster watts variable. That variable must match the draw in the
table above.

## Changing the rates

The rates are fixed in `customPricing` in `values.yaml`. OpenCost cannot read a live price, so
the rates follow a monthly average. Change them when the price moves a lot, or when the draw
is measured. Panels that need the live price multiply usage by
`electricity_spot_price_nok_per_kwh` in Grafana. The KEDA panels do this.

## Limits

- Prometheus does not scrape `kube_pod_labels`, `kube_node_labels` and `kube_namespace_labels`,
  so cost cannot be split by label. Namespace, controller and pod work.
- Storage and network have a price of zero.
- Talos nodes have no `providerID`. The ServiceMonitor therefore copies `node` into `provider_id`
  on the node price metrics. Without this, OpenCost skips those prices and reports an idle cost
  of zero.
- Prometheus retention (30 days) limits the history.
