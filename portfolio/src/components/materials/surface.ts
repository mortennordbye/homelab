"use client";

import { useTexture } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

/**
 * CC0 PBR surfaces from Poly Haven, downscaled to 1K WebP, shared by the
 * portfolio shelf, the infrastructure bench and the room at /fun.
 *
 * The ARM map packs AO/roughness/metalness into R/G/B; three.js reads
 * roughness from green and metalness from blue, so one file serves both slots.
 * AO is skipped: aoMap needs a second UV set, which plane geometry does not
 * carry.
 */

export type SurfaceSlug =
  | "black_oak_veneer"
  | "wooden_panels"
  | "book_pattern"
  | "plastered_wall_04";

/** Where each surface lives and whether it ships an ARM map. `book_pattern`
 *  has none. The `shelf` directory predates the room reading from it, so the
 *  name is narrower than its contents; renaming it would 404 cached paths. */
const SOURCES: Record<SurfaceSlug, { dir: "shelf" | "fun"; arm: boolean }> = {
  black_oak_veneer: { dir: "shelf", arm: true },
  wooden_panels: { dir: "shelf", arm: true },
  book_pattern: { dir: "shelf", arm: false },
  plastered_wall_04: { dir: "fun", arm: true },
};

const files = (slug: SurfaceSlug) => {
  const { dir, arm } = SOURCES[slug];
  const base = `/textures/${dir}/${slug}`;
  const list = [`${base}_diff.webp`, `${base}_nor.webp`];
  if (arm) list.push(`${base}_arm.webp`);
  return list;
};

export type Surface = {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  roughnessMap?: THREE.Texture;
  metalnessMap?: THREE.Texture;
};

/**
 * Loads a surface and returns maps tiled for one piece of geometry. Textures
 * are cloned per call because `repeat` lives on the texture, so two surfaces
 * sharing a loaded image would otherwise fight over the tiling.
 *
 * `metalnessFromArm` is off by default: on wood the ARM blue channel turns
 * veneer into foil. Only pass it where the foil is wanted.
 */
export function useSurface(
  slug: SurfaceSlug,
  repeat: [number, number],
  opts: { metalnessFromArm?: boolean } = {},
): Surface {
  const { metalnessFromArm = false } = opts;
  const loaded = useTexture(files(slug)) as THREE.Texture[];

  return useMemo(() => {
    const prep = (src: THREE.Texture, colour: boolean) => {
      const t = src.clone();
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeat[0], repeat[1]);
      t.colorSpace = colour ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.anisotropy = 8;
      t.needsUpdate = true;
      return t;
    };
    const arm = loaded[2] ? prep(loaded[2], false) : undefined;
    return {
      map: prep(loaded[0], true),
      normalMap: prep(loaded[1], false),
      roughnessMap: arm,
      metalnessMap: metalnessFromArm ? arm : undefined,
    };
    // repeat is a fresh array literal at every call site, so compare by value
    // rather than identity or this memo never holds.
  }, [loaded, repeat[0], repeat[1], metalnessFromArm]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** The loaded bitmaps, for callers that tile them by hand. Shares useTexture's
 *  cache with useSurface, so naming the same slug twice costs no extra fetch.
 *  Kept off `Surface` because that is spread straight onto a material. */
export function useSurfaceImages(slug: SurfaceSlug): THREE.Texture[] {
  return useTexture(files(slug)) as THREE.Texture[];
}

/** Preload so a scene does not pop in surface by surface. */
export function preloadSurfaces(slugs: SurfaceSlug[]) {
  slugs.forEach((slug) => useTexture.preload(files(slug)));
}
