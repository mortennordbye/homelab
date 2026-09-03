# Working on the fun room

Everything needed to pick this up cold. `docs/fun-room-plan.md` is the history and the
reasoning; this file is the practical guide. Read this one first.

---

## What it is

`/fun` is a first-person 3D flat that *is* the portfolio: every section of the site appears as
an object you can walk up to, look at and press `E` on.

The plan is the real apartment — 6.3 x 6.1m — with all four spaces
walkable: stue/kjøkken, soverom, bad and entré. `flat.ts` holds the plan, and both the wall
meshes and the collision boxes are built from that one list, so a wall you can walk through
cannot happen by editing one and forgetting the other. It lives in `portfolio/`, is
dynamic-imported with `ssr: false`, and never becomes the only path to anything — every section
it exposes stays reachable through normal navigation. That is what lets it skip carrying SEO and
accessibility on its own.

`/infrastructure` is deliberately separate and untouched. That page's premise is that its claims
are checkable, which a 3D room fights with. A page labelled "fun" is honest by construction.

---

## Running it

No native node. Everything is Docker-wrapped through the Makefile in `portfolio/`.

```bash
cd portfolio
make build          # start the dev stack → http://localhost:3000
make typecheck      # tsc --noEmit
make lint           # eslint
make clean          # tear down, including named volumes
```

**Two Docker traps that will waste an hour each.**

`/app/public` is the read-only `cv-bundle` **named volume**, not the bind mount — `compose.yaml`
says so in a comment. Anything new under `public/` (models, textures, icons) 404s until you run
`make clean && make build`, because the volume is filled once by a one-shot service copying out
of the image.

Turbopack's persistence cache is also a named volume (`next-cache`). After renaming a route or
component directory you can get a 404 on every route while the files are plainly present in both
host and container. `make clean && make build` fixes it; a plain `make build` does not.

A third, rarer one: the macOS bind mount can hand Turbopack a **truncated** copy of a file
mid-write, producing a syntax error at a line that is perfectly fine on disk. `touch` the file
and reload.

---

## File map

All under `portfolio/src/`.

