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

## Canvas: why 1280x640 and not 1200x630

`blog/IMAGE-STYLE.md` fixes blog covers at 1200x630 and says never change it. That number
is the OG / `summary_large_image` ratio the blog theme wants, and it does not apply here.
GitHub asks for 1280x640, which is a true 2:1 rather than 1.905:1. Rendering a 1200x630
cover into GitHub's slot letterboxes it.

The canvas is the only intentional break from the cover rules. Everything else on this
card follows `blog/IMAGE-STYLE.md`, so the repo, the blog, and the portfolio read as one
brand.

## What it inherits from the cover style guide

The flat `#0a1015 -> #050a0f` background with a faint grid and no coloured glows, the
blue to violet accent bar, the 20px uppercase kicker in arctic blue, the 46px snow title,
and a motif that carries the lower two thirds with big legible icon tiles.

Logos sit on light `#eef2f7` rounded tiles because several brand marks are dark or rely on
white negative space and vanish against the background. Icons come from
`homarr-labs/dashboard-icons`, the same source the D2 diagrams in `docs/diagrams` use, and
are inlined as base64 data URIs so the SVG stays self contained and never breaks if the CDN
moves.

Visible text avoids hyphens and dashes, same as the covers.

## Editing it

Edit `source.svg`, run `make social-preview`, then look at the PNG rather than the editor
preview. Overflow, clipping, and label collisions only show up in the real pixels. Both the
first draft's problems were invisible in the SVG preview and obvious in the render: a dead
band between the title and the motif with tiles that read too small, and a kicker naming
technologies the motif did not show.

Never hand edit the PNG. It is generated.

## Changing an icon

The icons are base64 blobs, so they are not editable in place. Fetch the replacement from
`https://raw.githubusercontent.com/homarr-labs/dashboard-icons/main/svg/<name>.svg`, base64
it, and swap the `xlink:href` payload. Authoring against an `ICONDATA_<name>` placeholder
and substituting with `perl -i -pe` keeps the file readable while you work.
