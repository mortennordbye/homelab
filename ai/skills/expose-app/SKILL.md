---
name: expose-app
description: Use before creating, renaming or removing an HTTPRoute in k8s/talos/apps/, or whenever an app should become reachable at a hostname - asks like "make an httproute for X", "put X on local", "expose X", "give X a URL", "add X to the public gateway", "move X to bigd.no", or adding a web UI or webserver to an app that had none. Also when an app is deleted. Lists everything outside the route that has to follow - local.bigd.no DNS alias in Terraform, Cloudflare records and middleware, TLS, network policy, homepage tile, uptime probes, Authentik, KEDA, Kargo, docs - so a route never ships half-wired.
---

# Expose an app

An HTTPRoute alone is not reachable. Run this checklist whenever a route is added, renamed
or removed, and change every item that applies in the same PR. A removal walks the same
list in reverse. The base procedure is `docs/platform/network/traefik.md` "Exposing an
app"; this skill adds the lists that procedure does not mention.

Start by deciding the gateway, then work through the sections. At the end, report which
items were changed, which were skipped as not applicable, and anything left for the user
to run (Terraform applies).

## 1. The route itself (every app)

- `k8s/talos/apps/<app>/httproute.yaml`, listed in that directory's `kustomization.yaml`.
  Private template: `k8s/talos/apps/verksted/httproute.yaml`. Public template:
  `k8s/talos/apps/it-tools/httproute.yaml`.
- The app's own config, if it needs to know its URL: base-URL env vars (mealie, verksted),
  headroom's `ALLOWED_HOSTS`.
- `ciliumnetworkpolicy.yaml` must let Traefik in on the container port. The selector is
  `k8s:io.kubernetes.pod.namespace: traefik` plus
  `k8s:app.kubernetes.io/instance: traefik-traefik` (`docs/platform/network/cilium.md`).
  A policy that already admits `fromEntities: cluster` on that port covers it.
- Argo CD needs nothing; the `apps` ApplicationSet picks up every directory.

## 2. Private gateway (`traefik-gateway-private`, `<name>.local.bigd.no`)

- DNS: add the name, alphabetically, to `aliases` in `terraform/unifi/dns/records.tf`.
  Nothing reconciles this list with the routes. The user runs
  `terraform -chdir=terraform/unifi/dns plan` and apply, because the backend needs their
  Azure login. Never run `az` and never apply without approval.
- TLS: the `*.local.bigd.no` wildcard covers one label only. `a.b.local.bigd.no` needs a
  new certificate.
- external-dns ignores `local.bigd.no`; do not annotate a private route.
- Only gluetun reaches `*.local.bigd.no` from inside the cluster, through `hostAliases` in
  `k8s/talos/apps/gluetun-vpn/gluetun.yaml`. Touch it only if gluetun must call the app.

## 3. Public gateway (`traefik-gateway-public`)

- `bigd.no`: set `external-dns.kubernetes.io/cloudflare-proxied: "true"` on the route
  (`"false"` for streaming, as audiobookshelf). external-dns creates the record and never
  deletes one (`upsert-only`), so a removed host must be deleted in Cloudflare by hand.
- `nordbye.it`: a Terraform record in the `for_each` of `cloudflare_dns_record.direct` in
  `terraform/cloudflare/nordbye-it/dns.tf`. Static, unauthenticated sites may also join
  `proxied_hostnames` in `variables.tf` for the HTML cache rule; anything with sessions
  must not. Update the host list in `docs/platform/network/cloudflare.md`.
- `logeverylift.com`: `terraform/cloudflare/logeverylift-com/dns.tf`.
- Cloudflare-only middleware: copy `k8s/talos/apps/mealie/cloudflare-only-middleware.yaml`
  as `<app>-cloudflare-only` and put it first on every rule. Unproxied hosts skip it.
- TLS: `bigd.no`, `nordbye.it` and `logeverylift.com` have wildcard plus apex certificates.
  A new zone or a two-label name needs a Certificate, a `certificateRefs` entry in
  `k8s/talos/infra/traefik/gateway-public.yaml` and a row in
  `docs/platform/network/certificates.md`.
- Uptime, for sites worth paging on: add the URL to the `public-sites` Probe in
  `k8s/talos/infra/blackbox-exporter/probe.yaml` and to `sites` in
  `terraform/cloudflare/watchdog/variables.tf` (the two lists stay identical), and to the
  site list in `docs/platform/observability/README.md`.

## 4. Optional layers

- Authentik forward auth: `middleware-authentik.yaml` in the app, an unauthenticated
  `/outpost.goauthentik.io/` rule on the route, and in `k8s/talos/infra/authentik/` a
  ReferenceGrant, a blueprint ConfigMap (also in `values.yaml` `blueprints.configMaps`) and
  a provider entry in `embedded-outpost-blueprint.yaml`. The outpost's provider list is
  replaced wholesale, so a provider missing there answers 404. Tables in
  `docs/platform/identity/README.md`. Reelsmith admin and homepage are the templates.
- KEDA scale to zero: follow `docs/platform/delivery/keda.md` "Onboard an app". The route
  points at `keda-add-ons-http-interceptor-proxy` in `keda`, the InterceptorRoute's `hosts`
  must equal the route hostname exactly, and the namespace joins
  `k8s/talos/infra/keda-http-add-on/referencegrant.yaml`.
- Kargo-promoted apps: the smoke-test URL in `k8s/talos/infra/kargo-projects/<app>.yaml`
  and the table in `docs/platform/delivery/kargo.md`.

## 5. Homepage

Add a tile in `k8s/talos/apps/homepage/values.yaml` under `config.services`. Own apps on
either domain go in Public Sites, the *arr apps in Media Management, cluster tools in
Infrastructure or Monitoring. Shape: `icon` (dashboard-icons file, `mdi-*`, `si-*` or a
URL), `href`, `description`, and `siteMonitor` when the page answers a plain GET. A widget
key comes from `homepage-api-keys` as `HOMEPAGE_VAR_*` through an ExternalSecret.

## 6. Docs

- `docs/architecture/README.md` "Workloads": the app's bullet names its hostname; a new
  app also bumps the Application count there and in `CLAUDE.md`.
- `docs/apps/<app>/README.md`, if it exists, uses the hostname rather than a raw VIP.
- A new app on a gateway also belongs in `docs/assets/diagrams/network-flow.d2`
  ("Public Sites" block) and `homelab-overview.d2`; re-render with `make diagram`.

## Verify

- `kustomize build k8s/talos/apps/<app>` renders the route.
- `kubectl diff --field-manager=argocd-controller -f <route>` with the Homelab kubeconfig
  shows only the intended change.
- `terraform fmt -check` in each Terraform folder touched.
- After merge and the user's DNS apply: `curl -sI https://<host>` returns the app.