| File | Responsibility |
|---|---|
| `app/fun/page.tsx` | **Server** component. Reads case studies, certs, career from disk and passes them down. |
| `app/fun/FunRoomClient.tsx` | Thin client wrapper — `next/dynamic` with `ssr:false` is illegal in a Server Component. |
| `components/fun/FunRoom.tsx` | Scene composition, lighting, post-processing, HUD, all card state, the loading screen. The root. |
| `components/fun/Room.tsx` | Room shell and furniture: walls, floor, desk, door, lantern, sideboard placement, object placement. Also owns `DESK_SCREEN` / `DESK_TERMINAL` / `CHAIR_Z`, because the stands and the collision boxes have to agree with them. Holds the shelf lamp's light, whose height comes from `shelfHeight(shelf)`. |
| `components/fun/flat.ts` | The floor plan: zones, wall runs with door openings, and the plan-to-world helpers (`at`, `px`, `pz`). Placements are written in plan metres so they can be checked against the drawing. |
| `components/fun/Furniture.tsx` | Sofa and television; the kitchen: runs, fridge column, wall units, sink, hob, oven, extractor, microwave; the bedroom: bed, mirrored wardrobe, over-bed units, fan, poster, blind; the bathroom: quadrant shower, wall-hung WC and duct, vanity, wall cabinet, washing machine, mat. |
| `components/fun/Devices.tsx` | Homelab hardware models + the sideboard. |
| `content/hardware.ts` | Hardware names and specs, transcribed from the repo README. Shared with `/infrastructure`, so every entry must have a README row. |
| `components/fun/Bookshelf.tsx` | Case studies as books, certificates as framed prints. Self-sizing, and the printer and the shelf lamp read their height off `shelfHeight`. |
| `components/fun/Objects.tsx` | Social wall, contact card, gym bag, career frame, skills faceplate, services leaflet rack. |
| `components/fun/Touch.tsx` | Phone controls. `TouchLook` (inside the Canvas **and** inside `InteractionProvider`) does drag-to-look and tap-to-activate; `TouchStick` is the DOM walk stick. |
| `components/fun/Sonos.tsx` | The speaker on the sideboard and the Web Audio rickroll it plays. No audio files — melody and drum kit are synthesised. |
| `components/fun/BlogBoard.tsx` | Whiteboard over the television. Lays itself out from `/api/v1/blog`, cover images included. Nothing to add here per post. |
| `components/fun/Terminal.tsx` | The shell on the middle monitor. |
| `components/fun/Screen.tsx` | Monitor mesh + DOM panel mount. `Screen` is one panel; `Dashboard` is the television carrying six at once; `PanelCard` is the chrome both share. |
| `components/fun/Panels.tsx` | Content of the live infra panels. Authored at one size (640x376) — the television scales them down, so there is no second "small" variant to keep in step. |
| `components/fun/feed.ts` | `/api/v1/infra` polling and staleness rules. |
| `components/fun/interaction.tsx` | Look-at-and-press: raycast registry, `Interactive` wrapper. |
| `components/fun/Hud.tsx` | Aiming dot, look-at prompt, keybinds, `InfoPanel` sheet. |
| `components/fun/LeaderLabel.tsx` | The house annotation device the prompts are built from. |
| `components/fun/FirstPerson.tsx` | WASD, collision, head bob. Writes the camera position **every frame it is enabled**, `y` included — anything else that moves the camera has to switch it off first. |
| `components/fun/props.tsx` | Scanned glTF prop loader (`Prop`). |
| `components/materials/surface.ts` | PBR surface loader (`useSurface`), shared with the shelf and the bench. |
| `components/materials/StudyEnvironment.tsx` | The site's IBL. Shared with the shelf, the bench and the resume object. |
| `components/materials/oak.ts` | `OAK` tints, so every oak surface on the site is the same plank. |
| `components/fun/shelf.ts` | Shared data types for shelf and career. |

Assets: `public/textures/shelf/` (390KB, shared with the home page), `public/textures/fun/` (48KB),
`public/models/fun/` (2.9MB), `public/icons/social/`. A cold `/fun` measures about 3.2MB of assets.
No HDRI ships — `StudyEnvironment` builds the probe from two `Lightformer`s at no byte cost.

---

## How data reaches the room

The page is a Server Component so it can read content off disk, then hands plain data to the
client. **There is no API route for room content and there should not be one.**

```
app/fun/page.tsx  (server)
  getAllWork()          → src/content/work/*.mdx
  certs, experience,
  education             → src/content/resume.ts
        │  shelf: ShelfData, career: CareerData
        ▼
FunRoomClient.tsx  (client, dynamic import)
        ▼
FunRoom.tsx → Room.tsx → Bookshelf / Objects / Devices
```

Live data is different: `feed.ts` polls `/api/v1/infra` every 60s, and `BlogBoard` fetches
`/api/v1/blog` once when the room loads, because six cover images have to be on the wall before
anyone looks at the wall.

Locally `compose.yaml` sets `STATUS_FILE=/app/dev/status.json` so `/api/v1/infra` takes the same
code path as the cluster against a fixture. The fixture carries `apps`, `capacity` and `certs`,
which the real publisher does **not** emit yet — every consumer treats them as optional, so
production degrades to empty panels rather than breaking.

---

## Adding things

### A new interactive object

Wrap it in `Interactive`. `label` is the name shown when looked at, `detail` is the second line,
`verb` follows `E`.

```tsx
<Interactive label="the thing" verb="read" detail="what it is" onActivate={() => onOpenCard(card)}>
  {(hovered) => <mesh>…</mesh>}
</Interactive>
```

Cards are built by the helpers at the bottom of `FunRoom.tsx` (`hardwareCard`, `bookCard`,
`certCard`) and rendered by one `InfoPanel`. Add a builder rather than a second panel.

