"use client";

import { useAnimations, useGLTF } from "@react-three/drei";
import { createPortal, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { EYE } from "./FirstPerson";
import { RemoteModel } from "./Furniture";

/** Quaternius "Man", CC0. Provenance in docs/apps/portfolio/brand/assets.md. */
const URL = "/models/fun/man/man.glb";

/** The model is 4.84 units to the top of the head. */
const SCALE = 1.78 / 4.84;
/** Eye height in the Sitting clip, at SCALE. Crouching borrows the same pose. */
const SIT_EYE = 1.22;
/** Behind and below the camera, so looking down finds the chest and feet
 *  rather than the inside of the collar. */
const BACK = 0.2;
const DROP = 0.07;

/** Skin, shared with the hand drawn in first person so the two match. */
export const SKIN = "#c49a7c";

const COLOURS: Record<string, string> = {
  Shirt: "#3d4b40",
  Pants: "#25272a",
  Skin: SKIN,
  Hair: "#2a2019",
  Socks: "#1c1c1e",
  Eyes: "#101010",
};

type Clip = "Idle" | "Walk" | "Run" | "Sitting" | "Jump";

/**
 * The visitor's own body, so looking down finds feet and the mirrors find a
 * person. Driven entirely off the camera: where it is, which way it faces and
 * how fast it is moving. No shadow: the shadow map is drawn on demand, and a
 * caster that moves every frame would make it redraw every frame.
 */
export function Body({
  hidden,
  sitting,
  holding,
  whole = false,
}: {
  hidden: boolean;
  sitting: boolean;
  /** The TV remote, in the right hand, for the mirrors to see. */
  holding: boolean;
  /** Keeps the head on for the main view too, while something other than the
   *  visitor's eye is drawing the frame. */
  whole?: boolean;
}) {
  const { scene, animations } = useGLTF(URL);
  const palm = useMemo(() => scene.getObjectByName("PalmR") ?? null, [scene]);
  /* The hand bone sits inside the scaled model and the armature's own scale,
     so whatever is parented to it shrinks with both. This undoes that, measured
     relative to the model root so it does not matter whether SCALE is applied
     yet. */
  const palmScale = useMemo(() => {
    if (!palm) return 1;
    scene.updateWorldMatrix(true, true);
    const v = new THREE.Vector3();
    const inner = palm.getWorldScale(v).x / scene.getWorldScale(v).x;
    return 1 / (SCALE * inner);
  }, [palm, scene]);
  const root = useRef<THREE.Group>(null);
  const { actions } = useAnimations(animations, root);
  const current = useRef<Clip | null>(null);
  const last = useRef(new THREE.Vector3());
  const speed = useRef(0);
  const dir = useRef(new THREE.Vector3());

  const neck = useRef<THREE.Object3D | null>(null);

  /* Headless in the visitor's own view, whole in the mirrors: the camera sits
     inside the head. The skeleton is re-posed on every render call, so the
     neck is restored before the reflectors render (priority 0) and collapsed
     before the composer draws the frame (priority 1). Its subtree's matrices
     are refreshed by hand: the scene's are updated once a frame, not per
     render (WorldMatrices in FunRoom.tsx). */
  const neckScale = (s: number) => {
    const n = neck.current;
    if (!n) return;
    n.scale.setScalar(s);
    n.updateMatrixWorld(true);
  };
  useFrame(() => neckScale(1), -1);
  useFrame(() => neckScale(whole ? 1 : 0.001), 0.5);

  useEffect(() => {
    neck.current = scene.getObjectByName("Neck") ?? null;
    scene.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (!m.isMesh) return;
      // Skinned bounds are the bind pose's; a walking leg leaves them and culls.
      m.frustumCulled = false;
      const mat = m.material as THREE.MeshStandardMaterial;
      const colour = COLOURS[mat.name];
      if (colour) mat.color.set(colour);
      mat.roughness = 0.85;
      mat.metalness = 0;
    });
  }, [scene]);

  // eslint-disable-next-line react-hooks/immutability -- the frame loop drives the mixer and the body in place by design
  useFrame(({ camera }, rawDelta) => {
    const play = (clip: Clip) => {
      if (current.current === clip) return;
      const next = actions[clip];
      if (!next) return;
      next.reset().fadeIn(0.25).play();
      if (current.current) actions[current.current]?.fadeOut(0.25);
      current.current = clip;
    };
    const g = root.current;
    if (!g) return;
    const delta = Math.max(Math.min(rawDelta, 0.05), 1e-4);
    const p = camera.position;
    const moved = Math.hypot(p.x - last.current.x, p.z - last.current.z) / delta;
    last.current.copy(p);
    // A teleport (a seat, the intro) is not a sprint.
    speed.current = THREE.MathUtils.damp(speed.current, moved > 8 ? 0 : moved, 8, delta);

    camera.getWorldDirection(dir.current);
    dir.current.y = 0;
    if (dir.current.lengthSq() < 1e-6) return;
    dir.current.normalize();

    const low = sitting || p.y < (EYE + SIT_EYE) / 2;
    const airborne = !sitting && p.y > EYE + 0.06;
    g.position.set(p.x - dir.current.x * BACK, p.y - (low ? SIT_EYE : EYE) - DROP, p.z - dir.current.z * BACK);
    g.rotation.y = Math.atan2(dir.current.x, dir.current.z);

    if (airborne) play("Jump");
    else if (low) play("Sitting");
    else if (speed.current < 0.15) play("Idle");
    else if (speed.current < 2.6) play("Walk");
    else play("Run");
    const walk = actions.Walk;
    // eslint-disable-next-line react-hooks/immutability -- see the useFrame above
    if (walk) walk.timeScale = THREE.MathUtils.clamp(speed.current / 1.5, 0.6, 1.6);
  });

  return (
    <group ref={root} visible={!hidden}>
      <primitive object={scene} scale={SCALE} />
      {holding &&
        palm &&
        createPortal(
          <group scale={palmScale} rotation={[Math.PI / 2, 0, 0]}>
            <RemoteModel />
          </group>,
          palm,
        )}
    </group>
  );
}

useGLTF.preload(URL);
