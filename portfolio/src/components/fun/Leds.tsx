"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

type Entry = {
  anchor: THREE.Object3D;
  color: THREE.Color;
  seed: number;
  steady: boolean;
  size: number;
};

/* Module scope because the room mounts one LedField; an Led registers here and
   the field draws every one of them in a single instanced draw. */
const registry = { entries: new Set<Entry>(), dirty: true };

/** Headroom over the LEDs the room has today; one past it is not drawn. */
const MAX = 128;

const blink = (t: number, seed: number) => {
  const p = Math.sin(t * seed + seed * 3.1);
  return p > 0.55 ? 1 : p > -0.1 ? 0.4 : 0.08;
};

/**
 * Blinking status LED on a deterministic schedule, so it reads as activity.
 * Only an anchor: `LedField` does the drawing, so nothing it sits on may move
 * after mount without the LED staying behind.
 */
export function Led({
  position,
  rotation = [0, 0, 0],
  color = "#7fc48c",
  seed = 1,
  size = 0.005,
  steady = false,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  seed?: number;
  size?: number;
  steady?: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    const entry = { anchor: ref.current!, color: new THREE.Color(color), seed, steady, size };
    registry.entries.add(entry);
    registry.dirty = true;
    return () => {
      registry.entries.delete(entry);
      registry.dirty = true;
    };
  }, [color, seed, steady, size]);
  return <group ref={ref} position={position} rotation={rotation} />;
}

/**
 * Every `Led` in the room as one instanced mesh. Opacity is per instance, as an
 * attribute patched into the basic material, because `InstancedMesh` has no
 * slot for it and the blink is an opacity change.
 */
export function LedField() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const list = useRef<Entry[]>([]);
  const { geometry, material, colors } = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const opacity = new THREE.InstancedBufferAttribute(new Float32Array(MAX), 1);
    geometry.setAttribute("ledOpacity", opacity);
    const material = new THREE.MeshBasicMaterial({ transparent: true });
    material.onBeforeCompile = (s) => {
      s.vertexShader = s.vertexShader
        .replace("#include <common>", "#include <common>\nattribute float ledOpacity;\nvarying float vLedOpacity;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLedOpacity = ledOpacity;");
      s.fragmentShader = s.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying float vLedOpacity;")
        .replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.a *= vLedOpacity;");
    };
    const colors = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
    return { geometry, material, colors };
  }, []);

  // Set before the shader compile, which keys instance colour on its presence.
  useLayoutEffect(() => {
    const mesh = ref.current!;
    mesh.instanceColor = colors;
    mesh.count = 0;
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material, colors]);

  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const opacity = mesh.geometry.getAttribute("ledOpacity") as THREE.InstancedBufferAttribute;
    if (registry.dirty) {
      registry.dirty = false;
      list.current = [...registry.entries].slice(0, MAX);
      mesh.updateWorldMatrix(true, false);
      const toLocal = mesh.matrixWorld.clone().invert();
      const m = new THREE.Matrix4();
      list.current.forEach((e, i) => {
        e.anchor.updateWorldMatrix(true, false);
        m.multiplyMatrices(toLocal, e.anchor.matrixWorld).scale(new THREE.Vector3(e.size, e.size, 1));
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, e.color);
        opacity.array[i] = e.steady ? 0.95 : 0.5;
      });
      mesh.count = list.current.length;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor!.needsUpdate = true;
      opacity.needsUpdate = true;
    }
    const t = clock.getElapsedTime();
    let changed = false;
    list.current.forEach((e, i) => {
      if (e.steady) return;
      const v = Math.fround(blink(t, e.seed));
      if (opacity.array[i] !== v) {
        opacity.array[i] = v;
        changed = true;
      }
    });
    if (changed) opacity.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, MAX]}
      frustumCulled={false}
      raycast={() => null}
    />
  );
}