Touch needs nothing extra: a tap resolves through the same registry and the same `REACH`, so
anything reachable with `E` is reachable with a finger. `verb` has to read correctly after both
"E" and "tap to", which is why they are all bare infinitives — "read", "open", "take one".

`InfoCard.tags` renders 10px chips sized for stack labels. Sentences in them read as a layout
accident; the services leaflets drop their bullets and link out to the section instead.

### A new device in the sideboard

Add the model to `Devices.tsx`, add its entry to `DEVICES` in `content/hardware.ts` **copied from
the README hardware tables**, and wrap the placement in `<Inspectable hw={DEVICE.x}>`. The README
is the source of truth — the room must never claim hardware the README does not.

That file is shared with `/infrastructure`, which renders every entry as a chip and stakes its
premise on the claims being checkable. A device with no README row therefore does **not** go in
it: declare it local to `Devices.tsx` with `unlisted: true`, the way `FLEX_MINI` is, and the card
says so instead of inventing numbers.

### A new terminal command

One `switch` case in `useCommands` in `Terminal.tsx`. `curl` only accepts same-origin `/api/`
paths — keep it that way.

Commands that report cluster state read the `data: PanelProps` the shell is handed, never their
own fetch: two pollers on their own schedules will eventually disagree, and a shell contradicting
the television one desk away is worse than no shell. `kubectl get applications|nodes|certs` is the
worked example. Each of its branches also prints how much to trust what it just printed — stale
feed, or build-time snapshot — because a bare table is exactly the kind of green light on old
data the room's rules forbid. Keep output inside 60 characters; the portrait monitor wraps past
that.

### A new blog post

Nothing to do here at all. Publish it and the whiteboard picks it up from the RSS feed on the
next load, cover image included — Hugo emits the cover as `<media:content>`, which
`/api/v1/blog` reads. The board shows the newest six.

### A new case study, certification or social link

Nothing to do here. Add it to `src/content/work/*.mdx`, `resume.ts` or `site.ts` and it appears:
the shelf lays out from array length and grows its own height, and the social wall sizes from
`site.socials`. The lamp standing on the shelf follows, because it is placed from
`shelfHeight(shelf)` rather than a measured constant — do not replace that with a number. For a new social you also need a mark in `public/icons/social/` and an entry in
`SOCIAL_ICON` in `Objects.tsx`.

---

## Rules learned the hard way

**Furniture is placed in plan space, and its collision box is placed twice.** Every piece in
`Room.tsx` is positioned with `at(x, y, z)` in plan metres, and every solid one needs a matching
entry in `BLOCKERS` in `FirstPerson.tsx`. The walls are derived from `wallBoxes()` so they cannot
drift, but the furniture is not — check a new piece both ways. Rotating a piece swaps its half
extents, which is how a 2m bed ended up through the bedroom wall.

**Anything meant to be looked at must present a face to the room.** A horizontal surface is only
targetable from directly above, which no standing visitor is. Certificates modelled as a flat
stack of sheets had four of six unreachable. Books work at ankle height because they stand
upright.

**Check occlusion, not just existence.** Three separate objects have been permanently hidden
behind something else: the Hue Bridge behind a switch, the certificates under each other, the
access point behind the television. A labelled object you cannot put a crosshair on does not
exist.

**Icons must be vector, not geometry.** Logos built from primitives are unreadable at any
sensible distance. Use real SVG through drei `Html` — the same trick the monitors use for text.

**Detail must be real geometry.** A recess laid on a solid box reads as a solid box. The door
leaf is a frame of stiles and rails; the sideboard carcass is five panels with an open front. A
5mm decorative step disappears under any light.

**Depth offsets in a rotated group flip sign.** A group rotated 180° onto the far wall has its
local `-z` pointing *into* the wall. Write offsets as "away from the wall", not a raw axis.

**An `Html` layer laid flush with its own backing box tears.** The skills faceplate is a
`RoundedBox` 0.024 deep, so its front face is at local z 0.012 — and putting the `Html` there too
produced a diagonal rip across the panel that looks like a shader bug and is plain z-fighting.
Everything drawn on a plate has to clear the plate. The career frame gets this right by accident
of being 0.022 deep with its `Html` at 0.013.

