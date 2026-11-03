# Costs

OpenCost turns the usage in Prometheus into a cost per namespace, controller and pod, at
<https://opencost.local.bigd.no>. It lives in `k8s/talos/infra/opencost/`, in the `monitoring`
namespace, behind the private gateway.

## What the numbers mean

The figures are estimates of electricity only. They leave out the hardware, the NAS, the
network gear and storage. The cluster draw is an estimate as well: no host has a power meter.

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

The rates cover the whole draw spread over capacity, so the cluster total is about
0.25 NOK an hour. The 10 W per core in the KEDA panels is a different number: the extra draw
of a busy core, which is right for a saving and far too high for a total.

## Changing the rates

Rates are fixed in `customPricing` in `values.yaml`. OpenCost cannot take a live price, so
they follow a monthly average. Change them when the price moves a lot or the draw gets
measured. Panels that need the live price multiply usage by
`electricity_spot_price_nok_per_kwh` in Grafana, as the KEDA panels do.

## Limits

- `kube_pod_labels`, `kube_node_labels` and `kube_namespace_labels` are not scraped, so cost
  cannot be split by label. Namespace, controller and pod work.
- Storage and network are priced at zero.
- History is limited by Prometheus retention (30 days).
