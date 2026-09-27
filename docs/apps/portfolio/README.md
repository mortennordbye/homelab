# Portfolio

The site at nordbye.it: a Next.js app under `portfolio/`, built into an image and deployed to a
stage and a prod namespace. Kargo promotes it from stage to prod; see
[../../platform/delivery/kargo.md](../../platform/delivery/kargo.md). The manifests live in
`k8s/talos/apps/portfolio/` (prod) and `k8s/talos/apps/portfolio-stage/`.

Brand and design decisions:

- `portfolio/branding/DECISIONS.md`: what is locked, rejected and still open. Read it before
  proposing anything about how the site looks.
- `portfolio/branding/ART-DIRECTION.md`: the long-form rule book behind those decisions.
- `portfolio/src/content/brand.ts`: the shipped spec, rendered at `/brand`. Where the documents
  and the code disagree, the code is what the site does.

The 3D flat at `/fun` has its own guide: [fun-room.md](fun-room.md).
