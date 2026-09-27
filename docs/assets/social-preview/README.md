# Social preview card

The image GitHub shows when this repo is linked from Slack, LinkedIn, or anywhere else
that unfurls a URL. Not used anywhere on the site or in the README.

| | |
| --- | --- |
| Source of truth | `source.svg` (hand authored, self contained) |
| Shipped artifact | `social-preview.png`, rendered from that SVG |
| Canvas | 1280x640 |
| Render | `make social-preview` |
| Upload | Settings > General > Social preview (no API for this, it is manual) |

## Canvas

GitHub asks for 1280x640, a true 2:1. Blog covers use 1200x630 (`blog/IMAGE-STYLE.md`);
rendering one of those into GitHub's slot letterboxes it.

## Style

The card follows the portfolio's tokens (`portfolio/src/styles/tokens.css`), the same ones
the docs site uses: the near-black `#0f1410` ground with one warm lamp from the upper left,
Source Serif 4 for the title and Fragment Mono for the kicker, labels and URLs, a brass
rule joining the tiles, and green once, as the live dot on the last tile.

Logos sit on paper tiles because several brand marks are dark or rely on white negative
space and vanish against the ground. Icons come from `homarr-labs/dashboard-icons`, the
same source the D2 diagrams in `docs/assets/diagrams` use, and are inlined as base64 data
URIs so the SVG stays self contained.

The render mounts the fonts from `portfolio/src/app/og-fonts/`; without them rsvg falls
back to a default face and the card silently loses the brand type.

Visible text avoids hyphens and dashes.

## Editing it

Edit `source.svg`, run `make social-preview`, then look at the PNG rather than the editor
preview. Overflow, clipping, and label collisions only show up in the real pixels.

Never hand edit the PNG. It is generated.

## Changing an icon

The icons are base64 blobs, so they are not editable in place. Fetch the replacement from
`https://raw.githubusercontent.com/homarr-labs/dashboard-icons/main/svg/<name>.svg`, base64
it, and swap the `xlink:href` payload. Authoring against an `ICONDATA_<name>` placeholder
and substituting with `perl -i -pe` keeps the file readable while you work.
