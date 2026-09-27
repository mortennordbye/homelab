# Delivery

How changes reach the cluster. Argo CD runs two ApplicationSets
(`k8s/talos/infra/argocd/{apps.yaml,infra.yaml}`) that turn every directory under
`k8s/talos/apps/` and `k8s/talos/infra/` into an Application synced from `main`; a direct
`kubectl apply` is reverted. Kargo promotes images for portfolio, blog, logeverylift,
headroom, verksted and reelsmith.

- [`argocd.md`](argocd.md): the ApplicationSets, projects, sync options, SSO and bootstrap.
- [`kargo.md`](kargo.md): stage to prod promotion of images through pull requests.
- [`keda.md`](keda.md): scaling idle apps to zero.
- [`ci.md`](ci.md): every GitHub Actions workflow, what triggers it and what it writes.
