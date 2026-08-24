# Portfolio redesign: decisions

The agreed record for the portfolio rebuild. Read this before proposing anything
about how `nordbye.it` looks, moves, or presents content. It exists so that a
decision settled once does not get re-argued from scratch by the next person or
the next agent.

Three companion documents, all in this directory:

`ART-DIRECTION.md` is the long-form rule book: the register, the materials, the
camera route, the failure modes.
`ASSETS.md` is the shopping list: real Poly Haven slugs, verified licences,
measured byte costs.
`README.md` is the LinkedIn banner rule book and logbook, unrelated to the
rebuild except that it shares the palette.

The spec that ships is `src/content/brand.ts`, rendered at `/brand`. Where this
file and that file disagree, the code is what the site does and this file is what
we meant.

Status as of 2026-08-24: theme and typography locked and committed. The first
section object, the portfolio shelf, is built and shipped in the real site. The
rest of the room is still prototype only.

---

## 1. The theme

**Locked.** The site is not a portfolio, it is a study, and the visitor is being
received in it. A portfolio argues for someone; a room does not argue.

The register is a merge and both halves are load-bearing: **English discipline,
Norwegian material.** English gives the order — joinery, fitted bookcases, a
proper desk, everything planed and squared. Norwegian gives the material and the
light — dark oak rather than mahogany, the forest outside the window, one warm
lamp against an afternoon that went dark at three.

Drop the English half and it becomes a cabin. Drop the Norwegian half and it
becomes a gentlemen's club. Both were explicitly rejected.

The wealth is in what was kept, not what was bought. Rooted rather than rich,
which is why "generational" is the right word and "luxury" is the wrong one. The
feeling to aim at is **calm, not impact**. The expensive quality is a consequence
of the calm and never the thing being chased.

The line that settles texture arguments: **the forest is the view and the
palette, never the construction.** Green is what is outside the window, which is
why it can never be a glowing interface colour. The wood is planed, because it
has been through a workshop. When a texture decision comes up, ask whether a
cabinetmaker or a carpenter made it.

Name: The Study. Rule: one lamp.

## 2. Materials and light

**Locked.** Four materials and no others: warm near-black ground, dark oak,
brass, warm off-white paper. Values are read off `InlineGlobeScene.tsx` rather
than chosen separately, so the spec cannot drift from the render.

One warm key at the upper left. Highlights top-left, shadows long to the lower
right, contact shadows where things meet. Nothing emits light except a screen or
a lamp. Green appears once per view as a lit point.

## 3. Typography

**Locked and shipped.** Source Serif 4 for display and body alike, using its
optical-size axis so one family works from 64px to 13px. Fragment Mono for
labels, measurements and data. **No sans anywhere**, because serif headline over
grotesque body over mono label is the signature of a generated portfolio whatever
families are substituted into it.

Both SIL OFL 1.1, verified upstream. Replaced Inter, JetBrains Mono and Fraunces,
which sat at Google Fonts popularity ranks 5, 59 and 93 of 1,942.

Rejected on the way: Libre Caslon Text (too English, brings the club), Baskervville
with Alegreya, Sorts Mill Goudy with STIX Two Text, Newsreader (best to read, but
riding the current editorial-revival wave and so reads as 2025 taste rather than
inheritance), Faustina, Spectral, Literata.

Noted for the day a paid face is on the table: Monokrom in Oslo draw Satyr, which
would fit the brief better than anything free.

## 4. The interaction model

**This section replaced four earlier models. Read the rejections before proposing
anything, because each one was built, looked at, and dropped for a reason.**

### What is agreed

The site stays the site. No walkable room, no scroll-driven film, no camera on
rails. The existing page structure, section order and layouts are correct and
stay as they are.

What changes is that **selected sections get a photoreal 3D object on a fixed
camera, composed exactly the way the hero already composes the globe**: copy
left, object right, one warm key, everything else falling into the dark. More
moments like the globe.

Not every section needs one. About stays text and a photograph, because that is
the right treatment for it. The portfolio list stays a list.

### What was rejected, and why

**A floating DOM card over the render.** Reads as a UI panel pasted onto a
photograph, which is the exact failure `ART-DIRECTION.md` warns about. Restyling
the card does not fix it; the problem is that it is a card.

**Text mapped onto the object's surface in perspective (CSS3D).** Technically
works and looks good in motion, and the technique is worth keeping for
transitions. But a whole A4 page shown at once is always text too small to read,
so it cannot be the reading state.