**A module-scope preload defeats any gate you put in front of it.** `preloadSurfaces()` and
`preloadProps()` run when the dynamic import resolves, which is before the first render — so the
touch entry gate asking "may I use 6.5MB of your data?" was firing long after the fetches had
started, and the honest-looking question was theatre. Preloads are now skipped for coarse
pointers and kicked from the gate's own button instead.

**A lost WebGL context must unmount the Canvas, never re-render it.** `postprocessing`'s
`EffectComposer` throws `Cannot read properties of null` out of `addPass` the moment it renders
against a dead context, and that throw lands in Next's error boundary — which owns the whole
page, so you get the dev overlay or `app/error.tsx` instead of anything you wrote. The first
`ContextGuard` showed the notice as an overlay *over* the room, which meant setting the state was
itself enough to re-render `Post` and take down the page the notice existed to rescue. It is an
early `return` now. The consequence to know: there is no canvas left to receive
`webglcontextrestored`, so recovery is a reload and the copy must not promise otherwise.

**Anything that needs the pick registry must sit inside `InteractionProvider`, not merely inside
the `Canvas`.** `TouchLook` was first mounted next to `FirstPerson`, one line below the closing
`</InteractionProvider>`. It rendered, its listeners attached, drag-to-look worked perfectly —
and every tap silently did nothing, because `useActivateAt()` read a null context. A context this
component needs but does not visibly use is easy to place wrong and gives no error when you do.

**Ambient light is the enemy of shape.** Light from everywhere at once flattens the gradient
that tells you what shape a thing is. Keep `ambientLight`/`hemisphereLight` low; put brightness
in fittings that have a direction and fall off.

**A warm room needs a cool fill.** The obvious way to make the room feel warm — tint every
source amber, ambient included — produces a uniform sepia in which the sage walls disappear and
nothing reads as *lit*, because there is nothing left for the lamplight to be warmer than. The
fill is cool (`#9fb2b8`) and only the fittings are warm. Warmth is a relationship, not a value.

**Emissive surfaces in front of their own lamp clip to white.** The lantern's panels sit
directly in front of its point light, so a light base colour gets lit *and* emits; the two sum
past what ACES can hold and a paper shade renders as a flat white slab. Emit from a near-black
base (`#2a1405`) and the panel keeps its colour at any brightness.

**A fitting must not shadow the room from a light it encloses.** The lantern's top rails cast a
hard-edged box onto the ceiling directly above it, which reads as a rendering artifact rather
than a shadow. Frame members that surround a light source should not cast; the ones that are
side-on to it, like the corner posts striping the floor pool, should.

**An unlit mesh behind a DOM layer is a black rectangle.** The whiteboard's surface was modelled
as a white plane with the posts on a transparent `Html` over it. It hangs on the one wall neither
lamp reaches, so the plane rendered near-black and the whole thing looked like a switched-off
television. Where a DOM layer is the face of an object, paint the face in the DOM — it is not
subject to scene lighting, which is the point. Tint it warm, though: pure white is the only cold
bright thing in a room lit at nine in the evening and it reads as a hole in the wall.

**No gate, and no fly-in.** `/fun` opens on a black screen with a bar and drops you into the
room standing. It used to show a "press to enter" card over an already-loaded room, then fly the
camera in over 3.4 seconds — a cutscene you cannot steer, which reads as a screensaver rather
than a place. The bar tracks real assets via `useProgress`, gated on the Suspense boundary
resolving (`SceneReady`), not on the percentage: progress hits 100 while the last texture is
still uploading.

**Pointer lock still costs one click and there is no way around it.** It needs a user gesture,
and the nav click that got the visitor here does not survive the navigation. WASD works
immediately; mouse-look needs one click anywhere. That is why the overlay is a line of text in
the corner rather than the modal that used to sit there — and why the loading screen is
`pointer-events-none` throughout, so the first click lands on the canvas instead of being eaten.

