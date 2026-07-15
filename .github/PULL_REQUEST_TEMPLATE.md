## Why

<!-- The problem this solves. Link any related issue. -->

## What

<!-- What changed. -->

## Verification

<!-- There is no test suite; validation is the tooling below. Delete the rows that don't apply. -->

- [ ] Kubernetes manifests: `kubectl diff -f <path>` or `kustomize build <dir>` renders clean, and the ArgoCD `Application` still points at the correct path
- [ ] Terraform: `terraform fmt -check`, `terraform validate`, and `terraform plan` reviewed (no `apply`)
- [ ] Portfolio / blog: Docker image builds, affected route and one unrelated route load
- [ ] GitHub Actions: `actionlint` clean, or workflow read end-to-end
- [ ] Docs only, no verification needed
