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
- Hand-authored **`linkedin-banner.svg`**. Edit the SVG, never the PNG.
- Service icons are inlined as **base64 data-URIs** so the SVG is self-contained
  (renders in the VSCode SVG preview, no CDN dependency).

### Palette — the portfolio "fjord at midnight" tokens
Lifted from `portfolio/src/styles/tokens.css` (dark theme) so the banner, the
site, and the blog read as one brand:

| Role | Hex |
|------|-----|
| bg top → bottom | `#0a1015` → `#050a0f` |
| accent (arctic blue) | `#5db7ff` — kicker, labels, accent bar top |
| accent-2 (aurora violet) | `#8b7dff` — accent bar + name gradient tail |
| snow (title / domains) | `#e8eef5` |
| fog (role) | `#b0bccb` |
| slate (separators) | `#8898aa` |
| line-2 (the `|` divider) | `#5a6878` |
| icon tile | `#eef2f7` |

Faint white grid at `stroke-opacity 0.03` is the only background texture. **No
coloured radial glows** — they read as AI-generated (same lesson as the blog).

### Fonts (and why)
librsvg renders with **container-installed fonts**, not the site's webfonts, so
the SVG font stacks must name fonts present in the render image:
- **Kicker + name:** `'JetBrains Mono','DejaVu Sans Mono',monospace` — the
  portfolio wordmark identity (matches `opengraph-image.tsx`). Install
  `fonts-jetbrains-mono`; falls back to DejaVu Sans Mono.
- **Role + URLs:** `'DejaVu Sans',…,sans-serif`, **bold**. Deliberate: thin
  monospace at small sizes is the first thing LinkedIn's JPEG pass smears. Bold
  sans has chunkier strokes that survive compression. Keep small/important text
  **bold sans**, not thin mono.

### Layout — LinkedIn safe zones (learned from the live profile)
The profile **avatar overlaps the lower-left**, an **edit pencil** sits
top-right (owner view), and the **right edge** can clip. So:

```
┌────────────────────────────────────────────────────────┐
│ ▌KICKER (kubernetes · azure · gitops · terraform)   [icons →] │  ← top band
│  Morten Victor Nordbye                              [tiles]   │
│  Cloud Engineer & Architect                                   │
│                                                               │
│ (avatar tucks here)        PORTFOLIO · … | TECH BLOG · …       │  ← bottom band
└────────────────────────────────────────────────────────┘
```

- **Identity (kicker, name, role): top-left**, every baseline **above ~y155** —
  the avatar reaches up to ~y160 and will cover anything lower.
- **Tech tiles: top-right**, aligned with the name. End by ~x1500 (right margin).
- **URLs: bottom-right, single line**, both sites **equal weight** (same size,
  same accent-label + snow-domain), divided by a spaced `|`. Bottom-right keeps
  them clear of the avatar (left) and the edit pencil (top-right).
- **Bottom-left: intentionally empty** — that's where the avatar sits. An empty
  band there is correct, not unfinished.
- Name uses a `#e8eef5 → #5db7ff → #8b7dff` left-to-right gradient (the OG
  wordmark treatment); the gradient's `userSpaceOnUse` `x2` must track the name's
  pixel width if you change the font size.

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

- [ ] **Identity baselines above ~y155** — the avatar covers the lower-left up to
      ~y160. (Centred name/role got covered; raised to the top band.)
- [ ] **URLs bottom-right, not top-right** — the top-right edit pencil overlaps
      and the far edge clips. Keep them ~x1500 end, single line, equal weight.
- [ ] **Bold sans for small text** (URLs/role) — thin mono smears under LinkedIn
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

> **Mobile caveat:** LinkedIn crops the banner to a shorter strip on phones
> (trims top and bottom), so the bottom-right URLs may not show on mobile. The
> design is desktop-primary. To guarantee the URLs on mobile, move them to the
> vertical middle-right instead.

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
