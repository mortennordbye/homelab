# Portfolio branding assets

Source and rendered brand assets for `nordbye.it` that live outside the site (used on
third-party profiles), kept here so they are versioned and reproducible.

Current asset: `linkedin-banner.svg`, rendered to `linkedin-banner.png`, the LinkedIn profile
background banner. It shares its palette and render toolchain with the blog covers
(`blog/IMAGE-STYLE.md`).

The on-site brand (decisions, art direction, asset list) is documented in
[../../docs/apps/portfolio/brand/](../../docs/apps/portfolio/brand/README.md). On-site the
direction is hyperreal and material; off-site, in anything a feed will re-compress, it stays
flat and geometric. `portfolio/src/content/brand.ts` carries the same split.

## The LinkedIn banner

### Canvas

- 1584x396 (LinkedIn's documented profile-banner size, 4:1). Never change it.
- The SVG declares `width="1584" height="396"` and the PNG is exported at the same native size
  (see Render). Do not ship a 3x or 4x PNG: LinkedIn re-compresses oversized uploads harder and
  the result looks worse, not sharper.

### Source of truth

`build-banner.py` generates the SVG, which is then rasterised to the PNG. Edit the constants in
the script, re-run it, then re-render. Never hand-edit the SVG (the next run overwrites it) and
never touch the PNG.

The script re-inlines the five icon data-URIs by reading them out of the existing
`linkedin-banner.svg` and asserts it finds exactly five. The SVG is both output and input, so
deleting it breaks the build. Adding or swapping an icon means inlining it by hand once (see
Icons), after which the script carries it forward.

Icons are inlined as base64 data-URIs so the SVG stays self-contained and renders with no CDN
dependency.

```bash
cd portfolio/branding && python3 build-banner.py
```

### Palette: eucalyptus, hue 130

The banner, the site and the blog read as one brand. These values live as constants at the top
of `build-banner.py`:

| Role | Hex |
|------|-----|
| ground, top to bottom | `#0a0a0a` to `#040404` |
| accent bar, left to right | `#51a45e` to `#8ec798` |
| labels (`PORTFOLIO`, `TECH BLOG`) | `#51a45e` |
| domains | `#e7e7e7` |
| divider rule | `#3a3a3a` |
| aperture arcs | `#61b86f` at `stroke-opacity 0.10` |
| icon tile | `#eef1ee` |

The ground is a plain neutral near-black, not the site's tinted `#0f1410` anchor, on purpose:
green is the accent and the marks, never the canvas.

The background texture is the aperture motif: three concentric arcs struck from a centre
off-canvas right, at `#61b86f` and 10% stroke opacity. No faint grid and no coloured radial
glows: both read as generated.

### Fonts

librsvg renders with container-installed fonts, not the site's webfonts, so the SVG font stacks
must name fonts present in the render image.

- Labels (`PORTFOLIO`, `TECH BLOG`) use `'JetBrains Mono','DejaVu Sans Mono',monospace` at 17px,
  weight 500, `letter-spacing 4`. Install `fonts-jetbrains-mono`; it falls back to DejaVu Sans
  Mono.
- Domains use `'DejaVu Sans','Helvetica',sans-serif` at 46px, weight 700. Thin monospace at small
  sizes is the first thing LinkedIn's JPEG pass smears; bold sans has chunkier strokes that
  survive compression. Keep anything small and important in bold sans, not thin mono.

### Layout: centred, because LinkedIn crops both ways

The banner carries two things: the tile strip and the two destinations. Everything is centred on
the canvas centre (792, 198).

```
┌──────────────────────────────────────────────────────────────┐
│▀▀▀▀▀▀▀▀▀▀▀ accent rule, full width, 4px ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀│
│                                                              │
│                   [▪][▪][▪][▪][▪]        ← tiles, y100        │
│                                                              │
│          blog.nordbye.it │ nordbye.it    ← domains, y230      │
│               TECH BLOG  │ PORTFOLIO     ← labels,  y260      │
│                                                              │
│ (avatar tucks here)                        ⌒ aperture arcs ⌒ │
└──────────────────────────────────────────────────────────────┘
```

- Anything that must survive belongs in the central safe box, roughly the middle 800x190 around
  (792, 198). On phones LinkedIn crops top, bottom and sides, so corner-anchored content is
  desktop-only by definition.
- The two destinations carry equal weight, mirrored either side of a 2px divider at x≈854: the
  blog right-aligned to x≈821, the portfolio left-aligned from x≈889. Same size, same
  accent-label over snow-domain treatment.
- The tile strip is five 64px tiles on 86px centres, starting at x=588, y=100.
- No identity block (name, role). LinkedIn prints the name, headline and location directly under
  the banner.
- The bottom-left band stays empty. The avatar sits there and reaches up to about y160. An empty
  band is correct, not unfinished. The centred layout also clears the edit pencil at top right.

### Icons

Inlined on light `#eef1ee` tiles: many marks are dark or white and vanish on the dark canvas, and
the tile guarantees legibility. Current strip: azure, kubernetes, argocd, terraform, github.

Sources:

- Local `portfolio/public/icons/*.svg` (simple-icons, single brand colour) for `kubernetes` and
  `terraform`. The local `github.svg` is near-white (`#F5F5F5`) for the dark site and invisible on
  a light tile; use the dark dashboard-icons GitHub instead.
- `homarr-labs/dashboard-icons` (full colour) for `azure`, `argo-cd` and `github`:
  `https://raw.githubusercontent.com/homarr-labs/dashboard-icons/main/svg/<name>.svg`. Use
  dashboard-icons `argo-cd`, not the flat single-colour simple-icons Argo mark.

Inlining mechanic: author the `<image>` href as a placeholder token (`ICONDATA_<name>`), then
substitute each with its base64. Fetch the dashboard-icons SVGs to temporary `_<name>.svg` files
first and delete them after inlining; the bytes live in the SVG. Run from `portfolio/branding/`:

```bash
for pair in "azure:_azure.svg" "kubernetes:../public/icons/kubernetes.svg" \
            "argocd:_argocd.svg" "terraform:../public/icons/terraform.svg" \
            "github:_github.svg"; do
  k="${pair%%:*}"; f="${pair#*:}"
  b64=$(base64 < "$f" | tr -d '\n')
  perl -i -pe "s|ICONDATA_${k}\b|data:image/svg+xml;base64,${b64}|g" linkedin-banner.svg
done
```

## Render

There is no native rasteriser on the laptop, so use the same librsvg the blog covers and diagram
CI use, in a container. While iterating, render previews to the gitignored `.screenshots/`; only
write the committed `linkedin-banner.png` when happy. Run from the repo root:

```bash
# preview (2x for on-screen review)
docker run --rm \
  -v "$PWD/portfolio/branding:/in" -v "$PWD/.screenshots:/out" \
  ubuntu:24.04 bash -c '
    apt-get update >/dev/null && \
    apt-get install -y librsvg2-bin fonts-jetbrains-mono fonts-dejavu-core >/dev/null && \
    rsvg-convert -w 3168 -h 792 /in/linkedin-banner.svg -o /out/linkedin-banner-preview.png'

# final (native 1584x396, straight over the committed PNG)
docker run --rm -v "$PWD/portfolio/branding:/in" ubuntu:24.04 bash -c '
    apt-get update >/dev/null && \
    apt-get install -y librsvg2-bin fonts-jetbrains-mono fonts-dejavu-core >/dev/null && \
    rsvg-convert -w 1584 -h 396 /in/linkedin-banner.svg -o /in/linkedin-banner.png'
```

To check sharpness, crop a region of the preview at native pixels with imagemagick
(`convert in.png -crop 1700x320+300+520 +repage crop.png`) and view it. The source is crisp; any
softness on the live profile is LinkedIn's compression.

## Checklist

- [ ] Central safe box: anything that must survive sits in the middle 800x190 around (792, 198).
      Check every change by cropping the 2x preview to a simulated mobile band.
- [ ] Bold sans for small text (domains): thin mono smears under LinkedIn JPEG. Bigger, bolder and
      brighter survives.
- [ ] Export at native 1584x396, not 3x or 4x; LinkedIn over-compresses big PNGs.
- [ ] Dark or white logos need the light tile. Verify in the rendered PNG.
- [ ] Extra spacing needs `xml:space="preserve"` on the `<text>`: librsvg collapses runs of spaces
      and `&#160;` nbsp.
- [ ] No hyphens or dashes in visible text. Middot `·` (`&#183;`) and the `|` divider are fine;
      domains like `nordbye.it` are fine.
- [ ] Nothing critical in the bottom-left (avatar) zone.
- [ ] A change to the banner updates this README in the same pass.
