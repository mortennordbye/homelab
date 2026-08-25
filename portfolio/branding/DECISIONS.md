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

Status as of 2026-08-25: theme and typography locked and committed. Two section
objects are built and shipped in the real site, the portfolio shelf (§8) and the
resume (§13). §12 covers the flat sections, whose pass is shipped for the hero,
About, Services, the resume and the case study pages.

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

One bug worth recording because the shape of it will recur. Every mesh in a
volume is tagged with its slug by a `traverse` when the volumes are built, and
picking reads that tag. The cover is not built then: it is dressed lazily in an
effect when a volume is selected, because turning all thirteen 768x1158 stamps
into four maps each cost over a second before the shelf could be touched and
twelve of them are never seen. So the cover was added after the traverse and
carried no tag, which made the largest and most obviously pressable thing on
the shelf — the face-out board with the title on it — the one part of a volume
that did nothing. Anything added to a picked object after the tagging pass has
to tag itself.

The shelf also had no cursor. A canvas has none of its own, so nothing on it
looked pressable at all; the hover state was already tracked for the pull-out,
and it now sets the pointer as well.

Also shipped: the resume, a sheet under a brass clip with a pen. See §13.

Still open: writing (a stack of paper under a brass weight), which is the
weakest of the candidates because the shelf already owns bound paper and a
second paper object on the same page reads as the same object twice.

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

## 12. The flat sections

**Agreed and partly shipped.** Everything above concerns the objects. This
concerns the eighty percent of the site that is not rendered, and it exists
because the objects were never the problem: three photoreal objects were
sitting on top of a dark portfolio template, and once the hero's desk began
bleeding down behind the copy the mismatch became the first thing you see.

The rule, stated so it can be applied without asking: **everything is either an
object or a document, and a card is neither.** Objects are rendered and lit by
the rig in §6. Documents are made of the same four materials from §2 and obey
the same lamp. There is no third category.

Four devices carry it, and three of them are enforcement or reuse rather than
new invention.

**One lamp, in CSS as well as in three.js.** A raised surface takes light on
its top and left edges, goes dark on its right and bottom, and casts down and
to the right. An evenly bordered card is the CSS version of the flat-shaded box
that §5 identifies as the reason three prototypes failed, and the fix is the
same: stop letting every edge take light identically. Expressed once as
`--lit-edge`, `--lit-edge-soft`, `--dark-edge` and `--cast` in `tokens.css`, and
applied through `.lit` in `globals.css`.

**Paper is the fourth material and it was missing.** §2 has named it since the
theme was locked, and until now it existed only in the print stylesheet and the
LaTeX CV. Nothing on screen was made of it, which is why the hero's tags and the
portrait defaulted to glass. It now has a screen ramp, and two rules travel with
it: paper is warm off-white and never pure white, because a sheet in a room lit
by one lamp is the colour of the lamp; and anything lying on the desk carries a
short hard contact shadow, because that is the whole difference between resting
on a surface and hovering over a photograph.

**Green appears once per view as a lit point.** Not a new decision, §2 already
says it. One scroll of the front page was passing at least four lit green
points. Brass takes over as the marker, green survives as ink and as the single
live state, and the availability lamp is the one thing still allowed to emit.

**Everything states its own provenance.** `FooterStamp` is the best small piece
on the site because it is a measurement the site takes of itself and cannot
fake, and that device should recur rather than sit once at the bottom. It is
the honest version of a stats row and the only decorative element here that
gets better the more real the site becomes. Not built; see `BACKLOG.md`.

### The section label, and the plate that failed

The first attempt promoted the portfolio shelf's brass plate to the
section-heading system, drawn in CSS as a gradient sweep with two screw heads.
It read as a glossy gold button and was rejected on sight.

The reason is §5 again, and it is worth writing down because the instinct will
return: a surface painted as a colour gradient with nothing to reflect renders
as a flat-shaded box, and brass at metalness 1 with no environment is dull
brown plastic. That finding was about three.js, where an environment map is at
least available. CSS has none at all, so a convincing brass plate is not
something the DOM can draw. **Brass stays in the render, where it has light.**

