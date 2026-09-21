"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { SEATS } from "./Room";
import { NO_MERGE } from "./StaticMerge";
import { at, pz } from "./flat";

/**
 * Who turns up if you stay in bed after the alarm: a badly cut out David
 * Goggins, through the bedroom door and up to the bedside, and he has your
 * camera until you stand up.
 *
 * Unlit and billboarded on purpose. It is a cardboard cutout pasted into a
 * photoreal room, and lighting it correctly would spoil that.
 */

/** US Navy photo, public domain. Provenance in branding/ASSETS.md. */
const PHOTO = "/fun/goggins.webp";

const H = 1.85;
const FACE_Y = 1.62;
const WALK_S = 1.3;
/** Living room side of the bedroom door, then the walkway beside the bed. The
 *  straight line between them crosses the wall inside the door opening. */
const FROM = new THREE.Vector3(...at(3.2, 0, 0.7));
const TO = new THREE.Vector3(...at(5.0, 0, 0.95));
/** Sitting up towards him: part of the way from the pillow to his face. */
const LEAN = new THREE.Vector3(...SEATS.bed.pos).lerp(new THREE.Vector3(TO.x, FACE_Y, TO.z), 0.28);
const UP = new THREE.Vector3(0, 1, 0);

/** The drag: a lunge at the bed, then backwards out through the bedroom door
 *  with the camera towed behind him, which leaves it on the floor inside the
 *  doorway. GRAB to DROP crosses the wall within the door opening. */
const GRAB_S = 0.45;
const DRAG_S = 2.6;
const GRAB = TO.clone().lerp(new THREE.Vector3(...SEATS.bed.pos).setY(0), 0.4);
const DROP = new THREE.Vector3(...at(3.3, 0, 0.7));
/** Far enough back that the view up at him never goes edge-on to the cutout. */
const TOW = 0.95;
const FLOOR_EYE = 0.42;
/** World z of the bed's walkway edge, with clearance. Until the camera is past
 *  it the tow stays above the bedding, or the mattress clips through the view. */
const OFF_THE_BED = pz(1.34) - 0.2;
const OVER_BED_EYE = 0.95;
const FORWARD = new THREE.Vector3(0, 0, 1);

export function Visitor({
  active,
  dragging,
  onDragged,
}: {
  active: boolean;
  dragging: boolean;
  /** Called once, when he lets go. Standing up is what ends the visit. */
  onDragged: () => void;
}) {
  const { camera } = useThree();
  const group = useRef<THREE.Group>(null);
  const t = useRef(0);
  const [photo, setPhoto] = useState<THREE.Texture | null>(null);
  const dragT = useRef(0);
  const letGo = useRef(false);
  const { face, look, quat, roll, tow } = useMemo(
    () => ({
      face: new THREE.Vector3(),
      look: new THREE.Matrix4(),
      quat: new THREE.Quaternion(),
      roll: new THREE.Quaternion(),
      tow: new THREE.Vector3(),
    }),
    [],
  );

  useEffect(() => {
    t.current = 0;
  }, [active]);
  useEffect(() => {
    dragT.current = 0;
    letGo.current = false;
  }, [dragging]);

  // Fetched the first time he is due, not with the room: nothing in here
  // loads before it is needed.
  useEffect(() => {
    if (!active || photo) return;
    let live = true;
    new THREE.TextureLoader().load(PHOTO, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      if (live) setPhoto(tex);
    });
    return () => {
      live = false;
    };
  }, [active, photo]);

  useFrame((_, rawDelta) => {
    const g = group.current;
    if (!active || !photo || !g) return;
    const delta = Math.min(rawDelta, 0.05);
    t.current += delta;
    const k = Math.min(1, t.current / WALK_S);

    // A paper puppet's walk: rocked side to side and bounced along.
    const stride = k < 1 ? t.current * 9 : 0;
    g.position.lerpVectors(FROM, TO, k);
    g.position.y = Math.abs(Math.sin(stride)) * 0.05;
    g.rotation.set(
      0,
      Math.atan2(camera.position.x - g.position.x, camera.position.z - g.position.z),
      Math.sin(stride) * 0.09,
    );
    // Arrived, he shouts.
    g.scale.setScalar(k < 1 ? 1 : 1 + Math.abs(Math.sin(t.current * 7)) * 0.03);

    /* Takes the camera outright. Safe for the reason SeatedFocus's hand-off is:
       walking is off for as long as anyone is in the bed, and standing up
       eases back to the saved pose from wherever this left it. */
    // Aimed at the chest: the way out of bed sits mid-screen and would cover his face.
    const aim = () => {
      face.set(g.position.x, FACE_Y - 0.25, g.position.z);
      return quat.setFromRotationMatrix(look.lookAt(camera.position, face, UP));
    };

    if (!dragging) {
      aim();
      const ease = 1 - Math.exp(-2.2 * delta);
      camera.quaternion.slerp(quat, ease);
      camera.position.lerp(LEAN, ease * 0.6);
      return;
    }

    dragT.current += delta;
    const d = dragT.current;
    if (d < GRAB_S) {
      g.position.lerpVectors(TO, GRAB, d / GRAB_S);
      g.scale.setScalar(1 + (d / GRAB_S) * 0.12);
      camera.quaternion.slerp(aim(), 1 - Math.exp(-10 * delta));
      return;
    }
    const k2 = Math.min(1, (d - GRAB_S) / DRAG_S);
    // Eased in, so the first instant is a yank rather than a glide.
    g.position.lerpVectors(GRAB, DROP, 1 - (1 - k2) * (1 - k2));
    g.position.y = Math.abs(Math.sin(d * 11)) * 0.04;
    g.rotation.z = Math.sin(d * 11) * 0.07;

    // Towed behind him on the bed side, head bumping along at floor height.
    tow
      .subVectors(GRAB, DROP)
      .setY(0)
      .normalize()
      .multiplyScalar(TOW)
      .add(g.position)
      .setY(
        camera.position.z > OFF_THE_BED
          ? OVER_BED_EYE
          : FLOOR_EYE + Math.abs(Math.sin(d * 13)) * 0.05,
      );
    camera.position.lerp(tow, 1 - Math.exp(-7 * delta));
    roll.setFromAxisAngle(FORWARD, 0.45 + Math.sin(d * 13) * 0.14);
    // Aimed only now: he has just moved, and the look has to follow him.
    camera.quaternion.slerp(aim().multiply(roll), 1 - Math.exp(-9 * delta));

    if (k2 === 1 && !letGo.current) {
      letGo.current = true;
      onDragged();
    }
  });

  const img = photo?.image as { width: number; height: number } | undefined;

  return (
    <group ref={group} visible={active && photo !== null} userData={NO_MERGE}>
      {photo && img && (
        <mesh position={[0, H / 2, 0]}>
          <planeGeometry args={[(H * img.width) / img.height, H]} />
          <meshBasicMaterial map={photo} transparent alphaTest={0.4} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}
