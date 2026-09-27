# Delivery

How changes reach the cluster. Argo CD runs two ApplicationSets
(`k8s/talos/infra/argocd/{apps.yaml,infra.yaml}`) that turn every directory under
`k8s/talos/apps/` and `k8s/talos/infra/` into an Application synced from `main`; a direct
`kubectl apply` is reverted. Kargo promotes images for portfolio, blog, logeverylift,
headroom, verksted and reelsmith.

- [`kargo.md`](kargo.md): stage to prod promotion of images through pull requests.
