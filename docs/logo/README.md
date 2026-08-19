# Repo logo

The mark at the top of the README: the tree of the garden, one ripe fruit hanging from it.

| | |
| --- | --- |
| Source of truth | `source.jpg` (1024x1024, the full orchard frame) |
| Shipped artifact | `logo.png`, cropped and masked from that photo |
| Canvas | 512x512, transparent outside the circle |
| Render | `make logo` locally, or push the source and let [`render-logo.yaml`](../../.github/workflows/render-logo.yaml) do it |

The workflow re-renders on any change to `source.jpg` and commits the PNG back to `main`,
the same pattern the D2 diagrams use. Never hand edit the PNG, it is generated.

## The crop

`crop 460x460+280+300`, then a circular mask. The full frame is a wall of leaves at the 128px
the README renders it at, with no subject the eye can find; the crop leaves one fruit filling
the mark. The circle is what makes it read as a mark rather than a photo someone pasted in, and
it keeps the round silhouette the drawn logo had. Adjust those numbers to move the crop, then
re-render, rather than editing the PNG.

## Why PNG in the README

Every image in the README ships as PNG, so they all render the same way. The transparency
outside the circle is deliberate: the mark has to hold up on both the light and the dark GitHub
theme.

## Before this

The mark was a drawn SVG, a flat green tree with a red fruit, in the leaf green family rather
than the portfolio's blue and violet. It is in the history if it is ever wanted back:
`git show HEAD~1:docs/logo/source.svg`.
