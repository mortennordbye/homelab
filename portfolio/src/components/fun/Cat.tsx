"use client";

import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { NO_MERGE } from "./StaticMerge";

/** "Maxwell The cat with bones animation" by Zhuier, CC BY 4.0. Credited in
 *  the room's corner; provenance in docs/apps/portfolio/brand/assets.md. */
const URL = "/models/fun/maxwell/maxwell.glb";

/** Longest side, so he fits the drum (radius 0.185) standing. */
const LENGTH = 0.26;

/** The dance: turns a second, beats a second, and the clip's own head sway
 *  (a slow 9s loop as exported) sped up to sit on the beat. */
const TURNS = 0.5;
const BEAT = 2.2;
const SWAY = 4;

function Maxwell({ dancing }: { dancing: boolean }) {
  const { scene, animations } = useGLTF(URL);
  const root = useRef<THREE.Group>(null);
  const { actions } = useAnimations(animations, root);

  /* Scaled to LENGTH and seated on his own base: the export's units and
     origin are arbitrary. Measured once, before any scale is applied. */
  const fit = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const s = LENGTH / Math.max(size.x, size.y, size.z);
    const c = box.getCenter(new THREE.Vector3());
    return { s, at: [-c.x * s, -box.min.y * s, -c.z * s] as [number, number, number] };
  }, [scene]);

  useEffect(() => {
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      // Skinned bounds are the bind pose's; a dancing limb leaves them and culls.
      m.frustumCulled = false;
      /* A black cat in an unlit drum reads by his sheen, as a real one does:
         a glossier coat picks up the room's reflections, plus a faint lift.
         A real drum light would recompile every material in the room on the
         first open. */
      const mat = m.material as THREE.MeshStandardMaterial;
      mat.roughness = 0.42;
      mat.envMapIntensity = 2.2;
      mat.emissive.set("#26231f");
    });
  }, [scene]);

  useEffect(() => {
    const dance = Object.values(actions)[0];
    if (!dance) return;
    dance.timeScale = SWAY;
    dance.play();
    dance.paused = !dancing;
  }, [actions, dancing]);

  // Spinning on the spot and bobbing to the beat, as the meme does.
  const mover = useRef<THREE.Group>(null);
  const t = useRef(0);
  useFrame((_, rawDelta) => {
    const g = mover.current;
    if (!g || !dancing) return;
    t.current += Math.min(rawDelta, 0.05);
    g.rotation.y = t.current * TURNS * Math.PI * 2;
    g.position.y = Math.abs(Math.sin(t.current * BEAT * Math.PI)) * 0.018;
  });

  return (
    <group ref={mover}>
    <group ref={root}>
      <primitive object={scene} scale={fit.s} position={fit.at} />
    </group>
    </group>
  );
}

/**
 * Maxwell, dancing on the drum floor while the washing machine's door is open
 * and holding still when it shuts. Fetched the first time the door opens, so
 * the room's first load carries none of him.
 *
 * NO_MERGE: inside Room's static merge his meshes would be baked at mount.
 */
export function DancingCat({
  position,
  dancing,
}: {
  /** The drum's floor, under its axis, at the depth he stands. */
  position: [number, number, number];
  dancing: boolean;
}) {
  const [wanted, setWanted] = useState(false);
  if (dancing && !wanted) setWanted(true);
  return (
    <group position={position} userData={NO_MERGE}>
      {wanted && (
        <Suspense fallback={null}>
          <Maxwell dancing={dancing} />
        </Suspense>
      )}
    </group>
  );
}
