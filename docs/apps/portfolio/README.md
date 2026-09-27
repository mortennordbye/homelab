# Portfolio

The site at nordbye.it: a Next.js app under `portfolio/`, built into an image and deployed to a
stage and a prod namespace. Kargo promotes it from stage to prod; see
[../../platform/delivery/kargo.md](../../platform/delivery/kargo.md). The manifests live in
`k8s/talos/apps/portfolio/` (prod) and `k8s/talos/apps/portfolio-stage/`.

Brand and design decisions live in [brand/](brand/README.md): what is locked, rejected and still
open, the art direction behind it, and the asset list. Read them before proposing anything about
how the site looks. The LinkedIn banner and its build script live in `portfolio/branding/`.

The 3D flat at `/fun` has its own guide: [fun-room.md](fun-room.md).