**Click to open an object.** The visitor should not have to interact to see the
content. Interaction may be offered as depth for those who want it, never as a
toll gate.

**A scroll-driven film through the room.** Built in full with nine stations. The
motion worked; the content presentation did not, and more importantly the room
could not be made to look real across its whole surface.

**Nested scroll (camera holds while a document scrolls inside it).** Rejected as
"a page in a page". The mechanic is sound and reversible, but it is not what the
site should feel like.

### The reasoning that settles it

The globe looks real because it is one object, closely framed, with dark falloff
around it. All the quality is concentrated where the camera points. A room is the
opposite: every surface has to hold up. Since the visitor only ever sees a small
number of fixed framings anyway, building one room to satisfy them is paying for
surface area nobody looks at.

## 5. Realism: the critical finding

This is the most useful technical result of the whole exploration.

Surfaces painted procedurally onto a canvas at runtime — colour only, no normal
map, no roughness map — read as flat-shaded boxes. Every point on a plane takes
light identically and the eye stops believing it is a material. `textures.ts` in
the real repository already says this and is correct.

Two things fix it, in this order of importance:

**An environment map.** Brass at metalness 1 with nothing to reflect renders as
dull brown plastic. Image-based lighting is the single largest realism lever
available and costs one file. This is why the current `/fun` room and every
prototype before the last one looked like a game rather than a photograph.

**Normal and roughness maps.** So a plank has grain that catches light and a
panel has a bevel that does not.

Verified working. `.inspiration/pbr/` holds `wooden_floor_02`, `wooden_panels`
and `black_oak_veneer` (diff, nor_gl, arm at 1K jpg) plus `reading_room_1k.hdr`,
all CC0 from Poly Haven, about 6.3 MB unconverted.

Two implementation notes that cost time to find:

`RGBELoader` is **not** in the vendored three build, though `PMREMGenerator` and
`DataTextureLoader` are. A compact RGBE parser is written in
`.inspiration/section-objects.html` and `scroll-film-poc.html` — header, then
`-Y h +X w`, then either flat or RLE scanlines, exponent bias 136 for the
float conversion. Lift it rather than rewriting it.

ARM maps pack occlusion, roughness and metalness into R/G/B. three reads
roughness from green and metalness from blue, so one file serves both slots. AO
is unusable on plane geometry because three samples `aoMap` from a second UV set.

## 6. The rig

Every object must be lit by the hero's rig, taken verbatim from
`InlineGlobeScene.tsx` rather than re-invented: ambient `#31251a` at 0.42, a key
directional `#ffd49a` at intensity 3 from `(-5.5, 5.5, 4.5)` casting shadows, a
cool bounce `#6f9c72` at 0.5 from `(5, -0.5, 2)`, a spot `#ffca8a` at 26 raking
the tabletop, ACES filmic at 1.05 exposure, camera at fov 32 and z 6.9.

The shipped globe does **not** currently have an environment map. Adding one is
an improvement to the hero as well as the precondition for everything else.

## 7. Performance techniques, all proven in prototype

Render only on frames that move. A scroll-driven scene is stationary for most of
its life; measured zero renders in two seconds while held still, against roughly
120 per second before.

Regenerate the shadow map only on moving frames (`shadowMap.autoUpdate = false`).

Instance repeated geometry. 104 book meshes with 104 materials became one
`InstancedMesh` with per-instance colour.

Share textures and materials across identical objects.

Adaptive pixel ratio with a floor of 1.0, stepping down twice if the median
render cost stays above 14ms. Antialiasing off above 2x device pixels. Shadow map
1024 on high-DPR or narrow viewports.

Stop the easing where the camera would move less than a pixel.

## 8. Shipped: the portfolio shelf

**Built and in the real site.** `src/components/work/WorkShelf.tsx` (the facade)
and `WorkShelfScene.tsx` (the scene), mounted by `FeaturedWork` above the list.

Thirteen case studies as thirteen bound volumes on two shelves, client
engagements above and homelab below, split on the frontmatter `kind`. Each shelf
carries its own name on a brass plate, which is what replaced the old
client/homelab filter control: the split is a property of the object now, not
something you operate a control to discover. Every spine is stamped with its own
title, so the whole list is legible without touching anything. One volume stands
face-out showing its cover. Clicking a spine brings that volume out; clicking it
again opens it, and the camera dives at the open leaf until the paper fills the
frame while the route hands over to `/work/<slug>`.

