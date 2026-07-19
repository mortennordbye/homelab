# The fun room — plan

An explorable 3D room at `/fun`, reached from a nav entry beside the others. The room is the
portfolio: the objects in it are the site's sections, and you interact with them instead of
clicking links.

- Status: **room built and walkable. Printer, hardware, bookshelf and certificates interactive; pinboard, blog screen and contact object not started.**
- Scope: `portfolio/` frontend.
- Started 2026-07-19.

---

## 1. How this got here

This began as an operations centre on `/infrastructure`, and two things changed during the
build.

The first was scale. A corporate NOC with a wall of screens and a six-metre desk was the wrong
reference. This is a personal homelab, so the room is a spare room with one desk in it. The
interior follows reference photos of the real flat: sage green walls, pale oak, warm light.

The second was placement. Putting a 3D room on `/infrastructure` fought with that page's whole
premise, which is that its claims are checkable. Moving it to its own `fun` entry resolves that:
a page labelled fun is honest by construction, nobody mistakes it for a claim, and
`/infrastructure` keeps its sober static content untouched.

---

## 2. What exists now

Route `/fun`, dynamic-imported with `ssr: false`. Nav entry added in `src/content/site.ts`.
`/infrastructure` is unchanged from before this work.

| Piece | File |
|---|---|
| Shell on the middle monitor | `src/components/fun/Terminal.tsx` |
| Socials, contact, blog, interests, timeline | `src/components/fun/Objects.tsx` |
| Bookshelf: case studies and certificates | `src/components/fun/Bookshelf.tsx` |
| Shelf data types | `src/components/fun/shelf.ts` |
| Hardware inventory, from the README | `src/components/fun/hardware.ts` |
| Scene composition, lighting, post, HUD | `src/components/fun/FunRoom.tsx` |
| Room geometry and props | `src/components/fun/Room.tsx` |
| Screen mesh plus DOM panel mount | `src/components/fun/Screen.tsx` |
| Panel content, six of them | `src/components/fun/Panels.tsx` |
| Feed hook, typed status shape | `src/components/fun/feed.ts` |
| PBR surface loader | `src/components/fun/textures.ts` |
| First-person movement and collision | `src/components/fun/FirstPerson.tsx` |
| Entry camera move | `src/components/fun/EntrySequence.tsx` |
| Look-at-and-press interaction | `src/components/fun/interaction.tsx` |
| Crosshair, prompt, keybind card | `src/components/fun/Hud.tsx` |
| CV printer | `src/components/fun/Printer.tsx` |
| Homelab hardware models | `src/components/fun/Devices.tsx` |

The room contains a desk with three monitors, a wall panel above them, two screens on the side
wall, a chair, a mushroom lamp, keyboard, mouse, mug, framed prints, a jute rug, a panelled
door, a potted plant, a printer on a low cabinet, a bookshelf, and the homelab sideboard.

The sideboard is modelled from reference photos of the real flat. It is open-fronted, showing
the actual kit at real dimensions: three ThinkCentres stood on edge, the ISP router, a UniFi
Cloud Gateway Ultra, a fanless mini PC, a Flex Mini, an 8-port switch, a 4-bay Synology, and a
hub puck, all with live-blinking LEDs. The access point lies flat on top, where it actually
sits.

It had hinged doors that swung open on `E`. They are gone: hiding the one thing the room exists
to show, behind an interaction someone has to discover first, was the wrong trade. The reveal
was good, but only for the people who found it.

All six panels read from `/api/v1/infra` through `useInfraFeed`, on a 60 second poll, with the
same snapshot and staleness rules as `LiveStatus` on the classic page. The seventh panel
definition (`FEED STATUS`) has no screen because the HUD already carries live/stale/snapshot
state persistently.

### Local data

`/api/v1/infra` reads a file. In the cluster that is a mounted ConfigMap; locally
`compose.yaml` sets `STATUS_FILE=/app/dev/status.json` pointing at `portfolio/dev/status.json`.
Same code path, local data. Without it the endpoint falls back to a two-field build-time
snapshot and the room has nothing to show.

That fixture also carries `apps`, `capacity` and `certs`, which the real publisher does not emit
yet. Every consumer treats them as optional, so production degrades to "no data" panels rather
than breaking. Wiring the publisher to emit them for real is still open.

---

## 3. Decisions worth keeping

**The room never becomes the only path to anything.** Every section it exposes stays reachable
through normal navigation. That is what lets the room skip carrying SEO and accessibility on its
own, and it is why `fun` sits beside the nav rather than replacing it.

