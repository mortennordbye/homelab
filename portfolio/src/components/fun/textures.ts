"use client";

import { useTexture } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

/**
 * CC0 PBR surfaces from Poly Haven, downscaled to 1K WebP. The ARM map packs
 * AO/roughness/metalness into R/G/B; three.js reads roughness from green and
 * metalness from blue, so one file serves both slots. AO is skipped: aoMap
 * needs a second UV set, which plane geometry does not carry.
 */

export type SurfaceName =
  | "dirty_carpet"
  | "laminate_floor_02"
  | "plastered_wall_04"
  | "oak_veneer_01";

const base = (n: SurfaceName) => `/textures/fun/${n}`;

export type Surface = {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
  metalnessMap: THREE.Texture;
};

/**
 * Loads a surface and returns maps tiled for a specific piece of geometry.
 * Textures are cloned per call because `repeat` lives on the texture, so two
 * surfaces sharing one loaded image would otherwise fight over the tiling.
 */
export function useSurface(
  name: SurfaceName,
  repeat: [number, number],
): Surface {
  const [diff, nor, arm] = useTexture([
    `${base(name)}_diff.webp`,
    `${base(name)}_nor.webp`,
    `${base(name)}_arm.webp`,
  ]);

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
    const armTex = prep(arm, false);
    return {
      map: prep(diff, true),
      normalMap: prep(nor, false),
      roughnessMap: armTex,
      metalnessMap: armTex,
    };
    // repeat is a fresh array literal at every call site, so compare by value
    // rather than identity or this memo never holds.
  }, [diff, nor, arm, repeat[0], repeat[1]]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Preload so the room does not pop in surface-by-surface. */
export function preloadSurfaces() {
  (
    [
      "dirty_carpet",
      "laminate_floor_02",
      "plastered_wall_04",
      "oak_veneer_01",
    ] as SurfaceName[]
  ).forEach((n) => {
    useTexture.preload([
      `${base(n)}_diff.webp`,
      `${base(n)}_nor.webp`,
      `${base(n)}_arm.webp`,
    ]);
  });
}