Six replacements were built and looked at. What shipped is a short brass rule
above the label, `.section-label`. Brass as a rule is one of the three jobs
`tokens.css` already assigns it, and the only one of the three that does not
have to convince anyone it is metal: a drawn line is a drawn line whatever it
is made of. It is also the weight that survives appearing in every section,
which is the test the plate failed. It fades out to the right so it reads as
drawn rather than as a border, and it is deliberately not folded into
`.eyebrow`, which also labels post dates and proof blocks where a rule would
claim a hierarchy that is not there.

A restrained plate was built first and briefly shipped: matte, desaturated, no
sweep, no screws, light ink on dark metal. It was better than the glossy version
and still a small brown rectangle repeated down the page. It is the fallback if
the rule ever reads as too slight, and the CSS is recoverable from git.

Also rejected:

*A margin mark*, the same idea turned vertical, quietest of the six. It survives
one level down, where the skill group heads already use it, which is what gives
the two levels different marks.
*Card stock*, which works but spends the loudest material on the most repeated
element on the site; paper is better saved for the hero and the portrait, where
it does real work.
*Cutting the label into the ground*, which confirmed the theory the hard way:
on a near-black ground an engraving has no light to catch and reads as damage.

### What shipped

The hero and About only, because that is where the desk bleeds behind the copy
and where the treatments could be judged against the globe. The certifications
are card stock and the two remaining claims are plain type beside them, since
four sheets of paper in a row is louder than one lamp allows. The portrait is a
print with a paper border and a contact shadow rather than a card with a green
radial wash, which also removed the one place green was tinting a whole surface.
The monitor takes the same square cut and contact shadow as everything else on
the desk. The skill pills and the career path are brass. `CareerPath` lost its
own label, because the section's "career" and the block's "the
route" stacked as two labels and read as a mistake.

Services followed, as the first section converted after the pass was reviewed.
Its three cards became the same lit sheets About uses for the interests, which
took an icon in a rounded square, a `/01` counter, a nested proof box and three
green accents out of one grid. The proof link is copper: green once per view is
the rule, and three lit green points in a row was the loudest breach of it on
the page.

The resume followed, and took the biggest piece of card language on the site
with it. See §13.

The case study pages followed, and settled what a subpage is. They read as a
different document while using the same palette and the same two faces, and
none of the four reasons was chromatic: the write-up was a 65ch column centred
in the viewport, so the reading edge moved about 340px right of every edge
above it halfway down the page; the bands were divided by full-bleed
`border-t` rather than the inset, fading `.section-rule`; the write-up arrived
with no head on it, so an MDX `##` landed cold against two headed bands; and
the outcome grid faked its dividers with `gap-px` over `bg-line`, which filled
the empty cells of a four-in-three grid with the gutter colour.

The structural fixes are the floor and were not the decision. The decision is
that **the write-up is paper**, which is §13's split applied one level out: the
shelf is the object, the case study is the artifact, and reading happens in the
document. That is also why the dive into a volume was the best-designed moment
on the site and the arrival was the weakest — the animation promised a page and
delivered more dark ground.

Two objections were weighed and did not survive contact with the content. §8
warns that a second paper object reads as the same object twice, but the shelf
and the sheet are on different pages and reached in sequence, so bound paper
then loose paper is the rhyme rather than the repetition. And a long sheet is a
lot of light for one lamp — except the thirteen bodies run 136 to 510 words,
median 255, so the longest sheet is about two viewport heights. The same
arithmetic is what ruled out deleting the bands entirely: at 175 words a
continuous column with nothing around it reads as thin, not as calm.

Four alternatives were built and looked at in `.inspiration/subpage-study.html`
before this was picked: the structural fix alone, a sticky specification rail,
a marginal-label spread, and the fully continuous document. The spread is the
one worth revisiting if the subpages ever need a stronger point of view; it was
set aside because it spends the page's structure on a book metaphor the shelf
has already made, and because the margin has no honest answer below 900px.

`mdx-components.tsx` was not touched. It hard-codes the dark ramp, and
`.paper-prose` re-inks it from outside `@layer`, so the overrides win on
cascade order rather than specificity and no component has to carry a surface
it does not otherwise care about. The bullet loses its green there: §2 spends
green once per view as a lit point, and a dot printed on paper is neither.

