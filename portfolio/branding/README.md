# Portfolio branding assets

Source + rendered brand assets for `nordbye.it` that live **outside** the site
(used on third-party profiles), kept here so they're versioned and reproducible.

Current asset: **`linkedin-banner.svg` → `linkedin-banner.png`** — the LinkedIn
profile background banner.

This doc is the rule book *and* the logbook. When something is learned the hard
way (a crop, a font that smeared, an overlap), note it under **Logbook** so the
next render starts further ahead. It's the portfolio cousin of the blog's
`blog/IMAGE-STYLE.md`, and shares the same palette and render toolchain.

---

## The LinkedIn banner

### Canvas
- **1584×396** (LinkedIn's documented profile-banner size, 4:1). Never change it.
- The SVG declares `width="1584" height="396"`; the PNG is exported at the same
  **native** size (see Render). Don't ship a 3×/4× PNG — LinkedIn re-compresses
  oversized uploads harder and the result looks *worse*, not sharper.

### Source of truth
`build-banner.py` generates the SVG, which in turn is rasterised to the PNG.
Edit the constants in the script, re-run it, then re-render. Never hand-edit the
SVG (the next run overwrites it) and never touch the PNG.

The one catch: the script re-inlines the five icon data-URIs by reading them out
of the existing `linkedin-banner.svg` and asserts it finds exactly five. So the
SVG is both output and input, and deleting it breaks the build. Adding or
swapping an icon means inlining it by hand once (see Icons), after which the
script carries it forward.

Icons are inlined as base64 data-URIs so the SVG stays self-contained: it renders
in the VSCode preview with no CDN dependency.

### Palette — eucalyptus, hue 130

Moved off the old arctic-blue "fjord at midnight" tokens on 2026-08-04 (see the
logbook) so the banner, the site and the blog read as one brand. These are the
values, which live as constants at the top of `build-banner.py`:

| Role | Hex |
|------|-----|
| ground, top → bottom | `#0a0a0a` → `#040404` |
| accent bar, left → right | `#51a45e` → `#8ec798` |
| labels (`PORTFOLIO`, `TECH BLOG`) | `#51a45e` |
| domains | `#e7e7e7` |
| divider rule | `#3a3a3a` |
| aperture arcs | `#61b86f` at `stroke-opacity 0.10` |
| icon tile | `#eef1ee` |

The ground is a plain neutral near-black, not the site's tinted `#0f1410`
anchor, and that is on purpose: green is the accent and the marks, never the
canvas. The 2026-08-04 logbook entry below still records the anchor values, which
is the entry being wrong rather than the banner.

Background texture is the aperture motif: three concentric arcs struck from a
centre off-canvas right at `#61b86f`, 10% stroke opacity. It replaced a faint
white grid, because a low-opacity grid reads as generated. No coloured radial
glows, ever, for the same reason (the blog learned this first).

### Fonts (and why)
librsvg renders with container-installed fonts, not the site's webfonts, so the
SVG font stacks must name fonts present in the render image:

- Labels (`PORTFOLIO`, `TECH BLOG`) use `'JetBrains Mono','DejaVu Sans Mono',monospace`
  at 17px, weight 500, `letter-spacing 4`. Install `fonts-jetbrains-mono`; it
  falls back to DejaVu Sans Mono.
- Domains use `'DejaVu Sans','Helvetica',sans-serif` at 46px, weight 700. This
  is deliberate: thin monospace at small sizes is the first thing LinkedIn's
  JPEG pass smears. Bold sans has chunkier strokes that survive compression.
  Keep anything small and important in bold sans, not thin mono.

### Layout — centred, because LinkedIn crops both ways

The current banner carries two things: the tile strip and the two destinations.
Everything is centred on the canvas centre (792, 198).

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

- Anything that must survive belongs in the central safe box, roughly the middle
  800×190 around (792, 198). LinkedIn crops top, bottom *and* sides on phones,
  so corner-anchored content is desktop-only by definition. This rule is why the
  layout is centred rather than corner-anchored, and it supersedes every
  safe-zone refinement that came before it.
- The two destinations carry equal weight, mirrored either side of a 2px divider
  at x≈854: the blog right-aligned to x≈821, the portfolio left-aligned from
  x≈889. Same size, same accent-label over snow-domain treatment.
- The tile strip is five 64px tiles on 86px centres, starting at x=588, y=100.
- The identity block (kicker, name, role) was removed on 2026-08-04. LinkedIn
  already prints the name, headline and location directly under the banner, so
  repeating it was redundant. There is no name gradient any more.
- The bottom-left band stays empty. The avatar sits there and reaches up to
  about y160. An empty band is correct, not unfinished.

### Icons
Inlined on light `#eef2f7` tiles (many marks are dark/white and vanish on the
dark canvas; the tile guarantees legibility). Current strip:
**azure · kubernetes · argocd · terraform · github**.

Sources:
- Local `portfolio/public/icons/*.svg` (simple-icons, single brand colour):
  `kubernetes`, `terraform`. **Note:** the local `github.svg` is near-white
  (`#F5F5F5`) for the dark site — invisible on a light tile; use the dark
  dashboard-icons GitHub instead.
- `homarr-labs/dashboard-icons` (full colour) for `azure`, `argo-cd`, `github`:
  `https://raw.githubusercontent.com/homarr-labs/dashboard-icons/main/svg/<name>.svg`
  (the simple-icons "Argo" octopus is a flat single-colour mark and looked weak —
  use dashboard-icons `argo-cd`).

Inlining mechanic — author the `<image>` href as a placeholder token
(`ICONDATA_<name>`), then substitute each with its base64:
```bash
for pair in "azure:_azure.svg" "kubernetes:../public/icons/kubernetes.svg" \
            "argocd:_argocd.svg" "terraform:../public/icons/terraform.svg" \
            "github:_github.svg"; do
  k="${pair%%:*}"; f="${pair#*:}"
  b64=$(base64 < "$f" | tr -d '\n')
  perl -i -pe "s|ICONDATA_${k}\b|data:image/svg+xml;base64,${b64}|g" linkedin-banner.svg
done
```
(Fetch the dashboard-icons SVGs to temp `_<name>.svg` files first; delete them
after inlining — the bytes live in the SVG.)

## Render

No native rasteriser on the laptop, so use the **same librsvg the blog covers /
diagram CI use**, in a container. While iterating, render previews to the
gitignored `.screenshots/`; only write the committed `linkedin-banner.png` when
happy. Run from the **repo root**:

```bash
# preview (2× for on-screen review)
docker run --rm \
  -v "$PWD/portfolio/branding:/in" -v "$PWD/.screenshots:/out" \
  ubuntu:24.04 bash -c '
    apt-get update >/dev/null && \
    apt-get install -y librsvg2-bin fonts-jetbrains-mono fonts-dejavu-core >/dev/null && \
    rsvg-convert -w 3168 -h 792 /in/linkedin-banner.svg -o /out/linkedin-banner-preview.png'

# final (native 1584×396, straight over the committed PNG)
docker run --rm -v "$PWD/portfolio/branding:/in" ubuntu:24.04 bash -c '
    apt-get update >/dev/null && \
    apt-get install -y librsvg2-bin fonts-jetbrains-mono fonts-dejavu-core >/dev/null && \
    rsvg-convert -w 1584 -h 396 /in/linkedin-banner.svg -o /in/linkedin-banner.png'
```

To sanity-check sharpness, crop a region at native pixels with imagemagick
(`convert in.png -crop 1700x320+300+520 +repage crop.png`) and view it — the
source is crisp; any softness on the live profile is LinkedIn's compression.

## Checklist (learned the hard way)

- [ ] **Central safe box** — anything that must survive sits in the middle
      800×190 around (792, 198). LinkedIn crops sides as well as top and bottom.
- [ ] **URLs bottom-right, not top-right** — the top-right edit pencil overlaps
      and the far edge clips. Keep them ~x1500 end, single line, equal weight.
- [ ] **Bold sans for small text** (domains) — thin mono smears under LinkedIn
      JPEG. Bigger + bolder + brighter survives.
- [ ] **Export at native 1584×396** — not 3×/4×; LinkedIn over-compresses big PNGs.
- [ ] **Dark/white logos need the light tile** — verify in the rendered PNG. The
      local `github.svg` is white → use the dashboard-icons dark one.
- [ ] **Extra spacing needs `xml:space="preserve"`** — librsvg collapses runs of
      spaces *and* `&#160;` nbsp. Add `xml:space="preserve"` to the `<text>` to keep
      the gap around the `|` divider.
- [ ] **No hyphens/dashes in visible text** — middot `·` (`&#183;`) and the `|`
      divider are fine; domains like `nordbye.it` are fine.
- [ ] **Watch the right edge / avatar** — URLs and tiles end by ~x1500; nothing
      critical in the bottom-left (avatar) zone.

> **Mobile crop — the finding behind the centred layout.** LinkedIn
> crops on phones in *both* directions: it trims top and bottom, and it also
> cuts the sides. A right-aligned layout lost the leading `b` of
> `blog.nordbye.it` on the live profile. Anything that must survive belongs in
> a **central safe box, roughly the middle 800×190**, centred on the canvas
> centre (792, 198). Corner-anchored content is desktop-only by definition.
>
> The avatar (lower-left) and edit pencil (top-right) constraints still hold on
> desktop, but a centred layout clears both for free, which is why the layout
> section above is written around the safe box rather than around the corners.

---

## Logbook

### 2026-06-30 — built the LinkedIn banner
First portfolio-side use of the blog's cover recipe. Iterated against the live
profile, which taught the safe zones above. Final: identity top-left, tile strip
(azure · kubernetes · argocd · terraform · github) top-right, both site URLs on
one equal-weight bottom-right line split by a spaced `|`. Render = native
1584×396 via librsvg in a container.

Lessons that became the checklist:
- The avatar reaches higher than expected (~y160) → identity must be top-band.
- Top-right is owned by the edit pencil + edge clip → URLs went bottom-right.
- Thin mono URLs smeared under LinkedIn compression → switched URLs/role to bold
  DejaVu Sans, larger and brighter.
- Oversized PNG (4752px) looked *more* pixelated after LinkedIn re-compressed it
  → ship native 1584×396.
- librsvg collapses nbsp; `xml:space="preserve"` is the only reliable way to
  widen the divider gap.

### 2026-08-04 — rebuilt on the eucalyptus palette, links-only, centred
Three changes at once.

**Palette.** Moved off arctic blue onto eucalyptus (hue 130) with the rest of
the brand. Ground is the near-black anchor `#0f1410 → #070a08`, the same one the
blog covers use; green carries the accent rule and the labels only.

**Content.** The identity block (kicker, name, role) is gone. LinkedIn already
shows the name, headline and location directly under the banner, so repeating it
was redundant. The banner now carries the two destinations and the stack strip.

**Layout.** The faint grid is replaced by the concentric-arc motif the blog
covers moved to; a low-opacity grid is a generated-image tell. More importantly,
everything moved to a centred safe box after the first version lost the `b` of
`blog.nordbye.it` to the mobile crop. Verified by rendering at 2x and cropping to
a simulated mobile band before shipping — do that check on every future change.

Source is now generated rather than hand-authored: the build script rebuilds the
SVG from the palette constants and re-inlines the five icon data-URIs out of the
previous SVG, so a palette change is an edit in one place, not thirty.

### 2026-08-24 — doc caught up with the artefact
No change to the banner. The body of this README still described the version
before the 2026-08-04 rebuild while the logbook underneath it described the
rebuild, so the two halves of the same file disagreed for three weeks.

Corrected: the palette table (arctic blue → eucalyptus, taken from the constants
in `build-banner.py` rather than transcribed by hand), the source of truth (the
script generates the SVG; the SVG is not hand-authored any more), the layout
section and its diagram (identity block gone, everything centred), the fonts
section (there is no kicker or name to set), and the checklist item about
identity baselines.

The 2026-08-04 entry below records the ground as `#0f1410 → #070a08`. The file
has always had `#0a0a0a → #040404`. The entry is the thing that is wrong; it is
left as written rather than edited, since a logbook that gets rewritten is not
one.

Lesson worth keeping: this file is a rule book above and a logbook below, and a
rebuild that only appends to the logbook leaves the rule book lying. Change both
in the same pass, or the next person reads the wrong half first.

The on-site half of the brand now lives in `ART-DIRECTION.md` next to this file:
hyperreal, material, one lamp. It deliberately contradicts the flat-and-geometric
rule here, because that rule exists to survive feed re-compression and nothing on
this page is subject to it. `src/content/brand.ts` carries the same split.
