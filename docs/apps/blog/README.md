# Blog

The blog at [blog.nordbye.it](https://blog.nordbye.it) is a Hugo site under
[`blog/`](../../../blog/) in this repo. It uses the
[Northlight](https://github.com/mortennordbye/northlight) theme, and nginx serves the built
pages.

## Where it runs

| Instance | Namespace | Address | Replicas |
|---|---|---|---|
| prod | `blog` | `blog.nordbye.it`, public through Cloudflare | 1 to 3, KEDA cron, never zero |
| stage | `stage-blog` | `blog-stage.local.bigd.no` | 0 to 1, wakes on the first request |

KEDA and the interceptor are in
[`../../platform/delivery/keda.md`](../../platform/delivery/keda.md).

## Deploy

[`build-blog.yaml`](../../../.github/workflows/build-blog.yaml) builds
`ghcr.io/mortennordbye/homelab/blog` on a push to `main`. Kargo promotes the tag to stage, then
to prod through a pull request. The prod promotion purges the Cloudflare cache
([`../../platform/delivery/kargo.md`](../../platform/delivery/kargo.md)).

Posts are in `blog/content/blog/`. The text and cover style guides are local working files
and not in the repo.

The manifests are in [`k8s/talos/apps/blog/`](../../../k8s/talos/apps/blog/) and
[`k8s/talos/apps/blog-stage/`](../../../k8s/talos/apps/blog-stage/).
