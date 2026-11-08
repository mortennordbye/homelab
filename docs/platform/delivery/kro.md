# kro

kro (Kube Resource Orchestrator) adds custom Kubernetes kinds without a custom controller.
A `ResourceGraphDefinition` (RGD) describes a kind and the objects that one instance of it
creates. kro generates the CRD and reconciles the instances.

| | |
|---|---|
| Namespace | `kro` |
| Manifests | [`k8s/talos/infra/kro/`](../../../k8s/talos/infra/kro/kustomization.yaml) |
| Chart | `oci://registry.k8s.io/kro/charts/kro` |

## Kinds

| Kind | Definition | Creates |
|---|---|---|
| `StaticSite` | [`rgd-static-site.yaml`](../../../k8s/talos/infra/kro/rgd-static-site.yaml) | Deployment, Service, Cloudflare-only Middleware, public HTTPRoute, KEDA InterceptorRoute and ScaledObject, CiliumNetworkPolicy |

`StaticSite` fits an nginx image that listens on port 80 as UID 101. An instance sets
`image` and `host`. [`omni-tools`](../../../k8s/talos/apps/omni-tools/staticsite.yaml) is
the example. A new instance also needs its namespace in the KEDA
[`referencegrant.yaml`](../../../k8s/talos/infra/keda-http-add-on/referencegrant.yaml).

## Move an app to an instance

kro adopts objects that already exist with the same names. Argo CD then prunes those
objects, because they left Git, and kro creates them again. Expect about 30 seconds of
downtime and a new Service cluster IP.

## Add a kind

1. Add an RGD in `k8s/talos/infra/kro/`.
2. Add a rule for the new kind and for every kind that it creates to a ClusterRole with the
   label `rbac.kro.run/aggregate-to-controller: "true"`. The controller runs with
   aggregated RBAC, so a missing rule stops the instance from reconciling.
3. Check that the RGD is active: `kubectl get rgd`. The state must be `Active`.

## Operate

- Inspect an instance with `kubectl get <kind> -A`. Its `status.conditions` show the
  failing resource.
- Do not set `spec.replicas` in a template for a workload that KEDA scales. kro applies the
  template, and the value would conflict with KEDA.
- Argo CD does not track the objects that kro creates. Argo CD tracks only the instance.
  Do not add those objects to Git as well.
- Kyverno and the CiliumNetworkPolicies apply to these objects as usual.
