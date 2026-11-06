# Social preview card

The image that GitHub shows when someone links this repo from Slack, LinkedIn, or any other
place that unfurls a URL. It is not used on the site or in the README.

| | |
| --- | --- |
| Source of truth | `source.svg` (hand authored, self contained) |
| Shipped artifact | `social-preview.png`, rendered from that SVG |
| Canvas | 1280x640 |
| Render | `make social-preview` |
| Upload | Settings > General > Social preview (no API for this, it is manual) |

## Canvas

GitHub asks for 1280x640, a true 2:1. Blog covers use 1200x630 (`blog/IMAGE-STYLE.md`).
GitHub letterboxes a blog cover rendered into its slot.

## Style

The card follows the portfolio's tokens (`portfolio/src/styles/tokens.css`), the same tokens
the docs site uses. The ground is the near-black `#0f1410` with one warm lamp from the upper
left. Source Serif 4 sets the title, and Fragment Mono sets the kicker, labels and URLs. A
brass rule joins the tiles. Green appears once, as the live dot on the last tile.

Logos sit on paper tiles, because several brand marks are dark or depend on white negative
space and vanish against the ground. Icons come from `homarr-labs/dashboard-icons`, the same
source the D2 diagrams in `docs/assets/diagrams` use. They are inlined as base64 data URIs, so
the SVG stays self contained.

The render mounts the fonts from `portfolio/src/app/og-fonts/`. Without them, rsvg uses a
default face and the card silently loses the brand type.

Visible text avoids hyphens and dashes.

## Editing it

Edit `source.svg`, run `make social-preview`, then look at the PNG, not the editor preview.
Overflow, clipping, and label collisions show only in the real pixels.

Never hand edit the PNG. It is generated.

## Changing an icon

The icons are base64 blobs, so you cannot edit them in place. Fetch the replacement from
`https://raw.githubusercontent.com/homarr-labs/dashboard-icons/main/svg/<name>.svg`, base64
it, and swap the `xlink:href` payload. Write the SVG against an `ICONDATA_<name>` placeholder
and substitute it with `perl -i -pe`. This keeps the file readable while you work.