**Free movement is the default.** First person, WASD, mouse look, pointer lock, collision
volumes, head bob scaled to actual speed. A room you are shown is a diagram with extra steps.

**Real DOM for screen content, not textures.** drei `<Html transform occlude>`. Text stays crisp
at any distance and reuses real React components. Note that in transform mode drei sizes the DOM
at `distanceFactor / 400` world units per CSS pixel, so the factor is derived from the screen's
physical width and the `scale` prop must stay off or the two compound.

**Screen sizes are physical.** Desk monitors are 0.62m wide, the wall panel 1.42m. Text is
small from across the room and readable when you walk up, which is correct behaviour rather
than a problem to solve.

**Plan 5.4's DOM culling was removed.** The original plan capped live DOM panels at four,
promoted by camera distance. With screens on three walls, pure distance ranking favoured the
screens behind you over the wall you were facing, so the panels you were looking at went dark.
Measurement showed no detectable cost for all of them mounted, so the cap is gone. If the room
grows past a dozen screens, bring it back scored by distance *and* view angle.

---

## 4. What made it stop looking like a 2000s game

Recorded because the ordering was counter-intuitive and cost several iterations.

Texture resolution was not the problem. In rough order of what actually mattered:

0. **Ambient occlusion, and less ambient light.** Added after the first commit, when the room
   still read as flat. Direct lights cannot darken a crease, so with no AO every corner and
   every join between a leg and the floor took the same fill as an open wall, and the room read
   as decals on a backdrop. The other half was that `ambientLight` 0.5 plus `hemisphereLight`
   0.9 was pouring 1.4 units of directionless light into the scene, which flattens the shading
   gradient that tells you what shape a thing is. They dropped hard, IBL went 0.45 → 0.75, and
   the key moved into a fitting. Brightness belongs in something that has a direction and falls
   off. Both changes are free — no download — and N8AO measured at no detectable frame cost.
   Current values live in `Lighting` in `FunRoom.tsx`; they moved again when the window came
   out, so read them there rather than trusting a number written here.

1. **Shadows.** One shadow-casting spot light. Contact shadows are the strongest single cue that
   an object is sitting on a surface rather than pasted over it.
2. **Post-processing.** ACES filmic tone mapping, mild bloom, vignette, composer MSAA. Raw WebGL
   output reads as raw WebGL output.
3. **Image-based lighting.** A 1K CC0 HDRI. Without an environment map nothing has anything to
   reflect and every surface reads as flat paint.
4. **Real PBR surfaces** with normal and roughness maps, replacing hand-generated canvas
   textures. Flat albedo with no relief was what read as pixel art.
5. **Rounded edges.** `RoundedBox` everywhere. Real objects have a chamfer that catches a
   highlight; perfect 90 degree edges are why primitives look like primitives.

### Depth is what makes hand-built joinery read

The window and the sideboard doors came out; the flat plane standing in for a door was replaced
with a real one. Three things fell out of that.

A door group sat on the far wall is rotated 180 degrees, which flips the sign of every depth
offset inside it. Building the door against local `-z` buried it in the wall and left an 8mm
sliver of the leaf poking through as a featureless white slab. Depth offsets in a rotated group
should be written against "away from the wall", not a raw axis.

Panel detail has to be real geometry. The first attempt stacked a sunk field and a moulding on
a solid slab, giving a 5mm step that disappeared under any light. The leaf is now a frame —
three stiles, three rails, thin back panel — so the frame stands ~28mm proud and throws an
actual shadow line. This is the same lesson as the sideboard carcass: a solid box with detail
laid on top reads as a solid box.

Removing the window removed the motivation for the daylight. A strong directional raking in
from a blank wall is light from a source you can look straight at and not find, so the pendant
became the main shadow-casting source. One pendant in the middle of a 5.2 x 4.8m room leaves
the far end a cave, and the fix was a second warm source down there rather than more ambient,
which would have flattened the whole room to solve a problem in one corner.

Two more traps. Anything that suspends (`Environment`, `useTexture`) must sit
inside the same Suspense boundary as `EffectComposer`, or React tears the Canvas subtree down
mid-flight and the composer builds against a renderer whose GL context is already gone, failing
with `Cannot read properties of null (reading 'alpha')`. And a single point light standing in
for a ceiling panel blows out whatever is directly beneath it while leaving the rest of the room
black; most of the illumination belongs in broad fill.