Everything else still uses the old card language. See `BACKLOG.md`.

## 13. The resume: the object and the page

**Shipped.** This is the second section object in the real site and the first
one that answered the question §4 spent four rejected prototypes on: where the
text actually gets read.

The answer is a split, and it is the reusable part. **The object is not the way
in to the content, it is the way to the artifact.** Reading happens in the
document, with no click. Taking happens on the desk.

That resolves every rejection in §4 at once, because all four of them were
attempts to make one thing do both jobs. Text on the sheet in perspective is
unreadable at any camera distance that still shows the object. Click-to-open
puts the one thing a visitor came for behind a toll gate, which is fine for
thirteen legible spines and not fine for a single sheet. A PDF embed is the one
element on the site that cannot be made of any of the four materials.

### The page

`ResumeBody` is a sheet of paper, and it is the first surface on the site made
of the fourth material at full size. 48rem, ink at 8.9:1, dates and places in
the margin, prose in the column, three runs on one sheet rather than three
panels beside each other. It replaced a two-column card grid with lucide icons
and timeline dots.

The sheet is set as a broadsheet, and the length is paid for with width rather
than with cuts. Every word of every role is on it. At full prose in one column
the six roles ran to 8,600px, eight and a half screens and 53 percent of the
whole front page; in two columns on a 60rem sheet the same words run to
5,800px. Collapsing the older roles to one line each was tried first and
rejected: it read as a shorter document rather than a better one, and the point
of putting the resume on paper is that all of it is there.

Three things follow from the columns, and each replaced something that looked
wrong before it:

*Everything is flush left off one edge.* The first pass kept dates in a margin
and ran the prose across the full width, so each role's title began two hundred
pixels to the right of its own first line. A margin and a full measure cannot
both be right, and the columns are what the length needs, so the dates became an
overline.

*Paragraphs break across the column and a rule is drawn between.* Holding them
whole left the left column ending half way down with a hole under it, because a
seven-line paragraph does not fit in what is left. Letting them break and
drawing the boundary is what a newspaper does and is the only version where
both columns fill.

*The masthead carries the contact block on the right.* With the name alone the
top of the sheet was a headline over five hundred pixels of empty paper.
Education and certifications run two-up for the same reason: a four-line entry
given 848px of measure is mostly empty paper.

*The hierarchy is carried by size, weight, case and position, because paper
has one hue.* The dark layout could hand it to colour — the company was green,
the period a grey eyebrow, the role a heading — and the first pass on paper
spent none of that and nothing in its place: role, company and body were all
regular serif within half a step of each other. Every entry now has four
registers and no two of them are the same kind of type. The run label is mono,
uppercase, at full ink over a 2px rule. The title is the only semibold thing in
an entry. The date is mono, small, pushed to the right edge on the title's own
baseline, which is where a reader scanning a CV looks for it and which also
stops the entry opening with two quiet lines before anything with weight in it.
The company or issuer sits under the title in the second ink at body size.

*The two-up runs are ruled, and their metadata is one line.* A gutter alone was
not separation: rows size to the tallest cell, so a short entry beside a long
one left a field of white with no boundary in it and reading down a column you
could not tell where one certificate ended and the next began. A rule over
every row is how a printed directory has always solved that. The date, the
credential and the link then collapsed onto a single mono line, because they
are the same kind of thing — the paperwork behind the certificate — and stacked
they made four near-identical lines an entry that had to be read before they
could be told apart.

### The fold

Two roles stand above the fold, the current engagement and the one before it,
and the rest is one press away. Closed the sheet is 2,300px and the whole front
page is 11,800px; open it is 5,800px and 15,400px. Nothing is cut either way.

It is a `<details>` rather than a state hook, and that is the reason
`ResumeBody` is still a server component: no client JavaScript, keyboard and
screen-reader behaviour for free, the folded text still in the DOM for
crawlers, find-in-page opening it on a hit, and — the part a CSS clip gets
wrong — nothing below the fold is focusable while it is closed.

