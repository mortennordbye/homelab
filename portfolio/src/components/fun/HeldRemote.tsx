"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoundedBox } from "@/components/scene/RoundedBox";
import { SKIN } from "./Body";
import { isTyping } from "./FirstPerson";
import { RemoteModel } from "./Furniture";
import { useSay } from "./interaction";

/** Where the remote sits in view: down and to the right, a forearm out. */
const IN_HAND = new THREE.Vector3(0.2, -0.23, -0.52);
/** Tipped up toward the screen and turned in a little, the way a hand points it. */
const TILT = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.55, 0.25, 0));

const offset = new THREE.Vector3();

/** As far as the hand reaches: the same as the crosshair's. */
const REACH = 2.4;

const THROW_SPEED = 6.5;
const THROW_LIFT = 1.6;
const GRAVITY = 9.8;
/** How much speed a bounce off a wall keeps. */
const BOUNCE = 0.35;

/** Where a put-down remote lies, in world space. */
export type RemotePlace = { position: [number, number, number]; yaw: number };

const raycaster = new THREE.Raycaster(undefined, undefined, 0, REACH);
const centre = new THREE.Vector2(0, 0);
const normal = new THREE.Vector3();
const instance = new THREE.Matrix4();
const look = new THREE.Vector3();

/** Not somewhere to put things: the visitor's own body and the remote in hand. */
function skip(o: THREE.Object3D, held: THREE.Object3D | null) {
  for (let p: THREE.Object3D | null = o; p; p = p.parent) {
    if (p === held || (p as THREE.SkinnedMesh).isSkinnedMesh) return true;
  }
  return false;
}

/**
 * The remote in the visitor's hand. Follows the camera at priority 0.4: after
 * the walk has moved it (0), before the scene's matrices are updated (0.5) and
 * the frame is drawn, so it does not trail a frame behind when you turn.
 */
export function HeldRemote({
  onPutDown,
  onThrow,
}: {
  onPutDown: (at: RemotePlace) => void;
  /** T: let go of it at speed, from where the hand is. */
  onThrow: (from: THREE.Vector3, velocity: THREE.Vector3) => void;
}) {
  const g = useRef<THREE.Group>(null);
  const say = useSay();
  const { camera, scene } = useThree();

  /* Q lays it on the first upward-facing surface the crosshair finds within
     reach, turned the way the visitor faces. A wall, or nothing, keeps it in
     hand. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      if (e.code === "KeyT") {
        const from = IN_HAND.clone().applyQuaternion(camera.quaternion).add(camera.position);
        camera.getWorldDirection(look);
        onThrow(from, look.multiplyScalar(THROW_SPEED).add(new THREE.Vector3(0, THROW_LIFT, 0)));
        return;
      }
      if (e.code !== "KeyQ") return;
      raycaster.setFromCamera(centre, camera);
      const hit = raycaster
        .intersectObject(scene, true)
        .find((h) => h.face && !skip(h.object, g.current));
      if (hit?.face) {
        normal.copy(hit.face.normal);
        const mesh = hit.object as THREE.InstancedMesh;
        if (mesh.isInstancedMesh && hit.instanceId !== undefined) {
          mesh.getMatrixAt(hit.instanceId, instance);
          normal.transformDirection(instance);
        }
        normal.transformDirection(hit.object.matrixWorld);
        if (normal.y > 0.75) {
          camera.getWorldDirection(look);
          onPutDown({
            position: [hit.point.x, hit.point.y + 0.001, hit.point.z],
            yaw: Math.atan2(look.x, look.z),
          });
          return;
        }
      }
      say("nowhere flat to put it there", 1800);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [camera, scene, say, onPutDown, onThrow]);

  /* In first person only. The mirrors render at priority 0 and see the body's
     own hand holding its own remote; this one, floating at the eye, is hidden
     for them and shown again before the frame is drawn. */
  useFrame(() => {
    if (g.current) g.current.visible = false;
  }, -1);
  useFrame(() => {
    if (g.current) g.current.visible = true;
  }, 0.45);

  useFrame(({ camera }) => {
    const r = g.current;
    if (!r) return;
    offset.copy(IN_HAND).applyQuaternion(camera.quaternion);
    r.position.copy(camera.position).add(offset);
    r.quaternion.copy(camera.quaternion).multiply(TILT);
  }, 0.4);

  return (
    <group ref={g}>
      {/* The power end is the model's -z, which is already away from the eye. */}
      <RemoteModel />
      <Hand />
    </group>
  );
}

