# Art direction: the portfolio as an office

The rule book for how `nordbye.it` looks and moves. `branding/README.md` covers
assets that live off-site; `src/content/brand.ts` holds the tokens. This file
holds the intent both of those have to serve, and it wins when they disagree.

Status: direction locked, nothing built against it yet. Written before the work
so the work has something to be checked against.

---

## 1. The thesis

The site is a place, not a page. A visitor is standing in a room that belongs to
someone who is good at this and has been doing it a while.

There is one room. The portfolio is a guided camera move through it, on rails.
`/fun` is the same room with the rails taken off. The room is designed for the
portfolio first, because that is where it has to look expensive; `/fun` adapts to
it afterwards and the current 3D room is replaced by it rather than kept.

That means everything below describes one scene, built once, used twice.

## 2. What "high end" means here

A study, with English discipline and Norwegian material. Both halves are
load-bearing, and each one fails differently on its own.

From the English half comes the order: joinery, fitted bookcases, a proper desk,
everything planed and finished and squared. From the Norwegian half comes the
material and the light: dark oak rather than mahogany, the forest outside the
window, and one warm lamp against an afternoon that went dark at three.

Drop the English half and it slides into a cabin. Rough-sawn wood, folk pattern,
rusticity worn as a personality. Drop the Norwegian half and it becomes a
gentlemen's club: leather buttoning, portraits, mahogany, a crest. The target is
the study in a good Oslo house, which is neither of those.

The wealth is not in what was bought, it is in what was kept. Rooted rather than
rich, continuous rather than expensive, which is what makes generational the
right word and luxury the wrong one.

The feeling to aim at is calm, not impact. Someone should arrive and breathe out.
The expensive quality is a consequence of that calm and never the thing being
chased: a site trying to look expensive does not, and a site that is genuinely
quiet and warm and made of real materials reads as expensive without trying.

Concretely: deep warm shadow, one pool of light, a few real objects with weight,
and a great deal of nothing.

### The forest is the view, not the construction

Green is not an accent colour picked for contrast against a dark ground. Green is
the forest, seen through the window and carried inside in the wool and on the
walls. That is the reason it can never be a glowing interface colour, and the
reason it appears as a lit point rather than as a surface.

It is also the reason the wood is planed. The forest belongs outside the room and
in the palette. Inside, it has been through a workshop.

### The anti-references

Anything rustic. Log walls, rough-sawn edges, knots left on show, folk pattern,
plaid, antlers.
Anything clubbable. Leather buttoning, portrait walls, crests, mahogany.
SaaS dark mode, meaning grey cards with 1px borders on flat near-black.
Glassmorphism, frosted panels, neon rims.
Gold gradients, gold serif capitals, crypto-luxury.
Spaceship and HUD chrome: reticles, scanlines, status pills, ENTER buttons,
live-feed sweeps, letterspaced uppercase mono used as decoration.
Stock minimalism: white gallery walls, thin geometric sans, one accent colour
sitting on nothing.

The hero has already had most of this removed. What remains is on the room card
and throughout `/fun`.

## 3. The physical model

One rule generates most of the others. Every surface is one of four materials and
there are no others.

Ground is the room itself: a near-black that is warm and deep, never flat black,
never neutral grey. Most of the page is this.

Wood is the oak tabletop, the plane objects stand on. It appears low in a
composition, catching the rake light, and it is the reason the page has a floor.

Brass is hardware. Rules, edges, frames, markers, engraved labels, the meridian
on the globe. Polished, warm, metalness 1. It is the brightest thing on the page,
and it is bright because it is reflecting the lamp, not because it emits.

Paper is content. Anything meant to be read as printed matter gets a warm
off-white ground. Paper is the only light field allowed, and it is always a
discrete object with an edge, never a full-width section.

Green is not a material. Green is a lit point: a pin, a status dot, an inlay, a
screen. Once per view at most. Never a fill, never a border, never a glow behind
a card.

## 4. Light

There is one lamp, at the upper left, and everything in frame obeys it.

The rig in `InlineGlobeScene.tsx` is correct and is now the reference for the
whole site: warm key at `#ffd49a` from the upper left, a dim cool bounce from the
right so the shadow side is not dead, a warm spot raking the tabletop, very
little ambient, ACES filmic at 1.05 exposure.