### Assets

CC0 from Poly Haven, downscaled to 1K, WebP for surfaces. In `portfolio/public/textures/fun/`.

| Asset | Use |
|---|---|
| `laminate_floor_02` | pale oak floor |
| `plastered_wall_04` | walls and ceiling |
| `oak_veneer_01` | desk, cabinet, shelving |
| `dirty_carpet` | jute rug |
| `env_studio_1k.hdr` (brown_photostudio_02) | environment lighting |

Total 3.1MB. Attribution is rendered bottom-right inside the room.

Two surface sets were dropped before the first commit: `ceiling_interior` (the ceiling uses
`plastered_wall_04`) and `wood_table_001` (superseded by `oak_veneer_01`). Both were dead
files nothing sampled.

A correction worth recording, because the first version of this note was wrong. It claimed
`ceiling_interior` was costing every visitor a 650KB download because it was still listed in
`preloadSurfaces`. It was not: `preloadSurfaces` was exported and never called from anywhere,
so no preloading happened at all and the browser only ever fetched what a material actually
bound. The measurement that would have caught this was in hand the whole time — the network
panel showed 13 texture requests while 16 files existed on disk. Reading the call graph, not
just the file, is the check.

`preloadSurfaces` and `preloadProps` are now both invoked at module scope in `FunRoom.tsx`.
A dead preload is invisible in the worst way: everything still loads correctly, just later and
one asset at a time.

### Models

| Model | Replaces |
|---|---|
| `dining_chair_02` | a chair built from four boxes |
| `potted_plant_04` | a plant built from icosahedron blobs |
| `modern_ceiling_lamp_01` | a flat emissive square on the ceiling plane |

The plant was first `calathea_orbifolia_01`, which is foliage only, so it grew straight out of
the floorboards. `potted_plant_04` ships plant and pot as one asset for 0.2MB more. Where a
scanned asset includes the thing it stands in, take it whole rather than parenting a hand-built
pot under scanned leaves and matching the scale by eye.

3.2MB of 1K glTF. Loaded through `Prop` in `props.tsx`, which measures each model's bounding
box after load and seats it on its own base, because scanned assets share no convention for
origin or units and hand-tuned per-model offsets drift the moment an asset is re-exported.

---

## 5. Measured

Chromium on an Apple M4 Pro, dev server, 1600x1000.

| Configuration | Median frame | p95 | fps |
|---|---|---|---|
| Phase 0 spike, 4 DOM panels, 8.3 Mpx | 8.3ms | 9.4ms | 120 |
| Full room, 6 panels, shadows + IBL + post | 8.3ms | 10.0ms | 120 |

Vsync-capped throughout, so this establishes headroom exists without showing how much. Still
untested on integrated graphics, which is the target that matters. Treat as "no pathological
cost found", not "budget proven".

---

## 6. The asset budget, revisited

The original plan capped new assets at 3MB. That was written when the room loaded as part of
`/infrastructure`. For a deliberately entered experience behind a nav click and a loading
screen, it is the wrong constraint, and it is dropped.

The real constraint is not policy. The site is served from the cluster with no CDN in front
(Cloudflare is DNS only), so every megabyte is upstream bandwidth off a home connection, per
cold visitor. **Before anything large ships, heavy assets need to move behind a CDN or an object
store.** They are static and immutable, so they cache perfectly. This is a prerequisite for the
expansion in section 7, not a nice-to-have.

---

## 7. Next: the objects

The room is furniture right now. The point is interaction. Each object maps to a section that
already exists as structured data in `src/content/`, so this is staging, not authoring.

### Everything named, and the shelf that grows itself

Two interaction passes landed together.

**Hardware is named.** Every device in the sideboard is wrapped in an `Interactive` whose label
is the real product name and whose detail line is its role, both transcribed into
`hardware.ts` from the README hardware tables. Looking at a device names it; `E` opens a card
with the full specification. The three ThinkCentres are three different machines and are
labelled individually rather than as "a ThinkCentre" three times.

The README is the source of truth for this. One device in the room has no README row, the UniFi
Flex Mini, and it carries no spec line rather than an invented one — its card says so.

**The shelf is generated.** `Bookshelf.tsx` lays books out from `src/content/work/*.mdx` and
certificates from `certs` in `resume.ts`, both read on the server in `app/fun/page.tsx` and
passed down as plain data. Rows fill left to right and wrap; the unit's height is then derived
from the row count. Adding a case study or a certification puts it in the room with no change
to the room's code, which was the requirement.