**Two things must not drive the camera at once.** `TerminalFocus` eases the view in when you sit
down at the shell and back out when you leave. `paused` covers the way in, but by the time it
eases *back* `terminalActive` is already false, so `FirstPerson` would grab the camera mid-move
and snap it to eye height. Hence the `settling` flag: the focus owns a window nothing else may
touch. The return pose is **captured, not recomputed** — sending the visitor to a "sensible" spot
would quietly relocate them.

**Screens are furniture, not slots.** The room ran six of them — three on the desk, two on the
side wall — because each new panel got its own screen. That is a trading floor. It is now two
monitors on the desk, one landscape and one stood on its end for the shell, plus the television
carrying the whole observability wall in a grid. Panels are cheap; screens are not, and a screen
nobody stands in front of is a live DOM layer being composited for no one.

**A monitor pair is one object.** Positioned separately they ended up 38cm apart, which reads as
two screens sharing a desk rather than a setup. They are placed from one origin now, bezels
almost touching, centred on the chair — and the arithmetic has to use `width·cos(toe-in)`,
because a toed-in screen occupies less of the desk than its width suggests.

**Anything positioned against furniture must read the furniture's numbers.** The monitor stands,
the chair's collision box and the shelf lamp are all placed from exported constants rather than
copied coordinates. The chair moved in against the desk and its blocker did not follow, which
left a chair you walked through beside floor you could not cross.

**Text on a screen has a width budget, and it is measurable.** The shell's help output is two
columns held apart with `padEnd`, so it reads as aligned output only while every line fits on
one row — wrapped, it just looks broken. `PORTRAIT_PX_W` is derived: 7.8px per character at 13px
JetBrains Mono, 57 characters in the longest line, 40px of padding. Measure it in the browser
rather than guessing; the first guess was 36px short.

**Three pools beat one.** One bright source leaves the rest of the room a cave and invites the
ambient-raising fix that ruins it. The room runs three small warm fittings — lantern, desk
mushroom, shelf lamp — placed so that every wall has one within reach of it. The shelf lamp
exists because the case studies, the most worth-reading thing in the room, were in shadow.

**Shadows are what cost frames, not picking.** The main light is a *point* light, so its shadow
map is a cube and every caster renders six extra times. Sixty small meshes in a shelf halved the
frame rate. Set `castShadow={false}` on anything small inside furniture. The interaction raycast
measured free at ~30 targets — do not "optimise" it without measuring first.

**...but by 2026 the shadows were not the problem, and the profile says so.** A later pass
measured the frame at 8 Mpx, and the intuitions above no longer held. Attribution of a 13.6ms
frame:

| suspect | cost |
|---|---|
| **N8AO** | **5.2ms** |
| `multisampling={4}` | 1.8ms |
| shadow map pass | 1.5ms |
| **100 shadow casters** | **0ms** |
| **10 live DOM layers** | **0ms** |
| fill | ~0.74ms per Mpx |

The caster count and the DOM layers — the two things this file spent years warning about — were
free. AO was 38% of the frame on its own, and `quality="performance"` only recovered 0.5ms of it,
so the cost is structural (its own depth pass over 336 meshes), not sample count. Fixes applied
were the dpr cap (1.8 → 1.5) and multisampling (4 → 2): 74 → 91fps at a Retina 2056x1202 window,
with AO kept because it is still what makes objects look like they rest on things.

**The lesson is the method, not the numbers.** Every guess in that table was wrong. Bisect with
the component actually removed and *verify it is gone* — an early A/B here "proved" the blog
board was innocent using a build where the board was still mounted, which happened to be the
right answer for the wrong reason. And check the window size before blaming the code: the drop
that started this investigation was 1.6 Mpx versus 8.0.

**Preloads are invisible when broken.** `preloadSurfaces` was exported and never called for
weeks; everything still loaded, just later and one at a time. Both preloads are now invoked at
module scope in `FunRoom.tsx`.

