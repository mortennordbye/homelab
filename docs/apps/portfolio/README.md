# Portfolio

The site at nordbye.it: a Next.js app under `portfolio/`, built into an image and deployed to a
stage and a prod namespace. Kargo promotes it from stage to prod; see
[../../platform/delivery/kargo.md](../../platform/delivery/kargo.md). The manifests live in
`k8s/talos/apps/portfolio/` (prod) and `k8s/talos/apps/portfolio-stage/`.

Brand and design decisions live in [brand/](brand/README.md): what is locked, rejected and still
open, the art direction behind it, and the asset list. Read them before proposing anything about
how the site looks. The LinkedIn banner and its build script live in `portfolio/branding/`.

The 3D flat at `/fun` has its own guide: [fun-room.md](fun-room.md).

The stills the hero shows before or instead of WebGL (`public/images/globe-poster.webp`,
`globe-poster-mobile.jpg` and `room-poster.jpg`) are frames of the live scenes. After changing
the globe or the room, run `make hero-posters` in `portfolio/` to re-capture them: it builds the
prod image and screenshots both scenes with headless Chromium on SwiftShader
(`scripts/hero-posters.mts`).