For anything not rendered in 3D: highlights sit on the top-left edge, shadows
fall lower-right, long and soft, and touch the object at its base. An element
with an even glow on all four sides is lit from nowhere and reads as a UI panel.

Nothing emits its own light except screens and lamps. A card does not glow. A
border does not glow. A hover state does not glow.

Contrast comes from falloff, not separators. If two areas need telling apart,
change the material or move one into shadow. Do not draw a line between them.

## 5. Typography

Fraunces carries display, at optical sizes, never in all caps. It is a serif with
real modelling, which is what makes a heading read as printed rather than typed.

The body sans stays quiet and does not draw attention to itself.

Mono is engraving: labels, measurements, coordinates, part numbers, the names of
things. Small, tracked, usually uppercase. It never carries a sentence and never
appears as decoration because it looks technical.

The house annotation device is the leader label: a mono caption on a hairline
brass rule with a small lit dot at the end. The globe already uses it for Oslo.
It is the standard way to name anything on this site, and using it twice in a
view is most of what makes two unrelated objects look like one instrument.

## 6. Composition

Sections are surfaces, not cards. Content rests on something.

No card borders anywhere. Depth is shadow and material change. A 1px grey
rectangle around a group of text is the fastest way to make this look like every
other portfolio.

Nothing is centred. The lamp is upper left, so the composition has a direction
and symmetry contradicts it.

Emptiness is the main expense. A section that feels underfilled is usually right.

Objects have weight and stand on something. Anything in frame has a contact
shadow and a plausible size. Where the camera crops the tabletop to the bottom of
frame, objects that need to hold their own go on a stand, which is why the globe
is on one.

## 7. The camera

The scroll is one continuous camera move through one space, tied one to one to
scroll position and fully reversible. Scrubbing back up runs it backwards
exactly. It never cuts.

The route is arrive, be shown, be shown out:

| Stop | Where the camera is | What is there |
|---|---|---|
| 1 | The doorway, looking in | Arrival. The room, whole, before anything is explained. This is also the loading strategy, see below. |
| 2 | Crossing to the desk, settling at working distance | Hero and about. The globe, the portrait, the desk. |
| 3 | Turning to the shelf | Resume and certificates. A bound document, the certs behind it. |
| 4 | The long wall | Work. The case studies as prints laid out on the wall. |
| 5 | The far wall | Infrastructure. The technical drawing, brass hairlines on dark. |
| 6 | Back at the door | Blog on a side table, contact as a card in a holder, and out. |

Stops are where the camera slows and holds while text is read. The move between
stops is where it travels. Text is never animated during travel and never
required to be read while the camera is moving.

Stop 1 does double duty. A dark threshold with one lit rectangle beyond it is the
cheapest frame in the whole sequence, so it renders immediately while the rest of
the room streams in behind it. This is not a loading screen dressed up as
narrative; it is narrative that happens to also be the preload, and the two
should be built as one thing rather than bolted together. The skip into the plain
view sits at the same threshold, which is the moment a visitor decides whether to
walk in at all.

Blog sitting at stop 6 is a proposal, not a decision. If the blog earns more than
a side table it takes its own stop between 4 and 5.

Motion classes, and nothing outside them:

Camera, as above.
Parallax of real depth, meaning things nearer the lens move more than the wall.
Small, roughly 2 to 8 percent, because it is describing a physical offset rather
than selling an effect.
Reveal, meaning content arriving. Around 240ms, one direction, one element at a
time. No stagger down a list, no letter-by-letter, no counting up to a number.

The light is allowed to move. Over the length of the page the key rakes a few
degrees, so shadows lengthen and the room drifts slightly later into the evening.
This is the page modifying itself using physics rather than effects, and it costs
one light rotation driven by scroll. The range stays small enough that a visitor
notices it on the second visit, not the first.

Banned: scroll hijack, sections pinned in a way that fights the scrollbar,
horizontal takeovers, text that scrambles or decodes, progress bars that are not
measuring anything, and any animation that delays reading.

## 8. Every section is an object

The metaphor is taken all the way. Each section is a thing in the room rather
than a block of page dressed to look like one.

