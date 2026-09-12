"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * userData that keeps a subtree out of `StaticMerge`. Anything whose transform
 * or material changes after mount needs it, or it freezes in the merged copy.
 * `Interactive` carries it, which covers everything that is picked, hovered,
 * opened or switched.
 */
export const NO_MERGE = { noMerge: true };

const KEYED_MAPS = ["map", "normalMap", "roughnessMap", "metalnessMap"] as const;
const UNSUPPORTED_MAPS = [
  "aoMap",
  "alphaMap",
  "bumpMap",
  "displacementMap",
  "emissiveMap",
  "envMap",
  "lightMap",
] as const;

const textureKey = (t: THREE.Texture | null) =>
  t
    ? `${t.source.uuid}:${t.repeat.x},${t.repeat.y}:${t.offset.x},${t.offset.y}:${t.rotation}:${t.wrapS},${t.wrapT}:${t.colorSpace}`
    : "-";

/** Equal for two materials only if they draw identically; null for any
 *  material this does not know how to compare, which is then left alone. */
function materialKey(m: THREE.Material): string | null {
  // Exact class: drei's shader-patched subclasses must not pass as plain ones.
  if (m.constructor !== THREE.MeshStandardMaterial) return null;
  const s = m as THREE.MeshStandardMaterial;
  if (s.transparent || s.alphaTest > 0 || !s.depthWrite || s.polygonOffset) return null;
  if (UNSUPPORTED_MAPS.some((k) => s[k])) return null;
  return [
    s.color.getHexString(),
    s.emissive.getHexString(),
    s.emissiveIntensity,
    s.roughness,
    s.metalness,
    s.side,
    s.flatShading,
    s.vertexColors,
    s.envMapIntensity,
    s.normalScale.x,
    s.normalScale.y,
    s.normalMapType,
    s.fog,
    s.toneMapped,
    s.wireframe,
    ...KEYED_MAPS.map((k) => textureKey(s[k])),
  ].join("|");
}

function meshKey(mesh: THREE.Mesh): string | null {
  const props = (mesh as unknown as { __r3f?: { props?: object } }).__r3f?.props;
  const g = mesh.geometry;
  if (
    (mesh as THREE.InstancedMesh).isInstancedMesh ||
    (mesh as THREE.SkinnedMesh).isSkinnedMesh ||
    Array.isArray(mesh.material) ||
    mesh.renderOrder !== 0 ||
    mesh.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender ||
    // A `visible` prop means React toggles it, and would un-hide the original.
    (props && "visible" in props) ||
    // Baking a mirrored transform would turn the faces inside out.
    mesh.matrixWorld.determinant() < 0 ||
    Object.keys(g.morphAttributes).length > 0 ||
    g.drawRange.count !== Infinity
  )
    return null;
  const attrs: string[] = [];
  for (const [name, a] of Object.entries(g.attributes)) {
    if ((a as THREE.InterleavedBufferAttribute).isInterleavedBufferAttribute) return null;
    const b = a as THREE.BufferAttribute;
    attrs.push(`${name}:${b.itemSize}:${b.array.constructor.name}:${b.normalized}`);
  }
  const material = materialKey(mesh.material as THREE.Material);
  if (material === null) return null;
  return `${material}#${attrs.sort().join(",")}#${g.index ? "i" : "n"}#${mesh.castShadow}${mesh.receiveShadow}`;
}

/**
 * Draws its static children as one mesh per material instead of one mesh
 * per piece. The flat was bound by draw-call submission, and almost none of
 * its hundreds of boards, panels and fronts ever change after mount.
 *
 * Runs once, after the subtree mounts. The originals are hidden, not removed,
 * so React still owns them; anything mounted later draws on its own as usual.
 * The trap is a mesh whose transform or material changes afterwards without
 * a `visible` prop or an `Interactive` above it: tag it with NO_MERGE, or the
 * merged copy keeps the pose it had at mount.
 */
export function StaticMerge({ children }: { children: React.ReactNode }) {
  const root = useRef<THREE.Group>(null);

  useLayoutEffect(() => {
    const group = root.current;
    if (!group) return;
    group.updateWorldMatrix(true, true);
    const toRoot = group.matrixWorld.clone().invert();

    const buckets = new Map<string, THREE.Mesh[]>();
    const visit = (o: THREE.Object3D) => {
      if (o.userData.noMerge || !o.visible) return;
      if ((o as THREE.Mesh).isMesh) {
        const key = meshKey(o as THREE.Mesh);
        if (key) buckets.set(key, [...(buckets.get(key) ?? []), o as THREE.Mesh]);
      }
      o.children.forEach(visit);
    };
    group.children.forEach(visit);

    const made: THREE.Mesh[] = [];
    const hidden: THREE.Mesh[] = [];
    const local = new THREE.Matrix4();
    for (const meshes of buckets.values()) {
      if (meshes.length < 2) continue;
      const parts = meshes.map((m) =>
        m.geometry.clone().applyMatrix4(local.multiplyMatrices(toRoot, m.matrixWorld)),
      );
      const geometry = mergeGeometries(parts);
      parts.forEach((p) => p.dispose());
      if (!geometry) continue;
      const merged = new THREE.Mesh(geometry, meshes[0].material);
      merged.castShadow = meshes[0].castShadow;
      merged.receiveShadow = meshes[0].receiveShadow;
      group.add(merged);
      made.push(merged);
      for (const m of meshes) {
        m.visible = false;
        hidden.push(m);
      }
    }

    return () => {
      for (const m of made) {
        group.remove(m);
        m.geometry.dispose();
      }
      for (const m of hidden) m.visible = true;
    };
  }, []);

  return <group ref={root}>{children}</group>;
}
