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

Case-study architecture diagrams are drawn from `src/content/work/<slug>.arch.ts`. Edges are
routed around every box by `src/components/work/route.ts` (A* on a sparse grid, with a cost for
bends, shared runs and running along a group's border), so placing a node never needs a manual
route; a node placed so close to another that no clear lane exists is the layout to fix. Boxes
carry the product's own mark from `src/components/work/logos.ts` (simple-icons, CC0, one tone, no
brand colours); a product not in that file falls back to the generic icon in `brand-icons.ts`,
and a box too narrow for icon and text drops the icon. Add a mark there when a diagram names a
new product. The card covers in the portfolio list are the same diagram, small
(`WorkCardCover.tsx`).

On phones and with reduced motion the homelab cabinet is the still `cabinet-poster.webp` with a
numbered marker on each device (`SPOTS` in `src/components/infrastructure/InfraBench.tsx`). The
markers are percentages of that picture, so they move when the poster is re-captured.
