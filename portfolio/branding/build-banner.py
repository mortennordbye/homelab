"""Rebuild the LinkedIn banner: eucalyptus palette, links only, no identity block.

Keeps every rule from portfolio/branding/README.md that still applies — 1584x396,
avatar-safe bottom-left, edit-pencil-safe top-right, icons on light tiles, fonts
named so librsvg can find them in the render container.

Two deliberate departures, both documented in the README update:
  * The identity block (kicker, name, role) is gone. The banner now carries the
    two destinations and the stack, nothing else.
  * The faint grid is replaced by concentric arcs, the same motif the blog covers
    moved to. A low-opacity grid is a generated-image tell.
"""
import re, sys

SRC = 'linkedin-banner.svg'
W, H = 1584, 396

# palette — portfolio tokens.css. Ground is neutral black: green is the
# accent and the marks, never the canvas.
BG_TOP, BG_BOT = '#0a0a0a', '#040404'
ACCENT, ACCENT_2, ACCENT_3 = '#51a45e', '#8ec798', '#61b86f'
SNOW, FOG, SLATE, LINE2 = '#e7e7e7', '#a5a5a5', '#7a7a7a', '#3a3a3a'
TILE = '#eef1ee'

MONO = "'JetBrains Mono','DejaVu Sans Mono',monospace"
SANS = "'DejaVu Sans','Helvetica',sans-serif"

icons = re.findall(r'href="(data:image/svg\+xml;base64,[^"]+)"', open(SRC, encoding='utf-8').read())
assert len(icons) == 5, f'expected 5 inlined icons, found {len(icons)}'

# Everything lives in a central safe box. LinkedIn trims top and bottom on
# phones (documented in the README) and, as the live profile showed, crops the
# sides too — the previous right-aligned layout lost the "b" of blog.nordbye.it.
# Centred horizontally and vertically, inside the middle ~800x190, survives both.
CX, CY = W / 2, 196

TILE_SZ, GAP = 64, 22
strip_w = 5 * TILE_SZ + 4 * GAP
x0 = CX - strip_w / 2
tile_y = CY - 96

tiles = []
for i, data in enumerate(icons):
    x = x0 + i * (TILE_SZ + GAP)
    pad = 11
    tiles.append(
        f'<rect x="{x}" y="{tile_y}" width="{TILE_SZ}" height="{TILE_SZ}" rx="14" fill="{TILE}"/>'
        f'<image x="{x+pad}" y="{tile_y+pad}" width="{TILE_SZ-2*pad}" height="{TILE_SZ-2*pad}" href="{data}"/>'
    )

def label(x, y, text, size, fill, font=MONO, weight=500, anchor='start', ls='0'):
    return (f'<text x="{x}" y="{y}" font-family="{font}" font-size="{size}" font-weight="{weight}" '
            f'fill="{fill}" text-anchor="{anchor}" letter-spacing="{ls}">{text}</text>')

# Two domains either side of a centred divider, sized so the pair stays inside
# the middle 800px. Advance widths are estimated for DejaVu Sans Bold at 46px.
URL_SIZE = 46
GAPX = 34
w_blog = len('blog.nordbye.it') * URL_SIZE * 0.545
w_site = len('nordbye.it') * URL_SIZE * 0.545
link_y = CY + 34
sub_y = link_y + 30
total_w = w_blog + 2 * GAPX + w_site
left = CX - total_w / 2
blog_right = left + w_blog
div_x = blog_right + GAPX
site_left = div_x + GAPX

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img"
     aria-label="nordbye.it portfolio and blog.nordbye.it tech blog, Azure Kubernetes ArgoCD Terraform GitHub">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="{BG_TOP}"/><stop offset="1" stop-color="{BG_BOT}"/>
    </linearGradient>
    <linearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="{ACCENT}"/><stop offset="1" stop-color="{ACCENT_2}"/>
    </linearGradient>
    <clipPath id="frame"><rect width="{W}" height="{H}"/></clipPath>
  </defs>

  <rect width="{W}" height="{H}" fill="url(#bg)"/>

  <!-- aperture motif: concentric arcs from off-canvas right. Replaces the faint
       grid the previous banner used; a low-opacity grid reads as generated. -->
  <g clip-path="url(#frame)" fill="none" stroke="{ACCENT_3}" stroke-opacity="0.10" stroke-width="2">
    <circle cx="1640" cy="198" r="210"/>
    <circle cx="1640" cy="198" r="320"/>
    <circle cx="1640" cy="198" r="430"/>
  </g>

  <!-- top accent rule -->
  <rect x="0" y="0" width="{W}" height="4" fill="url(#bar)"/>

  <!-- stack tiles, centred -->
  {''.join(tiles)}

  <!-- the two destinations, centred either side of the divider -->
  <g>
    {label(blog_right, link_y, 'blog.nordbye.it', URL_SIZE, SNOW, SANS, 700, 'end', '-0.5')}
    {label(blog_right, sub_y, 'TECH BLOG', 17, ACCENT, MONO, 500, 'end', '4')}
  </g>
  <g>
    {label(site_left, link_y, 'nordbye.it', URL_SIZE, SNOW, SANS, 700, 'start', '-0.5')}
    {label(site_left, sub_y, 'PORTFOLIO', 17, ACCENT, MONO, 500, 'start', '4')}
  </g>
  <rect x="{div_x - 1}" y="{link_y - 36}" width="2" height="52" fill="{LINE2}"/>

  <!-- bottom-left stays empty: the LinkedIn avatar sits there -->
</svg>
'''

out = sys.argv[1] if len(sys.argv) > 1 else 'linkedin-banner.svg'
open(out, 'w', encoding='utf-8').write(svg)
print(f'wrote {out}  ({len(svg)} bytes, {len(icons)} icons inlined)')
