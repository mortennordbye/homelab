"use client";

import type { ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const EPS = 0.00001;
const CREASE = 0.4;
const BEVEL_SEGMENTS = 4;

/** One geometry per distinct box, shared by every mesh that asks for it. The
 *  crease pass is the expensive part of a rounded box, and drei's version runs
 *  it again for every instance on mount. Shared, so never mutate or dispose. */
const cache = new Map<string, THREE.BufferGeometry>();

function roundedBox(w: number, h: number, d: number, radius: number, smoothness: number) {
  const key = `${w},${h},${d},${radius},${smoothness}`;
  let geometry = cache.get(key);
  if (!geometry) {
    const r = radius - EPS;
    const shape = new THREE.Shape();
    shape.absarc(EPS, EPS, EPS, -Math.PI / 2, -Math.PI, true);
    shape.absarc(EPS, h - r * 2, EPS, Math.PI, Math.PI / 2, true);
    shape.absarc(w - r * 2, h - r * 2, EPS, Math.PI / 2, 0, true);
    shape.absarc(w - r * 2, EPS, EPS, 0, -Math.PI / 2, true);
    const extruded = new THREE.ExtrudeGeometry(shape, {
      depth: d - radius * 2,
      bevelEnabled: true,
      bevelSegments: BEVEL_SEGMENTS * 2,
      steps: 1,
      bevelSize: radius - EPS,
      bevelThickness: radius,
      curveSegments: smoothness,
    });
    extruded.center();
    geometry = toCreasedNormals(extruded, CREASE);
    cache.set(key, geometry);
  }
  return geometry;
}

/**
 * drei's `RoundedBox`, same shape and normals, with the geometry built once
 * per size instead of once per mesh.
 */
export function RoundedBox({
  args: [width = 1, height = 1, depth = 1] = [],
  radius = 0.05,
  smoothness = 4,
  children,
  ...rest
}: Omit<ThreeElements["mesh"], "args"> & {
  args?: [number?, number?, number?];
  radius?: number;
  smoothness?: number;
}) {
  return (
    <mesh geometry={roundedBox(width, height, depth, radius, smoothness)} {...rest}>
      {children}
    </mesh>
  );
}
