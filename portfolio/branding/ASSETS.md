# Assets for the room

What to fetch, from where, at what cost, and what not to bother with. Companion
to `ART-DIRECTION.md`, which says what the room is; this says what it is made of.

Status: researched, nothing fetched yet.

---

## 1. The pipeline already exists

This is the most useful thing on the page. `/fun` already loads CC0 PBR surfaces
and glTF models through a working helper, so none of this needs building:

`src/components/fun/textures.ts` holds `useSurface(name, repeat)`, which loads a
three-map set and returns cloned, tiled textures. `src/components/fun/props.tsx`
holds `useGLTF`-based prop loading with per-instance cloning. Assets live at
`public/textures/fun/<name>_{diff,nor,arm}.webp` and
`public/models/fun/<name>/<name>.gltf`.

The ARM convention is already handled: ambient occlusion, roughness and metalness
packed into R/G/B of one file, with three.js reading roughness from green and
metalness from blue, so a single file serves both slots. AO is deliberately
skipped because three.js samples `aoMap` from a second UV set that plane geometry
does not carry.

Adding a surface is: fetch, convert, drop in the folder, add the name to the
`SurfaceName` union. That is the whole job.

## 2. Licence

Everything below is from Poly Haven and is CC0, verified at polyhaven.com/license
rather than assumed. Public domain in effect: commercial use permitted,
redistribution permitted, attribution not required though appreciated. Nothing
here needs a licence row in `brand.ts`, unlike the fonts.

## 3. The diagnosis, before the shopping list

`/fun` already uses this pipeline and already looks, in your words, lackluster
and too modern. That is not because assets do not help. It is because the
specific assets currently loaded describe a different room:

| Currently loaded | What it says |
|---|---|
| `laminate_floor_02` | rented flat, 2010s |
| `plastered_wall_04` | painted plasterboard |
| `dirty_carpet` | office |
| `env_studio_1k.hdr` | photography studio |
| `modern_ceiling_lamp_01` | modern |

Four of the five say "modern interior" on their own, and together they say it
loudly. The room is doing exactly what it was told to do. Swapping the names
below changes the register without touching a line of loading code, which makes
this the cheapest large improvement available anywhere in the project.

## 4. Surfaces to fetch

Slugs are real and verified against the Poly Haven API.

| Role | Slug | Why this one |
|---|---|---|
| Floor | `wooden_floor_02` | Dark, planed, wide board. The English-discipline half. |
| Floor, alternative | `herringbone_parquet` | Parquet is the strongest single signal of a good house. Costs more tiling care. |
| Desk and shelving | `black_oak_veneer` | Dark oak, finished, cabinetmaker rather than carpenter. |
| Desk, warmer option | `mocha_oak_veneer` | If black oak reads too cold beside the lamp. |
| Wall panelling | `wooden_panels` | The wainscot. This is the asset that kills the painted-box look. |
| Wall above the rail | `plastered_wall_04` | Keep. It is correct above a panelled dado and it is tiny. |
| Rug | replace `dirty_carpet` | It is 932 KB and it says office. A plain wool would be a fraction of that. |

Avoid from the same category: anything named `weathered`, `rough`, `raw`,
`old_planks`, `distressed`. Those are the cabin, and the direction bans it.

## 5. Light

| Role | Slug | Note |
|---|---|---|
| Interior IBL | `reading_room` | On the nose. Replaces `env_studio_1k`. |
| Interior, alternates | `lythwood_room`, `old_room`, `solitude_interior` | If `reading_room` reads too warm. |
| The view out of the window | `misty_pines` | Norwegian without being a postcard. |
| Window alternates | `snowy_forest_path_01`, `niederwihl_forest`, `birchwood` | Colder, or more birch. |

The window wants a backplate, not an environment map. A flat equirectangular
image behind the glass is cheaper and looks better at a fixed camera angle than
lighting the room from a forest.

## 6. Models

| Slug | Use |
|---|---|
| `book_encyclopedia_set_01` | The shelf. Real books instead of coloured boxes. |
| `decorative_book_set_01` | Second run, so the shelf is not one repeated set. |
| `desk_lamp_arm_01` | The lamp, if the key stays on the desk rather than a standard. |
| `mantel_clock_01` | One good object on the shelf. Reads as inherited. |
| `brass_vase_01` … `_04` | Brass is a house material. Cheap way to repeat it. |
| `vintage_wooden_drawer_01` | The sideboard. |
| `potted_plant_01` | The forest, brought one step inside. |

## 7. The gap you should know about

There is no writing desk in the catalogue. `metal_office_desk` is the wrong
register entirely, and the tables are dining tables. The desk is the most
important object in the room and it will have to be built from primitives.

That is fine, and arguably better. At the camera distances the route uses, the
tell is never the silhouette, it is the material and the light. A box desk
carrying `black_oak_veneer` with a correct normal map and a real contact shadow
will out-perform a downloaded model with flat lighting every time.

The globe has the same answer, and already does: the hero globe is built from a
sphere, a torus and two cylinders.

## 8. What this actually costs

Measured from the files already in the repository, which is the only honest
source. Raw 1K PNG from Poly Haven runs 30 to 36 MB per surface across diffuse,
normal and ARM. Converted to 1K WebP, the same three maps are:

| Existing file | Size |
|---|---|
| `oak_veneer_01` (3 maps) | 322 KB |
| `laminate_floor_02` (3 maps) | 255 KB |
| `plastered_wall_04` (3 maps) | 44 KB |
| `dirty_carpet` (3 maps) | 932 KB |

So roughly 250 to 350 KB per surface, and a 30 to 40 times reduction. High
frequency detail costs more, which is why the carpet is an outlier and the
plaster is almost free.

A full re-skin at those rates:

| Item | Estimate |
|---|---|
| 5 surfaces | 1.5 MB |
| Interior HDRI, downsampled | 250 to 400 KB |
| Window backplate, WebP | 200 to 300 KB |
| 3 to 4 models with textures | 1.2 to 2.4 MB |
| Total | 3.2 to 4.6 MB |

`/fun` currently ships 3.3 MB of models and 3.2 MB of textures, about 6.5 MB. So
a well chosen re-skin is a swap that comes out smaller than what is already
there, not an addition. That is the number to hold on to.

## 9. Two existing wins worth taking regardless

`env_studio_1k.hdr` is 1.65 MB and is shipped as a raw `.hdr`, which is half of
the fun room's entire texture budget. Image based lighting for a soft interior
does not need 1K; 256 to 512 pixels is enough for the diffuse and specular
convolution, and nobody has ever seen the difference in a lit room. Downsampling
it is the single largest byte saving available in the project right now.

`dirty_carpet` at 932 KB is the second largest and is also the asset least suited
to the theme.

## 10. Rules for anything fetched

Convert to WebP at 1K before it enters `public/`. The raw PNG is never committed.

Take diffuse, normal (GL, not DX, since three.js expects OpenGL convention) and
ARM. Skip AO as a separate file; it is in the ARM red channel and unusable on
plane geometry anyway.

Nothing loads before interaction. The room is already gated behind a real user
gesture and every asset here inherits that gate.

Any asset that makes the room read as rustic goes back, however good it looks on
its own. The failure mode named in `ART-DIRECTION.md` is drift toward the cabin,
and it will arrive one defensible texture at a time.