**Suspense boundaries.** Anything that suspends (`Environment`, `useTexture`, `useGLTF`) must sit
inside the *same* `<Suspense>` as `EffectComposer`, or React tears the Canvas subtree down
mid-flight and the composer builds against a dead GL context — `Cannot read properties of null
(reading 'alpha')`.

**Interaction registry internals.** `RegistryCtx` must not carry hover state (identity churn
re-runs every registration effect, whose cleanup clears the hover, so the prompt never settles),
and targets register a **ref**, not a value, so inline `onActivate` closures do not re-register
every render. Both are commented in `interaction.tsx`; do not "simplify" them.

---

## Verifying without a pointer lock

Pointer lock does not work in headless Chromium, and `FirstPerson` overwrites the camera every
frame. To test reachability, make two temporary edits, run the sweep, then revert both:

```tsx
// 1. expose the camera
function TempCam() {
  const { camera } = useThree();
  useEffect(() => { (window as any).__cam = camera; }, [camera]);
  return null;
}
// 2. park movement
<FirstPerson enabled={false} />
```

Then step a scripted camera across the room and read the prompt out of the DOM:

```js
const read = () => {
  const h = document.querySelector('[class*="top-[calc(50%+30px)]"]');
  return h ? h.textContent.replace(/\s+/g, ' ').trim() : null;
};
```

Sweep from a **standing eye height of 1.6m with varying pitch**, not from the object's own
height — that is the difference between "reachable in principle" and "reachable by a visitor",
and it is what exposed the certificates.

Two gotchas. Step with nested `requestAnimationFrame` rather than `setTimeout`, or the sweep
takes minutes and gets killed. And scope the DOM query to the prompt element: the site's command
palette indexes page content, so certificate titles and nav labels are in the DOM whether or not
the room is showing them — an early check "confirmed" a prompt that was actually the nav's Fun
link.

Always confirm the hooks are gone before committing: `grep -n "__cam\|TempCam" src/components/fun/`.

---

## Before committing

- `make typecheck` clean.
- `make lint` — 0 errors. There is a standing baseline of ~17 warnings, all pre-existing
  (`FirstPerson`, `ArchitectureDiagram`, `CommandPalette`, `InlineGlobe`); if the count rises,
  the new one is yours.
- Routes 200: `/`, `/fun`, `/infrastructure`, `/work/<slug>`.
- Frame rate: **always state the pixel count, not the window size.** 120fps / 8.3ms in headless
  Chromium at 1600x1000 is 1.6 Mpx, because Playwright runs at dpr 1. A real Retina Mac at a
  2056x1202 window renders 5.6 Mpx with the dpr cap at 1.5 — 3.5x the work. Comparing a headless
  number against a desktop one is meaningless. Read the true figure off
  `gl.domElement.width * height`.
- No `__cam` / `TempCam` / `TEMP` left in `src/components/fun/`.
- Commit messages: describe the change, no AI attribution, no `Claude-Session` trailer,
  no `Co-Authored-By`.

---

## Known gaps

1. **Assets need a CDN.** 6.5MB and growing, served from the cluster with no CDN in front
   (Cloudflare is DNS-only), so every megabyte is home-uplink bandwidth per cold visitor. This is
   closer to blocking than it was. Touch visitors now at least get asked first, and machines
   without WebGL no longer download any of it, but neither is a fix.
2. **The publisher does not emit `apps`, `capacity`, `certs`** — those panels are fixture-only
   and empty in production. There are two consumers now, not one: the desk monitor's ArgoCD view
   and `kubectl get applications` in the shell. Both degrade honestly, and both look far better
   locally against the fixture than they do in production, which is the trap.
3. **Touch has only been driven through synthetic events**, never a real phone. Drag, tap, the
   stick, and the entry gate were all verified by dispatching `TouchEvent`s in headless
   Chromium, which proves the wiring and nothing about how any of it feels in a hand.
4. **Reduced motion** has a skip-entry path that has never been verified.

Two entries that used to live here were found stale rather than fixed — the ArgoCD desk view and
the loading screen both already worked. Check a gap still reproduces before planning work off it.