Three things worth keeping from building it.

Bay height has to be fixed with the unit growing to fit, not the other way round. The first
version divided a fixed 1.9m unit into however many bays the content needed, and because
thirteen books happen to fit on one shelf that produced two 0.9m bays with a row of paperbacks
lost at the bottom of each.

Spine width, height, colour and lean are hashed from the slug rather than randomised, so a case
study is always the same book in the same place. Random dressing reshuffles on every render and
makes the room feel unreliable in a way that is easy to notice and hard to name.

A label is only real if the crosshair can reach it, and two things failed that. The Hue Bridge
sat directly behind the 8-port switch and was permanently occluded. Worse, the certificates were
first modelled the way they really sit in a drawer — a flat stack of sheets — and from a
standing eye line only the top two of six could ever be put under the crosshair, because looking
down at a horizontal stack always hits the top sheet. They stand upright now. Anything meant to
be looked at has to present a face to the room; that is also why books work fine at ankle
height.

**Shadows, not picking, is what costs frames.** Adding the shelf halved the frame rate, 120fps
to 61. The obvious suspect was the interaction loop, which raycasts every registered target
every frame and had just gained thirty of them. That was wrong: a distance-reject added on that
assumption changed nothing and was removed again. The real cause is that the room's main light
is a *point* light, so its shadow map is a cube and every caster is rendered six more times.
Sixty small meshes inside a shelf were paying that for shadows ambient occlusion already
accounts for. `castShadow={false}` on books and certificates restored exactly 120fps. Anything
added inside furniture should follow the same rule, and the general lesson is to measure the
suspected cause before writing the fix — the fix landed first here, proved nothing, and its
comment would have recorded a false explanation permanently.

### A shell, not a desktop

A desktop environment was the obvious next move and was rejected. Pointer lock means there is
no cursor in the room, so anything window-and-icon shaped has to become a fullscreen overlay —
a second website inside the website, holding a second copy of content the real pages already
own, to be maintained twice. It also undoes the reason the room is interesting, which is that
content became objects.

A shell on the middle monitor adds something instead. It drives the public API, which is the
genuinely unusual thing about this portfolio and had no representation anywhere in the room,
and `curl /api/v1/profile` returns the real response rather than a mock. `ls work`, `cat
work/<slug>`, `social`, `contact` read data the room already holds.

The mechanic is the same one the info cards use: `E` releases the pointer so keystrokes reach
the DOM, and Esc gives it back. That forced a fix worth noting — movement and picking now stop
whenever anything has focus. Before this, WASD kept walking you across the room while a card
was open, because the key handlers are on `window` and had no idea the pointer had been
released.

### Icons have to be vector, not geometry

The social links were first stickers on a laptop lid on the desk, which is what a real desk
looks like. It failed for the reason the certificates failed, in a different way: a 10cm sticker
carrying a logo built from primitives is unreadable from anywhere you would stand, and a social
link that is not recognisable at a glance is not doing its job.

They are now a row of framed tiles on the wall above the desk, in the slot the big panel left
behind, drawn with real Simple Icons (CC0) marks through drei `Html` — the same real-DOM trick
the monitors use, so the marks are vector and stay sharp at any distance. The SVGs are applied
as a CSS mask so each takes its own brand colour. One `Html` layer holds all four tiles with a
separate invisible mesh per tile for picking, since the DOM layer is the expensive part and
picking geometry is nearly free.

### The television

The big panel hangs on nothing now — it stands on the sideboard, where a television actually
lives. It is centred at z 0.15 rather than on the sideboard's own centre, because a 1.42m screen
on the centre line stands directly in front of the access point on the top at z 0.97, and an
occluded device is one that can never be looked at. That is the third time that rule has caught
something.

### Verifying interaction without a pointer lock

Pointer lock does not work in headless Chromium, and `FirstPerson` overwrites the camera every
frame, so neither manual camera placement nor mouse-look is available to test with. What works
is temporarily parking `FirstPerson`, then stepping a scripted camera across the room and
reading the HUD prompt out of the DOM at each position. That turns "does every device have a
reachable label" into a list rather than a guess, and it is how the occluded Hue Bridge showed
up. Both temporary edits are reverted before commit.

One trap in reading the DOM this way: the site's command palette indexes page content, so
certificate titles and nav labels are present in the DOM whether or not the room is showing
them. An early check matched `.text-accent` and "confirmed" a prompt that was actually the nav's
Fun link. Scope the query to the prompt element.

