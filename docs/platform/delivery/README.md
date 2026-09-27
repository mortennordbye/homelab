# Delivery

How changes reach the cluster. Argo CD syncs everything under `k8s/talos/**` from
`main` as an app-of-apps (`k8s/talos/infra/argocd/{apps.yaml,infra.yaml}`); a direct
`kubectl apply` is reverted.

- [`kargo.md`](kargo.md): stage to prod promotion of images through pull requests.
- [`external-apps.md`](external-apps.md): `bump-image.yml` for external repos not on Kargo.
