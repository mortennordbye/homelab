# Working on the fun room

Everything needed to pick this up cold. `docs/fun-room-plan.md` is the history and the
reasoning; this file is the practical guide. Read this one first.

---

## What it is

`/fun` is a first-person 3D room that *is* the portfolio: every section of the site appears as
an object you can walk up to, look at and press `E` on. It lives in `portfolio/`, is
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
| `components/fun/FunRoom.tsx` | Scene composition, lighting, post-processing, HUD, all card state. The root. |
| `components/fun/Room.tsx` | Room shell and furniture: walls, floor, desk, door, sideboard placement, object placement. |
| `components/fun/Devices.tsx` | Homelab hardware models + the sideboard. |
| `components/fun/hardware.ts` | Hardware names and specs, transcribed from the repo README. |
| `components/fun/Bookshelf.tsx` | Case studies as books, certificates as framed prints. Self-sizing. |
| `components/fun/Objects.tsx` | Social wall, notepad, blog stack, gym bag, career frame. |
| `components/fun/Terminal.tsx` | The shell on the middle monitor. |
| `components/fun/Screen.tsx` | Monitor mesh + DOM panel mount. |
| `components/fun/Panels.tsx` | Content of the live infra panels. |
| `components/fun/feed.ts` | `/api/v1/infra` polling and staleness rules. |
| `components/fun/interaction.tsx` | Look-at-and-press: raycast registry, `Interactive` wrapper. |
| `components/fun/Hud.tsx` | Crosshair, look-at prompt, keybinds, `InfoPanel` card. |
| `components/fun/FirstPerson.tsx` | WASD, collision, head bob. |
| `components/fun/props.tsx` | Scanned glTF prop loader (`Prop`). |
| `components/fun/textures.ts` | PBR surface loader (`useSurface`). |
| `components/fun/shelf.ts` | Shared data types for shelf and career. |

Assets: `public/textures/fun/` (3.1MB), `public/models/fun/` (3.4MB), `public/icons/social/`.

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

Live data is different: `feed.ts` polls `/api/v1/infra` every 60s, and the blog fetches
`/api/v1/blog` only when the printed posts are opened.

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

### A new device in the sideboard

Add the model to `Devices.tsx`, add its entry to `HARDWARE` in `hardware.ts` **copied from the
README hardware tables**, and wrap the placement in `<Inspectable hw={HARDWARE.x}>`. The README
is the source of truth — the room must never claim hardware the README does not. If a device has
no README row, leave `specs: []` and set `unlisted: true`; the card then says so instead of
inventing numbers.

### A new terminal command

One `switch` case in `useCommands` in `Terminal.tsx`. `curl` only accepts same-origin `/api/`
paths — keep it that way.

### A new case study, certification or social link

Nothing to do here. Add it to `src/content/work/*.mdx`, `resume.ts` or `site.ts` and it appears:
the shelf lays out from array length and grows its own height, and the social wall sizes from
`site.socials`. For a new social you also need a mark in `public/icons/social/` and an entry in
`SOCIAL_ICON` in `Objects.tsx`.

---

## Rules learned the hard way

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

**Ambient light is the enemy of shape.** Light from everywhere at once flattens the gradient
that tells you what shape a thing is. Keep `ambientLight`/`hemisphereLight` low; put brightness
in fittings that have a direction and fall off.

**Shadows are what cost frames, not picking.** The main light is a *point* light, so its shadow
map is a cube and every caster renders six extra times. Sixty small meshes in a shelf halved the
frame rate. Set `castShadow={false}` on anything small inside furniture. The interaction raycast
measured free at ~30 targets — do not "optimise" it without measuring first.

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
- Frame rate: 120fps median / ~8.3ms in headless Chromium at 1600x1000. A drop to 61 means
  something started casting shadows.
- No `__cam` / `TempCam` / `TEMP` left in `src/components/fun/`.
- Commit messages: describe the change, no AI attribution, no `Claude-Session` trailer,
  no `Co-Authored-By`.

---

## Known gaps

1. **Mobile is broken.** Pointer lock does not exist there. Untouched so far — decide between
   drag-to-look, a guided mode, or redirecting to the classic site.
2. **No WebGL failure or context-loss handling.** A machine that cannot run this gets a blank
   canvas.
3. **Reduced motion** has a skip-entry path that has never been verified.
4. **No loading screen** beyond a bare "warming up" fallback.
5. **Assets need a CDN.** 6.5MB and growing, served from the cluster with no CDN in front
   (Cloudflare is DNS-only), so every megabyte is home-uplink bandwidth per cold visitor. This is
   closer to blocking than it was.
6. **The publisher does not emit `apps`, `capacity`, `certs`** — those panels are fixture-only
   and empty in production.
7. Sections still without an object: skills, services.