The section is the shelf full width, with the selected volume's title, summary,
client, period and stack running horizontally underneath it. That panel is not
decoration: a canvas carries no text for a screen reader and no keyboard path
into a volume, so the way in lives out there as a real anchor.

Four numbers that took several passes to settle, all worth not re-deriving. The
lens is **20 degrees**, not the hero's 32: a bookcase is a wide subject and at
anything shorter the volumes at the ends of the row splay and read as warped.
`dpr` is **[1, 2]**, because the scene draws on demand and rendering at 1.5 on a
retina panel is visibly soft for no saving. The environment is deliberately
**dim, and the large matte surfaces take almost none of it** — turned up across
the set it lifts every surface at once and the whole shelf goes foggy. And the
shelf plates sit about a unit nearer the camera than the books, so the visible
vertical extent at their depth is much smaller than at the books': frame for the
plates, and the books follow.

Three things worth keeping:

The spread is a title page and nothing more. Opening a volume is navigation, not
a reading state, so the writing lives in exactly one place. This is also what
keeps the rule in section 4 intact: nothing is behind the click, because
thirteen spines and one cover are readable before anyone touches it.

Cover and spine art are generated from the `nodes` and `edges` in each
`*.arch.ts`, the same source the case study's own diagram renders from, so they
cannot drift. The `cover` frontmatter field is deliberately unused: only six of
the thirteen declared images exist, and the ones that do are wide landscape
diagrams that lose their title and most of their topology cropped to a portrait
board. **That gap is still there and is worth fixing or removing.**

The foil is metal in the render rather than a painted colour, and is debossed
via a normal map built from the gradient of the stamp. That is what separates it
from print.

Still open for the other sections: resume (a sheet under a brass clip with a
pen), infrastructure (six machines on a brass rail with live status lights,
driven by the real cluster status endpoint), and writing (a stack of paper under
a brass weight). Rendered in prototype but not reviewed.

Live versus pre-rendered. Objects can be rendered in the browser or
pre-rendered offline at much higher quality and shown as stills with small live
overlays. Offline looks considerably better; live keeps everything data-driven.
Not decided.

Transitions between sections. This is the part that was meant to be unique and it
is the part least explored under the new model.

The blog's place, the interaction vocabulary, touch, and renaming "Eucalyptus"
all remain open from before.

## 9. Assets

See `ASSETS.md`. The finding that matters: `/fun` already has a working CC0
pipeline, and it looks modern because the assets currently loaded are
`laminate_floor_02`, `plastered_wall_04`, `dirty_carpet` and a photography-studio
HDRI. Swapping slugs changes the register without touching loading code.

## 10. What to do next

1. Look at `.inspiration/section-objects.html`, which renders five objects in the
   hero rig with PBR surfaces and the interior HDRI. Decide which objects are
   right and which sections get one.
2. Add an environment map to the shipped hero globe. Smallest change with the
   largest visible return, and it is a precondition for everything else.
3. Decide live versus pre-rendered.
4. Build one section object end to end in the real site, mounted only when it
   scrolls into view and rendering on demand, and measure it.
5. Design the transitions.

## 11. Prototypes

Gitignored, under `.inspiration/`, served with `python3 -m http.server 8899` from
that directory because they load three.js as ES modules.

`section-objects.html` is the current direction: five objects in the hero rig.
`scroll-film-poc.html` is the abandoned scroll film, kept for the camera code,
the RGBE parser and the perf techniques.
`object-content-poc.html` holds the CSS3D text-on-surface technique.
`content-in-the-room.html` is the four content patterns with real CV text.
`type-lock.html` and `type-study.html` are the typography comparisons.
`room-look-study.html` is five interiors for the `/fun` room, deferred.
`pbr/` holds the downloaded Poly Haven assets.

## Logbook

**2026-08-24, later.** Four interaction models built and rejected before landing
on "more moments like the globe". The realism finding in section 5 is the reason
three of them failed and is the thing most worth carrying forward: without an
environment map and normal maps, nothing rendered will look like anything but a
game, however good the composition is.

**2026-08-24.** Theme, register and typography locked. Fonts swapped in the real
site, closing a long-standing gap where `brand.ts` claimed IBM Plex Sans was in
use and that Inter was deliberately absent, while `layout.tsx` had been importing
Inter the whole time. Imagery rules split into on-site (hyperreal) and off-site
(flat, survives feed re-compression). `branding/README.md` caught up with the
banner it describes. Camera and content prototyped. Assets researched.