/**
 * A right hand round the remote: palm under it, thumb laid along the top and
 * four fingers curled up its right side. Rounded boxes, like the room's other
 * props, in the body's skin.
 */
function Hand() {
  const skin = <meshStandardMaterial color={SKIN} roughness={0.8} metalness={0} />;
  return (
    <group position={[0.004, 0, 0.035]}>
      {/* palm, under the near half of the remote */}
      <RoundedBox position={[0.006, -0.014, 0.02]} args={[0.078, 0.028, 0.095]} radius={0.012} smoothness={3}>
        {skin}
      </RoundedBox>
      {/* the wrist, out of the bottom of the view */}
      <RoundedBox position={[0.01, -0.02, 0.1]} args={[0.062, 0.042, 0.09]} radius={0.016} smoothness={3}>
        {skin}
      </RoundedBox>
      {/* thumb, along the top of the remote */}
      <RoundedBox
        position={[-0.016, 0.022, -0.012]}
        rotation={[0, 0.12, 0]}
        args={[0.02, 0.016, 0.07]}
        radius={0.008}
        smoothness={3}
      >
        {skin}
      </RoundedBox>
      {/* fingers, curled up the right side */}
      {[-0.028, -0.008, 0.012, 0.03].map((z, i) => (
        <RoundedBox
          key={z}
          position={[0.032, 0.006, z]}
          rotation={[0, 0, 0.5]}
          args={[0.018, 0.04 - i * 0.003, 0.017]}
          radius={0.008}
          smoothness={3}
        >
          {skin}
        </RoundedBox>
      ))}
    </group>
  );
}

const step = new THREE.Vector3();
const flyRay = new THREE.Raycaster();
const hitNormal = new THREE.Vector3();
const hitInstance = new THREE.Matrix4();

/**
 * The remote in flight after a throw. Gravity, a spin, and a ray along each
 * frame's step: an upward face (floor, table, sofa) is where it lands, any
 * other face bounces it back with most of its speed gone. The ray only runs
 * while it flies, which is never more than a couple of seconds.
 */
export function ThrownRemote({
  from,
  velocity,
  onLand,
}: {
  from: THREE.Vector3;
  velocity: THREE.Vector3;
  onLand: (at: RemotePlace) => void;
}) {
  const g = useRef<THREE.Group>(null);
  const { scene } = useThree();
  const pos = useRef(from.clone());
  const vel = useRef(velocity.clone());
  const age = useRef(0);
  const landed = useRef(false);

  useFrame((_, rawDelta) => {
    const r = g.current;
    if (!r || landed.current) return;
    const dt = Math.min(rawDelta, 0.04);
    age.current += dt;
    vel.current.y -= GRAVITY * dt;
    step.copy(vel.current).multiplyScalar(dt);
    const len = step.length();
    const land = (p: THREE.Vector3) => {
      landed.current = true;
      onLand({ position: [p.x, p.y + 0.001, p.z], yaw: Math.atan2(vel.current.x, vel.current.z) });
    };

    if (len > 1e-5) {
      flyRay.set(pos.current, step.clone().normalize());
      flyRay.far = len + 0.02;
      const hit = flyRay
        .intersectObject(scene, true)
        .find((h) => h.face && !skip(h.object, r));
      if (hit?.face) {
        hitNormal.copy(hit.face.normal);
        const mesh = hit.object as THREE.InstancedMesh;
        if (mesh.isInstancedMesh && hit.instanceId !== undefined) {
          mesh.getMatrixAt(hit.instanceId, hitInstance);
          hitNormal.transformDirection(hitInstance);
        }
        hitNormal.transformDirection(hit.object.matrixWorld);
        if (hitNormal.y > 0.6) {
          land(hit.point);
          return;
        }
        // Off the wall: reflect, lose most of the speed, step clear of the face.
        vel.current.reflect(hitNormal).multiplyScalar(BOUNCE);
        pos.current.copy(hit.point).addScaledVector(hitNormal, 0.02);
      } else {
        pos.current.add(step);
      }
    }
    // Belt and braces: the floor, and a throw that somehow never comes down.
    if (pos.current.y <= 0 || age.current > 4) {
      pos.current.y = 0;
      land(pos.current);
      return;
    }
    r.position.copy(pos.current);
    r.rotation.x += dt * 9;
    r.rotation.y += dt * 4;
  });

  return (
    <group ref={g} position={from}>
      <RemoteModel />
    </group>
  );
}
