# Repo logo

The mark at the top of the README: the tree of the garden with one red fruit on it.

| | |
| --- | --- |
| Source of truth | `source.svg` (hand authored, self contained) |
| Shipped artifact | `logo.png`, rendered from that SVG |
| Canvas | 512x512, transparent background |
| Render | `make logo` locally, or push the source and let [`render-logo.yaml`](../../.github/workflows/render-logo.yaml) do it |

The workflow re-renders on any change to `source.svg` and commits the PNG back to `main`,
the same pattern the D2 diagrams use. Never hand edit the PNG, it is generated.

## Why PNG in the README

GitHub serves raw SVGs with a `default-src 'none'` CSP. The diagrams need PNG because their
inlined data URI icons get blocked by it; this file has no external references, but it ships as
PNG anyway so every image in the README is rendered the same way.

## Palette

The blog covers and the social preview card use the portfolio's blue and violet
(`blog/IMAGE-STYLE.md`). The logo does not. It carries the repo name, so it uses the leaf green
family instead, with the fruit as the single accent:

| Role | Hex |
| --- | --- |
| canopy light | `#a7f3a0` |
| canopy mid | `#4ade80` |
| canopy deep | `#15803d` |
| trunk | `#166534` |
| fruit | `#f87171` to `#dc2626` |
| fruit stem and leaf | `#14532d` |

The transparent background and the mid tone greens are deliberate: the mark has to hold up on
both the light and the dark GitHub theme, and at the 24px it renders next to the wordmark.
