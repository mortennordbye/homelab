"use client";

import { useGLTF } from "@react-three/drei";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";

/**
 * Real CC0 scanned props from Poly Haven, in place of hand-built primitives.
 *
 * The room was assembled entirely out of RoundedBox and cylinders, and that is
 * the thing that read as "pixel art". It is not a resolution problem and no
 * amount of lighting fixes it: a chair made of four boxes has no arris, no
 * taper, no joinery and no wear, so the eye correctly reports that it was
 * drawn rather than photographed. Objects that genuinely are boxes in real
 * life — switches, the NAS, monitor panels — still model fine by hand and are
 * deliberately left alone. What needed replacing is everything organic or
 * finely shaped.
 *
 * Models are 1K glTF. Each is a few hundred KB to ~2MB, which is why this is
 * limited to the few props that carry the most weight visually rather than
 * applied to the whole room.
 */

export type PropName =
  | "dining_chair_02"
  | "calathea_orbifolia_01"
  | "modern_ceiling_lamp_01";

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
 *
 * Scanned assets do not share a convention for origin or units: some sit on
 * the origin, some are centred, some are a few centimetres off. Rather than
 * hand-tuning an offset per model and having it drift whenever an asset is
 * re-exported, the bounding box is measured after load and the group is
 * shifted so the model's own base lands on y=0. Placement then means what it
 * says, and a swapped model does not sink into the floor.
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
  (
    [
      "dining_chair_02",
      "calathea_orbifolia_01",
      "modern_ceiling_lamp_01",
    ] as PropName[]
  ).forEach((n) => useGLTF.preload(url(n)));
}
