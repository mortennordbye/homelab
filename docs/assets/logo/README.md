# Repo logo

The mark at the top of the README: the tree of the garden, one ripe fruit hanging from it.

| | |
| --- | --- |
| Source of truth | `source.jpg` (1024x1024, the full orchard frame) |
| Shipped artifact | `logo.png`, cropped and masked from that photo |
| Canvas | 512x512, transparent outside the circle |
| Render | `make logo` locally, or push the source and let [`render-assets.yaml`](../../../.github/workflows/render-assets.yaml) do it |

The workflow renders again on any change to `source.jpg` and commits the PNG back to `main`.
It does this in the same run that renders the D2 diagrams. Never hand edit the PNG. It is
generated.

## The crop

`crop 460x460+280+300`, then a circular mask. The README renders the image at 128px. At that
size the full frame is a wall of leaves with no subject the eye can find. The crop leaves one
fruit that fills the mark. The circle makes the image read as a mark, not as a pasted photo. It
also keeps the round silhouette of the drawn logo. To move the crop, adjust those numbers and
render again. Do not edit the PNG.

## Why PNG in the README

Every image in the README ships as PNG, so they all render the same way. The transparency
outside the circle is deliberate. The mark must work on both the light and the dark GitHub
theme.

## Before this

The mark was a drawn SVG: a flat green tree with a red fruit, in the leaf green family, not
the portfolio's blue and violet. It is in the history if anyone wants it back:
`git show HEAD~1:docs/logo/source.svg`.
