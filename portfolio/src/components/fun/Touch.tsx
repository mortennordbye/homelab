"use client";

import { useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { MoveInput } from "./FirstPerson";
import { useActivateAt } from "./interaction";

/**
 * Touch controls, for the phones pointer lock does not exist on.
 *
 * The room was desktop-only until now, and not in a graceful way: without
 * pointer lock there is no mouse-look, and without a keyboard there is no WASD,
 * so a phone visitor got a photograph of a room they could not move in. That is
 * worse than not shipping the room to phones at all, because it looks broken
 * rather than absent.
 *
 * Two pieces, deliberately split. `TouchLook` lives inside the Canvas because it
 * needs the camera and the interaction registry; the stick is plain DOM outside
 * it, because a joystick is a DOM control and drawing one in WebGL to keep them
 * together would be silly. They meet at a ref holding two numbers.
 */

/** Radians of rotation per pixel dragged. Tuned so a comfortable thumb sweep
 *  across a phone is a little under a quarter turn. */
const LOOK_SENS = 0.0042;

/** How far a finger may wander and still count as a tap rather than a look.
 *  Fingers are not mice: a dead-still tap does not exist. */
const TAP_SLOP_PX = 9;
const TAP_MS = 400;

export function TouchLook({ enabled }: { enabled: boolean }) {
  const { camera, gl } = useThree();
  const activateAt = useActivateAt();
  const euler = useRef(new THREE.Euler(0, 0, 0, "YXZ"));
  const ndc = useRef(new THREE.Vector2());
  const drag = useRef({
    id: null as number | null,
    lastX: 0,
    lastY: 0,
    startX: 0,
    startY: 0,
    startT: 0,
    moved: 0,
  });

  useEffect(() => {
    if (!enabled) return;
    const el = gl.domElement;
    /* Gesture state in a ref rather than closure locals. Same behaviour, but
       plain `let`s captured by handlers read as mutate-after-render to the
       react-hooks immutability rule, and a drag is exactly the kind of state a
       ref is for. */
    const g = drag.current;

    const start = (e: TouchEvent) => {
      if (g.id !== null) return;
      const t = e.changedTouches[0];
      g.id = t.identifier;
      g.lastX = g.startX = t.clientX;
      g.lastY = g.startY = t.clientY;
      g.startT = e.timeStamp;
      g.moved = 0;
    };

    const move = (e: TouchEvent) => {
      if (g.id === null) return;
      const t = Array.from(e.changedTouches).find((x) => x.identifier === g.id);
      if (!t) return;
      // Stops the page from scrolling and rubber-banding under the room.
      e.preventDefault();

      const dx = t.clientX - g.lastX;
      const dy = t.clientY - g.lastY;
      g.lastX = t.clientX;
      g.lastY = t.clientY;
      g.moved = Math.max(
        g.moved,
        Math.hypot(t.clientX - g.startX, t.clientY - g.startY),
      );

      euler.current.setFromQuaternion(camera.quaternion);
      euler.current.y -= dx * LOOK_SENS;
      euler.current.x -= dy * LOOK_SENS;
      // Straight up and straight down both gimbal-flip the view; stop short.
      euler.current.x = THREE.MathUtils.clamp(
        euler.current.x,
        -Math.PI / 2 + 0.02,
        Math.PI / 2 - 0.02,
      );
      camera.quaternion.setFromEuler(euler.current);
    };

    const end = (e: TouchEvent) => {
      if (g.id === null) return;
      const t = Array.from(e.changedTouches).find((x) => x.identifier === g.id);
      if (!t) return;
      const quick = e.timeStamp - g.startT < TAP_MS;
      if (g.moved < TAP_SLOP_PX && quick && activateAt) {
        const r = el.getBoundingClientRect();
        ndc.current.set(
          ((t.clientX - r.left) / r.width) * 2 - 1,
          -((t.clientY - r.top) / r.height) * 2 + 1,
        );
        activateAt(ndc.current);
      }
      g.id = null;
    };

    // Non-passive because `move` calls preventDefault.
    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", end, { passive: true });
    el.addEventListener("touchcancel", end, { passive: true });
    return () => {
      el.removeEventListener("touchstart", start);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", end);
      el.removeEventListener("touchcancel", end);
    };
  }, [enabled, camera, gl, activateAt]);

  return null;
}

const STICK_R = 58;
const KNOB_R = 26;

/**
 * The walk stick, bottom-left where a thumb already rests.
 *
 * Fixed rather than floating: a stick that appears wherever you first touch is
 * nicer once you know it exists and invisible until then, and this room has to
 * explain itself to someone who has never seen it.
 */
export function TouchStick({ move }: { move: React.RefObject<MoveInput> }) {
  const [knob, setKnob] = useState<{ x: number; y: number } | null>(null);
  const id = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0 });

  const set = useCallback(
    (dx: number, dy: number) => {
      const d = Math.hypot(dx, dy);
      const clamped = d > STICK_R ? STICK_R / d : 1;
      const kx = dx * clamped;
      const ky = dy * clamped;
      setKnob({ x: kx, y: ky });
      // Screen y grows downward and forward is -y, hence the flip.
      move.current = { x: kx / STICK_R, y: -ky / STICK_R };
    },
    [move],
  );

  const release = useCallback(() => {
    id.current = null;
    setKnob(null);
    move.current = { x: 0, y: 0 };
  }, [move]);

  return (
    <div
      className="absolute bottom-8 left-8 z-30 touch-none select-none"
      style={{ width: STICK_R * 2, height: STICK_R * 2 }}
      onTouchStart={(e) => {
        const t = e.changedTouches[0];
        id.current = t.identifier;
        const r = e.currentTarget.getBoundingClientRect();
        origin.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        set(t.clientX - origin.current.x, t.clientY - origin.current.y);
      }}
      onTouchMove={(e) => {
        const t = Array.from(e.changedTouches).find(
          (x) => x.identifier === id.current,
        );
        if (!t) return;
        set(t.clientX - origin.current.x, t.clientY - origin.current.y);
      }}
      onTouchEnd={release}
      onTouchCancel={release}
    >
      <div
        className="absolute inset-0 rounded-full border border-white/15 bg-black/30 backdrop-blur"
        aria-hidden
      />
      <div
        aria-hidden
        className="absolute rounded-full border border-white/25 bg-white/15"
        style={{
          width: KNOB_R * 2,
          height: KNOB_R * 2,
          left: STICK_R - KNOB_R + (knob?.x ?? 0),
          top: STICK_R - KNOB_R + (knob?.y ?? 0),
          transition: knob ? "none" : "left 140ms ease-out, top 140ms ease-out",
        }}
      />
    </div>
  );
}
