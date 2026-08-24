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

Status as of 2026-08-24: theme and typography locked and committed. Camera and
content patterns prototyped and agreed in principle. Nothing about the room is
built in the real site yet.

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

## 4. The camera

**Agreed, prototyped, not built.** Scrolling is walking. One continuous camera
move through one room, tied to scroll position and fully reversible. It never
cuts.

Route, in order: the door (arrive), the desk (hero and about), the shelf (CV and
certificates), the long wall (case studies), the drawing (infrastructure), back
to the door (contact, and out).

Scroll maps through alternating **hold** and **travel** bands. Holds are where
the camera is still and text is read; travel is where it moves. Without the holds
nothing is readable. Text is never animated during travel.

The pose is a pure function of scroll position with no accumulated state, so
reversing is exact by construction rather than by tuning.

The lamp rakes a few degrees over the length of the page, so shadows lengthen and
the afternoon draws on. Small enough to be a second-visit detail.

Rejected: a fixed room with only the light moving (too little), and framed views
that cross-dissolve (reads as a slideshow).

## 5. Content in the room

**Agreed, prototyped, not built.** The governing rule: **text is never a
texture.** It is real DOM at native resolution, selectable, linkable and
indexable, rendered over the scene. The room supplies light, material and place;
the words stay words. This is already the established pattern in `/fun`, where
drei's `Html` appears in eight components.

Panels are **anchored** to the object they describe: the object's world position
is projected to screen space each frame and used as the panel's transform origin,
so a panel grows out of the thing it is about instead of floating over the render.

The CV is the hard case, because entries run to 120 words. Two layers: a spine
that scans in fifteen seconds, and the full prose one interaction down.

**The nested-scroll mechanic, which resolves the usability trap:** the CV stop
simply owns a longer band of the route, and progress through that band drives the
document instead of the camera. There is no scroll capture, no mode switch and
nothing to escape from. The page scrollbar always moves, and scrubbing backwards
unwinds it exactly like everything else.

Patterns per content type: the CV as an opened document on paper; certificates as
small brass frames on the shelf rail, never coloured badges; case studies as
prints in brass frames carrying the real covers from `public/images/work/`, with
a number rather than a summary as the caption; the blog as a stack of papers,
newest on top, each showing its own date and headline.

Every stop has a real URL and the plain view renders the same content from the
same source. **The room is a way of presenting content, never a place content
lives.** The moment a fact exists only inside the scene, the site stops being
indexable and stops being maintainable in the same instant.

## 6. The plain view

**Locked.** A quiet control in the header, present from first paint, that swaps
the room for a printed version of the same brand. Remembered per visitor. Served
automatically to `prefers-reduced-motion`, print, crawlers and anything without
WebGL.

It is not a degraded fallback and may not look like one. It has to be good enough
to be judged on with the room never loading at all. That is the price of taking
the metaphor as far as section 5 takes it.

## 7. Performance

**Locked.** Priority order: memorability first, performance alongside it, and the
plain view as the release valve rather than a reason to water the room down.

One WebGL canvas for the entire site. Nothing loads before interaction. On a
mid-range phone the camera stops and the room stays: three or four fixed framings
that cross-fade, keeping material, lamp and shadows and losing only the travel.
Below that, the plain view.

Techniques proven in the prototype and to be carried into the build: render only
on frames that move (the scene is stationary for most of its life, and idle
measured zero renders in two seconds); regenerate the shadow map only on moving
frames; instance repeated geometry; share textures and materials across identical
objects; adaptive pixel ratio with a floor; antialiasing off above 2x device
pixels; stop the easing where the camera moves less than a pixel.

## 8. Two rooms

**Locked.** One room, seen two ways. The portfolio is the guided version on
rails. `/fun` is the same geometry with the rails off. The room is built for the
portfolio first, because that is where it has to look expensive, and the current
`/fun` room is replaced by it afterwards rather than kept.

## 9. Assets

**Researched, nothing fetched.** See `ASSETS.md`.

The finding that matters: `/fun` already has a working CC0 pipeline, so nothing
needs building. It looks modern because the assets currently loaded are
`laminate_floor_02`, `plastered_wall_04`, `dirty_carpet` and a photography-studio
HDRI, four of which say "modern flat" on their own. Swapping slugs changes the
register without touching loading code.

There is no writing desk in the Poly Haven catalogue worth using, so the most
important object in the room gets built from primitives. At the camera distances
the route uses, the tell is material and light rather than silhouette.

## 10. Still open

The blog's place in the route. Currently parked on a side table at the last stop,
which is a guess rather than a decision. If it deserves more it takes its own stop
between the wall and the drawing.

Whether the CV belongs in the room at all. It is the one piece of content someone
arrives with a specific job to do, and everything the room adds is friction for
that person. The defensible alternative is that the shelf shows the shape of
eleven years and one paragraph, and the real CV is a normal page and a PDF.

Interaction vocabulary. Certificates lift, prints lift, papers fan. That is
probably two gestures too many.

Touch. There is no hover on a phone, and the camera is already reduced to fixed
framings there, so the content patterns need a separate answer.

Renaming the palette. "Eucalyptus Deepened" points at an Australian tree, and the
hue is right but the name is now off-register for a Norwegian forest. Values would
not change, only the label.

## 11. Prototypes

Gitignored, under `.inspiration/`, served with `python3 -m http.server 8899` from
that directory because they load three.js as ES modules.

`camera-poc.html` is the motion test: six stops, holds and travel, the light rake,
the optimisation work.
`camera-content-poc.html` adds the content panels, anchoring and the nested CV
scroll.
`content-in-the-room.html` is the four content patterns at full fidelity with real
CV text.
`type-lock.html` and `type-study.html` are the typography comparisons.
`room-card-globe-study.html` renders candidate hero objects inside the real globe
rig.
`room-look-study.html` is five interiors for the room itself, deferred until the
portfolio look is settled.

## Logbook

**2026-08-24.** Theme, register and typography locked. Fonts swapped in the real
site, closing a long-standing gap where `brand.ts` claimed IBM Plex Sans was in
use and that Inter was deliberately absent, while `layout.tsx` had been importing
Inter the whole time. Imagery rules split into on-site (hyperreal) and off-site
(flat, survives feed re-compression). `branding/README.md` caught up with the
banner it describes. Camera and content prototyped. Assets researched.
