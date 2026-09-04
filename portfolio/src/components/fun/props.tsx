"use client";

import { useGLTF } from "@react-three/drei";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";

/**
 * Real CC0 scanned props from Poly Haven for everything organic or finely
 * shaped; things that genuinely are boxes (switches, NAS, monitor panels)
 * stay hand-modelled. Models are 1K glTF at a few hundred KB to ~2MB each,
 * so this is limited to the props carrying the most visual weight.
 */

export type PropName = "potted_plant_04";

const url = (n: PropName) => `/models/fun/${n}/${n}.gltf`;

type PropProps = {
  name: PropName;
  position?: [number, number, number];
  rotation?: [number, number, number];
  /** Target height in metres. The model is scaled uniformly to match. */
  height?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
};

/**
 * Renders a prop scaled to a real-world height and sat on its own base.
 * Scanned assets share no origin/unit convention, so the bounding box is
 * measured after load and the base shifted to y=0 — placement means what it
 * says and a swapped model does not sink into the floor.
 */
export function Prop({
  name,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  height,
  castShadow = true,
  receiveShadow = true,
}: PropProps) {
  const { scene } = useGLTF(url(name));

  // Clone per instance: useGLTF caches one scene graph, so two <Prop> of the
  // same name would otherwise be the same object and only the last transform
  // would survive.
  const model = useMemo(() => scene.clone(true), [scene]);

  const { scale, offset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    const centre = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(centre);
    const s = height && size.y > 0 ? height / size.y : 1;
    return {
      scale: s,
      offset: [-centre.x * s, -box.min.y * s, -centre.z * s] as [
        number,
        number,
        number,
      ],
    };
  }, [model, height]);

  useLayoutEffect(() => {
    model.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = castShadow;
        o.receiveShadow = receiveShadow;
      }
    });
  }, [model, castShadow, receiveShadow]);

  return (
    <group position={position} rotation={rotation}>
      <primitive object={model} scale={scale} position={offset} />
    </group>
  );
}

/** Preload so props do not pop in one at a time after the room appears. */
export function preloadProps() {
  (["potted_plant_04"] as PropName[]).forEach((n) => useGLTF.preload(url(n)));
}