| Object | Section | Source |
|---|---|---|
| Printer ✅ | CV download | `cv-variants.ts`, `cv-manifest.json` |
| Sideboard ✅ | the hardware itself, named and inspectable | README hardware tables |
| Desk monitors ✅ | infrastructure | `/api/v1/infra`, already wired |
| Bookshelf ✅ | work | `src/content/work/*.mdx` |
| Certificates ✅ | resume | `resume.ts` certifications |
| Social wall ✅ | socials | `site.ts` socials |
| Terminal ✅ | the public API | `/api/v1/*`, live |
| Gym bag ✅ | about / interests | `interests.ts` |
| Printed posts ✅ | blog | `/api/v1/blog`, fetched on open |
| Notepad ✅ | contact | `site.ts` |
| Framed timeline ✅ | career and education | `resume.ts` |

**The printer is built.** Four rocker switches on the lid map to the same four flags the CV
customizer uses; the green button resolves them against `cv-manifest.json`, feeds a sheet out of
the slot, and downloads the matching PDF. Verified end to end: flipping "home lab" and "photo"
off yields `/cv-1100.pdf`.

Two more traps, both found the hard way. An interaction target must not be the thing that
moves: hanging the cabinet toggle on its doors meant that once they swung open they were no
longer under the crosshair, leaving a cabinet that could not be closed — the target is now a
fixed invisible face. And a solid `RoundedBox` carcass looks identical whether the doors are
open or shut, so the cabinet is built from five panels with an open front.

The interaction system it needed now exists in `interaction.tsx`: a raycast down the camera
centre against a registry of opted-in objects, with an `E` prompt in the HUD. Two traps are
baked into its comments — the registry context must not carry hover state (identity churn
re-runs every registration effect, whose cleanup clears the hover, so the prompt never settles),
and targets register a ref rather than a value so inline `onActivate` closures do not re-register
every render.

---

## 8. Open

1. Loading screen. There is a bare "warming up" fallback; a real one is needed once assets grow.
2. Mobile. Untested and almost certainly broken. Pointer lock does not exist there. Decide
   between drag-to-look, a guided mode, or redirecting to the classic site.
3. Reduced motion. The skip-entry path exists but has not been verified.
4. WebGL failure and context loss. No handling. Must not be a blank canvas.
5. Publisher extension so `apps`, `capacity` and `certs` are real in production, not just in the
   local fixture.
6. **The desk.** Now the most obviously fake object in the room, and worth naming as a general
   effect: putting one scanned object next to hand-built ones does not lift them, it exposes
   them. The chair went photoreal and the desk beside it immediately read as cardboard. Either
   the desk becomes a model too or the room ends up visibly mixed. The same will be true of the
   framed prints and the mushroom lamp.
7. CDN or object store for assets, per section 6. Now 6.3MB total and growing with every model,
   so this is closer to blocking than it was.
8. One room or several. Recommendation is firmly one: a well-dressed single room beats five
   sparse ones and is a fraction of the work.

---

## 9. Housekeeping

**New files in `public/` do not reach the dev container.** Adding `public/models/fun/` and
reloading gave a 404 on every `.gltf` while the files were plainly on the host. `/app/public`
is the read-only `cv-bundle` named volume, not the bind mount — the compose file says so in a
comment. The volume is filled once by the `cv-bundle` one-shot service copying out of the
image, so anything new in `public/` needs `make clean && make build` before the container can
see it. Same symptom as the rename trap below, different mechanism, and both come down to
named volumes surviving a plain rebuild.

**Renaming a route directory needs a cache wipe.** After moving `components/ops` to
`components/fun`, the dev server returned 404 for every non-root route while the files were
plainly present in both host and container. Turbopack's persistence cache (the `next-cache`
volume) had stale route entries. `make clean && make build` fixes it; a plain `make build` does
not, because named volumes survive.


Done: the phase 0 spike is deleted, and the components moved from `src/components/ops/` to
`src/components/fun/` (with `OpsRoom` renamed to `FunRoom`, `/textures/ops/` to
`/textures/fun/`, and the `ops-immersive` body class to `fun-immersive`) so the code matches
the route it serves.

Still true: two files outside the feature directory are modified. `compose.yaml` carries the
`STATUS_FILE` dev env, and `src/app/globals.css` carries the `fun-immersive` body class that
hides the site header and footer while the room is mounted.