The control went through two versions and the first one failed in the way that
matters. It was a line of caption-sized type between two hairlines, which is
the exact shape of a divider, so it was read as one and the rest of the record
went unopened. Discreet is not the same as invisible, and a control nobody
presses is a control that is not there.

The constraint on fixing it is that colour was unavailable: §2 spends green
once per view and this section already spends it on the take action beside the
object. So the affordance had to come from shape, contrast and motion. What it
is now is a bordered box at full 8.9:1 ink, 273 by 47, with a circled arrow in
it and a line under it naming what is behind — four more roles, education,
certifications — because the count is known and a reader deciding whether to
press deserves it. That is what a control printed on a form looks like, which
is the only kind of button a sheet of paper can carry.

The arrow nods, two and a half pixels once every three and a half seconds, and
stops the moment the fold opens. It is there for discovery and nothing else.
This does not breach §4's rule against interaction as a toll gate: that rule is
about the objects, and it is about content a visitor cannot otherwise reach.
Here the fold is inside the document, and the document is the thing that was
already open.

Two things worth not re-deriving. The paper gradient stops at `--paper-2` and
never reaches `--paper-3`: the label ink falls to 3.98:1 against the darker
stock, and a sheet this tall is read at its foot as well as its head. And the
ink needed two more steps, `--paper-ink-2` and `--paper-ink-3`, both solved
against `--paper-2` rather than `--paper` for the same reason.

The honest framing of why this exists: a long read at 17px on a near-black
ground is the thing every dark portfolio gets wrong, and inverting the palette
to fix it would put a white panel in a room lit by one lamp.

### The object

An A4 sheet at true ratio on the desk, under a hinged brass clip, with a pen
across the corner and two more sheets under it — one sheet alone reads as a
decal, a small stack reads as paper. Desk, rig and environment are the hero's,
which is why `makeOak` moved out of `InlineGlobeScene.tsx` into
`components/materials/oak.ts`: the desk under the resume has to be the same
desk the globe stands on, and that is only true if it comes from the same
function. The desk is dimmed with a colour multiplier rather than by touching
the rig, because at this camera distance it fills the frame and undimmed it
takes the light the sheet is supposed to have.

The face is set as ruled measure rather than as body copy, which is §4's
finding applied rather than fought. What makes it honest is that the counts are
real: one bar per experience entry, per certification, per case study. Turning
a section off visibly shortens the page, because the leading is solved for the
runs that are switched on. A fixed step either truncated the last two runs with
everything enabled or left half the sheet blank on the résumé.

This replaced the download row and the customizer popover outright. The same
four toggles drive the same seventeen pre-built PDFs; they are no longer a
dropdown over a page, they are what is printed on the sheet in the clip.
Clicking the sheet lifts it out and downloads that variant, which is
interaction as depth rather than as a toll gate.

The controls are real markup and render on every viewport and under reduced
motion. The object is pure enhancement above them, and where it is skipped it
renders nothing at all rather than an empty strip of desk.

Green appears once in the section, on the take action, which §2 reserves for
the one action that matters on a screen. The toggles are brass.

## Logbook

**2026-08-25, later.** §12, the case study pages. The finding worth carrying is
that the subpage read as foreign for structural reasons and not chromatic ones,
so no amount of restyling a piece would have fixed it — the reading edge moved,
which is the one thing a page cannot survive. The second finding is that
counting the words first is what settled the choice between five options: the
bodies are short enough that a sheet is a page and long enough that deleting the
bands would leave nothing.

**2026-08-25.** §13, the resume. The finding worth carrying is the split
between reading and taking: every interaction model §4 rejected was an attempt
to make one surface do both, and separating them makes the object cheap and the
page better at the same time. Also the first real use of paper at full size,
which turned up the gradient/contrast constraint now recorded in §13.

**2026-08-24, later still.** §12. The conclusion that took longest to reach
is that the site did not need more rendered objects to feel like one thing; it
needed the part that is not rendered to be made of the same materials as the
part that is. The brass plate failing in CSS for exactly the reason §5 gives
for three.js is the most reusable finding of the day.

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
