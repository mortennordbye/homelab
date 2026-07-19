# The fun room — plan

An explorable 3D room at `/fun`, reached from a nav entry beside the others. The room is the
portfolio: the objects in it are the site's sections, and you interact with them instead of
clicking links.

- Status: **room built and walkable. Printer and sideboard interactive; other objects not started.**
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
wall, a task chair, a mushroom lamp, keyboard, mouse, mug, framed prints, a jute rug, a window,
a plant, a printer on a low cabinet, and the homelab sideboard.

The sideboard is modelled from reference photos of the real flat. It looks like living-room
furniture; opening its doors reveals the actual kit at real dimensions: three ThinkCentres stood
on edge, the ISP router, a UniFi Cloud Gateway Ultra, a fanless mini PC, a Flex Mini, an 8-port
switch, a 4-bay Synology, and a hub puck, all with live-blinking LEDs. The access point lies
flat on top, where it actually sits.

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

Two traps worth remembering. Anything that suspends (`Environment`, `useTexture`) must sit
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
`plastered_wall_04`) and `wood_table_001` (superseded by `oak_veneer_01`). `ceiling_interior`
was still in `preloadSurfaces`, so it was costing every visitor a 650KB download for maps
nothing sampled. Worth checking the preload list against actual `useSurface` calls whenever a
surface is swapped.

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

| Object | Section | Source |
|---|---|---|
| Printer ✅ | CV download | `cv-variants.ts`, `cv-manifest.json` |
| Sideboard ✅ | the hardware itself | reference photos |
| Desk monitors | infrastructure | `/api/v1/infra`, already wired |
| Shelf of files or binders | work | `src/content/work/*.mdx` |
| Framed certificates | resume | `resume.ts` certifications |
| Pinboard or whiteboard | about | `site.ts`, `interests.ts` |
| Printed articles or a second screen | blog | `/api/v1/blog` |
| Desk phone or notepad | contact | `site.ts` |

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
7. CDN or object store for assets, per section 6.
8. One room or several. Recommendation is firmly one: a well-dressed single room beats five
   sparse ones and is a fraction of the work.

---

## 9. Housekeeping

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