| Section | The object |
|---|---|
| Hero | The desk. The globe on its stand, and the way into the room beside it. |
| About | A framed photograph, and what is on the shelf behind it. |
| Resume | A bound document on paper, held by a brass clip. |
| Work | Prints, one per case study, laid out and lit. |
| Infrastructure | The technical drawing. The one place diagrams are allowed. |
| Blog | A stack of papers, most recent on top. |
| Contact | An engraved plate, or a card standing in a holder. |
| Footer | The far edge of the desk, and what is past it. |

The cost of going this far is that a visitor looking for one fact has to go
through an object to get it. That is what the plain view in section 9 exists to
solve, and it is the reason the plain view is not optional.

## 9. The plain view

A quiet control in the header, present from first paint, that swaps the whole
site for a plain typographic version: the same content, same palette, no room, no
camera, no objects. Once chosen it is remembered for that visitor.

It is served automatically, without being asked for, to:

`prefers-reduced-motion`
print
crawlers and link previewers
anything where WebGL is unavailable or fails

The plain view is not a degraded fallback and is not allowed to look like one. It
is the printed version of the same brand: paper, brass rules, Fraunces, mono
labels, correct in a way that someone would be happy to be judged on if they
never saw the room at all.

## 10. Performance

Priority order when things conflict: memorability first, performance alongside
it, and the plain view as the release valve rather than a reason to water the
room down.

One WebGL canvas for the entire site. New objects go into the scene that exists;
a second canvas is not an option. Everything outside it is CSS.

The scene is not paid for until the visitor interacts, which is how the hero
already works. Nothing about the scroll choreography may block first paint or
first read.

On a mid-range phone the camera stops and the room stays. Three or four fixed
framings that cross-fade, at reduced resolution, keeping the material, the lamp
and the shadows and losing only the travel between stops. Desktop
`prefers-reduced-motion` gets the same treatment.

Below that, the plain view.

## 11. The conflict with the current tokens

`src/content/brand.ts` currently bans what this document requires. Its `imagery`
block says no photorealism, geometry over illustration, no 3D-rendered blobs, and
prescribes flat vector compositions.

That rule was written for blog covers and OG cards and is still right for those,
because a flat card survives feed re-compression and a render does not. So the
rule splits rather than gets replaced. On-site the direction is hyperreal and
material. Off-site, in anything that will be re-compressed by LinkedIn, Reddit or
an OG preview, it stays flat and geometric.

`branding/README.md` also still documents a "fjord at midnight" arctic-blue
palette the site no longer uses. It needs updating to Eucalyptus, separately from
this.

## 12. How this fails

Worth writing down while it is still cheap to avoid.

It becomes a rollercoaster. The camera is doing too much and the visitor cannot
read. The fix is fewer stops and longer holds, not smoother easing.

The objects become props. A resume that is bound-document-shaped but has none of
a document's affordances is worse than a plain list. Every object has to work as
the thing it depicts before it is allowed to look like it.

It gets slow and nobody sees it. Guard this with the phone budget above, and
measure on a real mid-range device rather than a throttled desktop.

It reads as a game. The moment a reticle, a status pill, an ENTER button or a
scanline appears, the whole register collapses. This is the failure mode the site
has already had once.

It becomes brown mush. Four materials and one lamp is a narrow palette, and
without the cool bounce and the brass it goes uniformly sepia. The green pin and
the cold rim light are what keep it from looking like a filter.

It drifts rustic. This is the likeliest failure of the five, because every
texture decision has a cosier version one step away: a slightly rougher wood, a
visible knot, a woven pattern, a warmer light. Each one is defensible alone and
the sum is a cabin. The check is whether a cabinetmaker or a carpenter made the
thing on screen.

## 13. The banned list, in one place

Card borders. Glows. Glassmorphism. Gradients between two brand colours. Neon.
Gold. Mahogany. Leather buttoning. Crests. Log walls. Rough-sawn edges. Folk
pattern. Plaid. Antlers. Flat black. Neutral grey. Centred compositions. Scanlines. Reticles. Status
pills. ENTER buttons. Live-feed sweeps. Mono prose. All-caps display serif.
Stagger animations. Letter-by-letter reveals. Counting numbers. Scroll hijack.
Stock photography. People. Emoji. A second canvas.

## Logbook

Nothing built yet. Add findings here as the work lands, the way the banner README
does, so the next pass starts further ahead.
