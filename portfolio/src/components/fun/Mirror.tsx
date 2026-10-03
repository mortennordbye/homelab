"use client";

import { MeshReflectorMaterial } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Activity, useRef, useState } from "react";
import * as THREE from "three";
import { wallDistance } from "./interaction";

const frustum = new THREE.Frustum();
const viewProj = new THREE.Matrix4();
const sphere = new THREE.Sphere();
const centre = new THREE.Vector3();
const normal = new THREE.Vector3();
const toCamera = new THREE.Vector3();
const ray = new THREE.Ray();
const corner = new THREE.Vector3();

/** Whether any of the pane's centre and four corners has a clear line to the
 *  eye through the interior walls. */
function unwalled(m: THREE.Mesh, eye: THREE.Vector3) {
  if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
  const { min, max } = m.geometry.boundingBox!;
  const points: [number, number][] = [
    [(min.x + max.x) / 2, (min.y + max.y) / 2],
    [min.x, min.y],
    [max.x, min.y],
    [min.x, max.y],
    [max.x, max.y],
  ];
  return points.some(([x, y]) => {
    corner.set(x, y, 0).applyMatrix4(m.matrixWorld);
    const d = eye.distanceTo(corner);
    ray.set(eye, corner.sub(eye).normalize());
    return wallDistance(ray) >= d;
  });
}

/**
 * True while the pane could be in the picture: in front of it, within `reach`,
 * inside the view frustum, and not wholly behind an interior wall. So a mirror
 * is live from any angle it can be seen, through a doorway included.
 */
export function useSeen(ref: React.RefObject<THREE.Mesh | null>, reach = 8) {
  const [seen, setSeen] = useState(false);
  useFrame(({ camera }) => {
    const m = ref.current;
    if (!m) return;
    if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
    sphere.copy(m.geometry.boundingSphere!).applyMatrix4(m.matrixWorld);
    m.getWorldPosition(centre);
    normal.set(0, 0, 1).transformDirection(m.matrixWorld);
    toCamera.subVectors(camera.position, centre);
    viewProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(viewProj);
    const now =
      toCamera.dot(normal) > 0 &&
      toCamera.length() < reach &&
      frustum.intersectsSphere(sphere) &&
      unwalled(m, camera.position);
    if (now !== seen) setSeen(now);
  });
  return seen;
}

/**
 * The reflector's settings for a mirror you are meant to see yourself in:
 * sharp, no blur. Each one renders the flat again every frame, so it is only
 * live while it can be seen.
 */
export function SharpReflector({ resolution = 1024 }: { resolution?: number }) {
  return (
    <MeshReflectorMaterial
      resolution={resolution}
      mirror={1}
      blur={[0, 0]}
      mixBlur={0}
      mixStrength={1.1}
      depthScale={0}
      color="#9aa09c"
      roughness={0.05}
      metalness={0.6}
    />
  );
}

/**
 * A mirror pane: a live reflector while it can be seen, and dim glass when it
 * cannot. Hidden, never unmounted: drei does not dispose a reflector's render
 * targets. The stand-in stays in the scene graph either way, so its world
 * matrix is what the visibility test reads.
 */
export function LiveMirror({
  geometry,
  position,
  resolution,
  fallback,
}: {
  /** A plane facing local +z. */
  geometry: THREE.BufferGeometry;
  position?: [number, number, number];
  /** Each reflector is a full extra render; small panes can take fewer pixels. */
  resolution?: number;
  /** The stand-in's material, when dim glass is wrong for the frame it sits in. */
  fallback?: React.ReactNode;
}) {
  const standIn = useRef<THREE.Mesh>(null);
  const live = useSeen(standIn);
  return (
    <>
      <Activity mode={live ? "visible" : "hidden"}>
        <mesh geometry={geometry} position={position}>
          <SharpReflector resolution={resolution} />
        </mesh>
      </Activity>
      <mesh ref={standIn} geometry={geometry} position={position} visible={!live}>
        {fallback ?? (
          <meshStandardMaterial color="#4a5057" roughness={0.06} metalness={0.6} envMapIntensity={2.2} />
        )}
      </mesh>
    </>
  );
}
