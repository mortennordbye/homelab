# Portfolio

The site at nordbye.it is a Next.js app under `portfolio/`. It is built into an image and
deployed to a stage and a prod namespace. Kargo promotes it from stage to prod. See
[../../platform/delivery/kargo.md](../../platform/delivery/kargo.md). The manifests are in
`k8s/talos/apps/portfolio/` (prod) and `k8s/talos/apps/portfolio-stage/`.

Brand and design decisions are in [brand/](brand/README.md): what is locked, what is rejected,
what is still open, the art direction behind them, and the asset list. Read them before you
propose anything about how the site looks. The LinkedIn banner and its build script are in
`portfolio/branding/`.

The 3D flat at `/fun` has its own guide: [fun-room.md](fun-room.md). The cert list syncs from
Credly and Microsoft Learn: [certs.md](certs.md).

The hero shows stills before or instead of WebGL: `public/images/globe-poster.webp`,
`globe-poster-mobile.jpg` and `room-poster.jpg`. They are frames of the live scenes. After a
change to the globe or the room, run `make hero-posters` in `portfolio/` to capture them again.
The target builds the prod image and screenshots both scenes with headless Chromium on
SwiftShader (`scripts/hero-posters.mts`).

Case-study architecture diagrams are drawn from `src/content/work/<slug>.arch.ts`.
`src/components/work/route.ts` routes the edges around every box. It runs A* on a sparse grid,
with a cost for bends, shared runs and runs along a group's border. A node therefore never
needs a manual route. If a node is so close to another that no clear lane exists, fix the
layout. Boxes carry the product's own mark from `src/components/work/logos.ts` (simple-icons,
CC0, one tone, no brand colours). A product not in that file falls back to the generic icon in
`brand-icons.ts`. A box too narrow for icon and text drops the icon. Add a mark there when a
diagram names a new product. The card covers in the portfolio list are the same diagram, small
(`WorkCardCover.tsx`).

On phones and with reduced motion the homelab cabinet is the still `cabinet-poster.webp` with a
numbered marker on each device (`SPOTS` in `src/components/infrastructure/InfraBench.tsx`). The
markers are percentages of that picture, so they move when the poster is captured again.
