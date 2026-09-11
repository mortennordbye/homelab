"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { pz } from "./flat";

/**
 * What is beyond the glass, built rather than painted.
 *
 * A plane hung behind the window reads as a painting the moment you take a
 * step: the whole view slides with you and nothing in it moves against
 * anything else. Real geometry at real distances gives the parallax that makes
 * a window a window, which is the only thing that separates a view from
 * wallpaper.
 *
 * Everything out here is unlit on purpose. A treeline at dusk is a silhouette
 * against the sky, not a surface catching light, and the room's lamps fall off
 * long before they reach it. Fog is off for the same reason: the flat's fog is
 * a warm brown that belongs to lamplight indoors, and it would turn a cold
 * night forest sepia.
 */

/** The sky, as an equirectangular gradient with a moon in it. Canvas y runs
 *  from the zenith at the top to the nadir at the bottom, so the horizon — the
 *  band the whole view is read against — sits at the middle row. */
function skyTexture() {
  const w = 1024;
  const h = 512;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d")!;

  const sky = x.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#05080e");
  sky.addColorStop(0.26, "#0a1119");
  sky.addColorStop(0.42, "#152532");
  sky.addColorStop(0.49, "#3b4c5d");
  sky.addColorStop(0.52, "#1b242c");
  sky.addColorStop(1, "#0b1114");
  x.fillStyle = sky;
  x.fillRect(0, 0, w, h);

  const r = rng(77);
  x.fillStyle = "#cfe0ef";
  for (let i = 0; i < 220; i++) {
    const sx = r() * w;
    const sy = r() * h * 0.44;
    x.globalAlpha = 0.1 + r() * 0.35;
    x.fillRect(sx, sy, 1.2, 1.2);
  }
  x.globalAlpha = 1;

  /* The moon, low and small. A big one turns the view into a poster; this is
     here to give the sky a single point of interest and a reason for the cold
     light coming in the windows. */
  const mx = w * 0.62;
  const my = h * 0.3;
  const glow = x.createRadialGradient(mx, my, 0, mx, my, 46);
  glow.addColorStop(0, "rgba(206,224,240,0.5)");
  glow.addColorStop(1, "rgba(206,224,240,0)");
  x.fillStyle = glow;
  x.beginPath();
  x.arc(mx, my, 46, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = "#dce9f4";
  x.beginPath();
  x.arc(mx, my, 7, 0, Math.PI * 2);
  x.fill();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.mapping = THREE.EquirectangularReflectionMapping;
  return t;
}

/** Deterministic, so the forest is the same forest on every load. */
function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

/** How far the ground outside sits below the flat's floor. */
const GROUND = -9;

/** A spruce as three stacked cones: centre height up the tree, then width and
 *  height as fractions of it. One cone reads as a party hat. */
const TIERS: [number, number, number][] = [
  [0.3, 1, 0.6],
  [0.58, 0.76, 0.46],
  [0.82, 0.46, 0.38],
];

type Tree = { x: number; z: number; height: number; width: number; spin: number; far: boolean };

/**
 * One tier of one depth band, as a plain instanced mesh with its matrices set
 * once. drei's Instances re-derives every instance from an Object3D each frame,
 * which for a forest that never moves is 720 matrix updates for nothing.
 */
function Trees({
  rows,
  tier,
  color,
}: {
  rows: Tree[];
  tier: [number, number, number];
  color: string;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const [at, wf, hf] = tier;
    const o = new THREE.Object3D();
    rows.forEach((t, i) => {
      o.position.set(t.x, GROUND + t.height * at, t.z);
      o.rotation.set(0, t.spin, 0);
      o.scale.set(t.width * wf, t.height * hf, t.width * wf);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [rows, tier]);

  return (
    /* Culling off: the instanced mesh keeps the unit cone's bounding sphere at
       the origin, so three culls the whole forest the moment the flat's centre
       leaves the frustum, which is every time you actually look out of a
       window. */
    <instancedMesh ref={ref} args={[undefined, undefined, rows.length]} frustumCulled={false}>
      <coneGeometry args={[1, 1, 7]} />
      <meshBasicMaterial color={color} fog={false} />
    </instancedMesh>
  );
}

export function Outside() {
  const sky = useMemo(() => skyTexture(), []);

  /* Two depth bands rather than fog: the far one is mixed toward the sky, which
     is what atmospheric perspective does and costs nothing to fake. */
  const trees = useMemo(() => {
    const r = rng(20260903);
    return Array.from({ length: 240 }, () => {
      /* Kept inside the dome's radius: a tree beyond it is simply hidden by
         the sky it is supposed to stand against. */
      const depth = 13 + r() * 25;
      const height = 7 + r() * 7;
      return {
        x: (r() - 0.5) * 96,
        z: pz(0) - depth,
        height,
        width: height * (0.15 + r() * 0.06),
        spin: r() * Math.PI,
        far: depth > 24,
      };
    });
  }, []);
  const [nearTrees, farTrees] = useMemo(
    () => [trees.filter((t) => !t.far), trees.filter((t) => t.far)],
    [trees],
  );

  return (
    <group>
      {/* The dome, drawn on the inside. A sphere always covers the view cone
          through a window whatever you do, so the only real constraint is the
          camera's far plane at 60 — a bigger one would simply be clipped away
          and take the sky with it. */}
      <mesh position={[0, GROUND, 0]}>
        <sphereGeometry args={[45, 32, 16]} />
        <meshBasicMaterial map={sky} side={THREE.BackSide} fog={false} />
      </mesh>

      {/* The ground the forest stands on, well below the flat: from a first
          floor the treeline sits on the horizon, and from the same level it
          fills the whole opening with trunks and you never see sky at all. */}
      <mesh position={[0, GROUND, pz(0) - 24]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[140, 76]} />
        <meshBasicMaterial color="#0d1519" fog={false} />
      </mesh>

      {([
        { far: false, color: "#080f0f" },
        { far: true, color: "#18272f" },
      ] as const).map((band) =>
        TIERS.map((tier, i) => (
          <Trees
            key={`${band.far}-${i}`}
            rows={band.far ? farTrees : nearTrees}
            tier={tier}
            color={band.color}
          />
        )),
      )}
    </group>
  );
}
