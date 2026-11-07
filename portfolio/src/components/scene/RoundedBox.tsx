"use client";

import type { ThreeElements } from "@react-three/fiber";
import * as THREE from "three";

/** One geometry per distinct box, shared by every mesh that asks for it.
 *  Shared, so never mutate or dispose. */
const cache = new Map<string, THREE.BufferGeometry>();

/* The wood tops' soft highlight depends on this: a flat face's edge vertices
   lean toward the bevel, as they did on the extruded box this replaced. */
const CREASE = 0.4;

/* Each face as [normal axis, sign, u axis, v axis], with u x v = normal so the
   grid winds counter-clockwise seen from outside. */
const FACES: [number, number, number, number][] = [
  [0, 1, 1, 2],
  [0, -1, 2, 1],
  [1, 1, 2, 0],
  [1, -1, 0, 2],
  [2, 1, 0, 1],
  [2, -1, 1, 0],
];

/** Grid lines along one axis: the flat span, then `segments` steps over each
 *  45 degrees of bevel. tan spacing gives every step the same angle. */
function axisLines(half: number, inner: number, r: number, segments: number) {
  const outer: number[] = [];
  for (let s = segments; s >= 0; s--) outer.push(inner + r * Math.tan((Math.PI / 4) * (s / segments)));
  outer[0] = half;
  const lines = [...outer.map((x) => -x), ...outer.slice().reverse()];
  if (inner === 0) lines.splice(segments, 1);
  return lines;
}

/** Each vertex takes the mean unit normal of the triangles at its lattice
 *  point that lie within CREASE of its own normal. Vertices on a seam share a
 *  lattice point, so both sides of the seam get the same normal. */
function creaseNormals(positions: Float32Array, normals: Float32Array, indices: Uint32Array, lattice: Int32Array, points: number) {
  const faceNormals = new Float32Array(indices.length);
  const sums = new Float32Array(points * 3);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const limit = Math.cos(CREASE);
  for (let t = 0; t < indices.length; t += 3) {
    a.fromArray(positions, indices[t] * 3);
    b.fromArray(positions, indices[t + 1] * 3);
    c.fromArray(positions, indices[t + 2] * 3);
    c.sub(b).cross(a.sub(b));
    const len = c.length();
    if (len > 0) c.divideScalar(len).toArray(faceNormals, t);
  }
  /* Two passes over the triangles: the first sums per vertex, the second
     merges the sums of every vertex at the same lattice point. */
  const own = new Float32Array(normals.length);
  for (let t = 0; t < indices.length; t += 3) {
    for (let k = 0; k < 3; k++) {
      const v = indices[t + k];
      const dot =
        faceNormals[t] * normals[v * 3] + faceNormals[t + 1] * normals[v * 3 + 1] + faceNormals[t + 2] * normals[v * 3 + 2];
      if (dot < limit) continue;
      own[v * 3] += faceNormals[t];
      own[v * 3 + 1] += faceNormals[t + 1];
      own[v * 3 + 2] += faceNormals[t + 2];
    }
  }
  for (let v = 0; v < lattice.length; v++) {
    const p = lattice[v] * 3;
    sums[p] += own[v * 3];
    sums[p + 1] += own[v * 3 + 1];
    sums[p + 2] += own[v * 3 + 2];
  }
  for (let v = 0; v < lattice.length; v++) {
    const p = lattice[v] * 3;
    c.set(sums[p], sums[p + 1], sums[p + 2]);
    const len = c.length();
    if (len > 0) c.divideScalar(len).toArray(normals, v * 3);
  }
}

/**
 * A box whose edges and corners are rounded with `radius`. Every vertex sits on
 * the rounded surface, and the result is indexed, so the crease pass is cheap.
 * UVs project from the dominant normal axis, the same as the side-wall and cap
 * UVs of the extruded box it replaced.
 */
function roundedBox(w: number, h: number, d: number, radius: number, smoothness: number) {
  const key = `${w},${h},${d},${radius},${smoothness}`;
  let geometry = cache.get(key);
  if (geometry) return geometry;

  const half = [w / 2, h / 2, d / 2];
  const r = Math.max(0, Math.min(radius, ...half));
  const inner = half.map((a) => (a - r < 1e-9 ? 0 : a - r));
  const segments = Math.max(1, Math.round(smoothness));
  const lines = half.map((a, i) => axisLines(a, inner[i], r, segments));
  const counts = lines.map((l) => l.length);

  let vertexCount = 0;
  let indexCount = 0;
  for (const [, , ua, va] of FACES) {
    vertexCount += counts[ua] * counts[va];
    indexCount += (counts[ua] - 1) * (counts[va] - 1) * 6;
  }
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices = new Uint32Array(indexCount);
  const lattice = new Int32Array(vertexCount);
  const c = [0, 0, 0];
  const n = [0, 0, 0];
  const at = [0, 0, 0];
  let vertex = 0;
  let index = 0;

  for (const [axis, sign, ua, va] of FACES) {
    const base = vertex;
    at[axis] = sign > 0 ? counts[axis] - 1 : 0;
    for (let j = 0; j < counts[va]; j++) {
      for (let i = 0; i < counts[ua]; i++) {
        at[ua] = i;
        at[va] = j;
        c[axis] = sign * half[axis];
        c[ua] = lines[ua][i];
        c[va] = lines[va][j];
        let len = 0;
        for (let k = 0; k < 3; k++) {
          const clamped = Math.max(-inner[k], Math.min(inner[k], c[k]));
          n[k] = c[k] - clamped;
          c[k] = clamped;
          len += n[k] * n[k];
        }
        len = Math.sqrt(len) || 1;
        for (let k = 0; k < 3; k++) {
          n[k] /= len;
          c[k] += n[k] * r;
          positions[vertex * 3 + k] = c[k];
          normals[vertex * 3 + k] = n[k];
        }
        const x = c[0] + half[0] - r;
        const y = c[1] + half[1] - r;
        const z = c[2] + half[2] - r;
        const [ax, ay, az] = [Math.abs(n[0]), Math.abs(n[1]), Math.abs(n[2])];
        if (az >= ax && az >= ay) uvs.set([x, y], vertex * 2);
        else if (ay >= ax) uvs.set([x, 1 - z], vertex * 2);
        else uvs.set([y, 1 - z], vertex * 2);
        lattice[vertex] = at[0] + counts[0] * (at[1] + counts[1] * at[2]);
        vertex++;
      }
    }
    const row = counts[ua];
    for (let j = 0; j < counts[va] - 1; j++) {
      for (let i = 0; i < row - 1; i++) {
        const q = base + j * row + i;
        indices.set([q, q + 1, q + row + 1, q, q + row + 1, q + row], index);
        index += 6;
      }
    }
  }

  creaseNormals(positions, normals, indices, lattice, counts[0] * counts[1] * counts[2]);

  geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  cache.set(key, geometry);
  return geometry;
}

/**
 * A replacement for drei's `RoundedBox`: the same rounded shape, built once
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
