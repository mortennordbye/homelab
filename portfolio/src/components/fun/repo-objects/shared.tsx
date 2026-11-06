"use client";

import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { OAK } from "@/components/materials/oak";
import { PAPER } from "@/components/materials/paper";

/**
 * Shared stock for the repo shelf objects. One instance per material, so
 * twelve objects compile a handful of programs, and the static merge can join
 * every part that does not move.
 *
 * Each object stands on its compartment floor at the origin, +z towards the
 * room, inside 0.19 wide, 0.22 tall and 0.16 deep.
 */
export const M = {
  brass: new THREE.MeshStandardMaterial({ color: "#b98f4e", metalness: 0.8, roughness: 0.35 }),
  dark: new THREE.MeshStandardMaterial({ color: "#1d1712", roughness: 0.8 }),
  oak: new THREE.MeshStandardMaterial({ color: OAK.case, roughness: 0.55 }),
  paper: new THREE.MeshStandardMaterial({ color: PAPER.sheet, roughness: 0.9 }),
  ink: new THREE.MeshStandardMaterial({ color: PAPER.ink, roughness: 0.9 }),
  /** A lamp: emissive on a near-black base, never a light source. */
  lamp: new THREE.MeshStandardMaterial({ color: "#2a1405", emissive: "#ffcf8a", emissiveIntensity: 1.4 }),
};

export type Tick = (t: number) => void;

/** Filled by the shelf, which runs every tick from one `useFrame` while the
 *  shelf can be seen. */
export const TickCtx = createContext<Set<Tick> | null>(null);

/** Runs `fn` with the clock's seconds on every frame the shelf is in view. */
export function useTick(fn: Tick) {
  const set = useContext(TickCtx);
  const latest = useRef(fn);
  useEffect(() => {
    latest.current = fn;
  });
  useEffect(() => {
    if (!set) return;
    const f: Tick = (t) => latest.current(t);
    set.add(f);
    return () => {
      set.delete(f);
    };
  }, [set]);
}

/** 0..1 through a loop of `period` seconds. */
export const phase = (t: number, period: number) => (((t % period) + period) % period) / period;

/** Smooth 0..1 between `a` and `b`. */
export function ease(x: number, a = 0, b = 1) {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
}

/**
 * A canvas texture drawn once at mount. System mono only: no web font has to
 * load first, so nothing is redrawn after the material is built.
 */
export function useCanvas(
  w: number,
  h: number,
  draw: (c: CanvasRenderingContext2D, w: number, h: number) => void,
) {
  const tex = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    draw(canvas.getContext("2d")!, w, h);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
    // Drawn once: the draw function is a constant of the object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, h]);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

export const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
