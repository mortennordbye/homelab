"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

/**
 * Reports the scene's first rendered frame back to the facade.
 *
 * The objects sit on a poster while three.js arrives, and the canvas is
 * transparent, so the poster has to come off the moment the render exists —
 * otherwise both are on screen at once, at whatever different scale
 * `object-cover` has cropped the still to.
 *
 * Mount it inside the Canvas's Suspense boundary: nothing in there subscribes
 * to the frame loop until the textures have resolved, so the first callback is
 * a real painted frame rather than an empty one.
 */
export function FirstFrame({ onReady }: { onReady?: () => void }) {
  const fired = useRef(false);
  useFrame(() => {
    if (fired.current) return;
    fired.current = true;
    onReady?.();
  });
  return null;
}
