"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

// Silence the noisy "THREE.Clock has been deprecated" warning emitted from
// inside @react-three/fiber. The library still uses Clock internally; the
// message floods the dev indicator until upstream migrates to Timer.
if (typeof window !== "undefined") {
  const origWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    const first = args[0];
    if (typeof first === "string" && first.includes("THREE.Clock")) return;
    origWarn(...args);
  };
}

const OSLO = { lat: 59.9139, lon: 10.7522 };
const R = 1.15;
const TILT = 0.41; // 23.4° axial tilt
const INITIAL_ROTATION = -1.95; // Atlantic facing, so Oslo starts in view
const SPIN_SPEED = 0.078; // rad/s — one turn every ~80 seconds
const TABLE_Y = -(R + 0.81);
const CAM_Z = 6.9;
const FOV = 32;

function latLonToVec3(lat: number, lon: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

const OSLO_DIR = latLonToVec3(OSLO.lat, OSLO.lon, 1);

/* ---------------------------------------------------------------------------
   Printing the globe.

   The shipped earth texture is a photograph: blue sea, green land, and a
   colour story that belongs in orbit. This reprints it as a made object at
   sample time, in the shader, so it costs no CPU and no second asset.

   Sea and land are separated by blue dominance rather than by brightness, so
   each gets its own ramp — deep water stays dark navy, land runs from forest
   green in the lowlands to desert ochre at the bright end. A graticule and a
   heavier equator are engraved on top, which is what makes it read as printed
   rather than photographed.

   The map arrives already decoded to linear, so the whole mapping is done in
   approximate sRGB and converted back; the constants were picked by eye in
   that space and would go muddy if applied to linear values.
--------------------------------------------------------------------------- */
const PRINT_SHADER = /* glsl */ `
  vec3 srgb = pow(max(diffuseColor.rgb, 0.0), vec3(1.0 / 2.2));
  float lum = dot(srgb, vec3(0.24, 0.68, 0.08));
  float sea = clamp((srgb.b - max(srgb.r, srgb.g)) * 9.0, 0.0, 1.0);

  vec3 landLo  = vec3(0.15, 0.25, 0.10);
  vec3 landMid = vec3(0.31, 0.40, 0.16);
  vec3 landHi  = vec3(0.70, 0.59, 0.32);
  vec3 seaLo   = vec3(0.055, 0.150, 0.275);
  vec3 seaHi   = vec3(0.130, 0.335, 0.545);

  vec3 land = lum < 0.5
    ? mix(landLo, landMid, lum / 0.5)
    : mix(landMid, landHi, (lum - 0.5) / 0.5);
  vec3 water = mix(seaLo, seaHi, clamp(lum * 2.2, 0.0, 1.0));

  vec3 print = mix(land, water, sea);
  print *= 0.86 + 0.28 * lum;   // keep a trace of the original micro-detail

  // Graticule every 30 degrees, and a heavier equator.
  float u = vMapUv.x * 12.0;
  float v = vMapUv.y * 6.0;
  float gu = 1.0 - smoothstep(0.0, fwidth(u) * 1.3, abs(fract(u + 0.5) - 0.5));
  float gv = 1.0 - smoothstep(0.0, fwidth(v) * 1.3, abs(fract(v + 0.5) - 0.5));
  print = mix(print, print * 0.58, max(gu, gv) * 0.5);

  float eq = 1.0 - smoothstep(0.0, fwidth(vMapUv.y) * 2.5, abs(vMapUv.y - 0.5));
  print = mix(print, print * 0.45, eq * 0.7);

  diffuseColor.rgb = pow(print, vec3(2.2));
`;

/* Oak, drawn rather than downloaded: banded grain with a little wander plus a
   few darker rays. At this depth of field it is indistinguishable from a photo
   and it costs no request. */
function makeOak() {
  const size = 1024;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const x = c.getContext("2d")!;
  x.fillStyle = "#4c3722";
  x.fillRect(0, 0, size, size);
  for (let i = 0; i < 260; i++) {
    const y = Math.random() * size;
    const dark = Math.random() * 0.5;
    x.strokeStyle = `rgba(${40 + Math.random() * 30},${26 + Math.random() * 20},${14 + Math.random() * 12},${0.1 + dark * 0.3})`;
    x.lineWidth = 0.7 + Math.random() * 3.4;
    x.beginPath();
    x.moveTo(0, y);
    for (let s = 0; s <= size; s += 64) {
      x.lineTo(s, y + Math.sin(s * 0.006 + i) * 7 + (Math.random() - 0.5) * 3);
    }
    x.stroke();
  }
  for (let i = 0; i < 40; i++) {
    x.strokeStyle = `rgba(30,18,10,${0.05 + Math.random() * 0.09})`;
    x.lineWidth = 6 + Math.random() * 16;
    const y = Math.random() * size;
    x.beginPath();
    x.moveTo(0, y);
    x.lineTo(size, y + (Math.random() - 0.5) * 40);
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  t.anisotropy = 8;
  return t;
}

/** Where the globe stands, given how wide the hero happens to be.
 *  It sits near the right edge with its own radius as the margin, and the
 *  camera looks at a point well left of it so the copy column keeps the
 *  darkest part of the frame. */
function useLayout() {
  const { camera, size } = useThree();
  return useMemo(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const halfH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * CAM_Z;
    const halfW = halfH * (size.width / size.height);
    // Hold the globe at roughly a quarter of the frame's width whatever shape
    // the hero happens to be. Without this it swells as the viewport narrows —
    // at 1024 it was eating the headline — because the frame shrinks in world
    // units while the sphere does not.
    const scale = Math.min(Math.max((halfW * 0.26) / R, 0.62), 1);
    return {
      scale,
      gx: Math.min(Math.max(halfW - R * scale, 1.2), 3.5),
      lookX: halfW * 0.23,
    };
  }, [camera, size]);
}

function Globe({
  overlayRef,
  keyRef,
}: {
  overlayRef: React.RefObject<HTMLDivElement | null>;
  keyRef: React.MutableRefObject<number>;
}) {
  const { camera, size } = useThree();
  const { gx, scale, lookX } = useLayout();

  useEffect(() => {
    camera.lookAt(lookX, 0.02, 0);
  }, [camera, lookX]);

  const [day, normal] = useLoader(THREE.TextureLoader, [
    "/textures/earth-day.webp",
    "/textures/earth-normal.webp",
  ]);

  // The loader hands back textures configured for linear data, which is right
  // for the normal map and wrong for the colour map.
  useEffect(() => {
    day.colorSpace = THREE.SRGBColorSpace;
    day.anisotropy = 8;
    normal.anisotropy = 8;
    day.needsUpdate = true;
  }, [day, normal]);

  const ballMaterial = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      map: day,
      normalMap: normal,
      normalScale: new THREE.Vector2(0.35, 0.35),
      roughness: 0.72,
      metalness: 0.02,
    });
    m.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `#include <map_fragment>\n${PRINT_SHADER}`,
      );
    };
    return m;
  }, [day, normal]);

  const oak = useMemo(() => makeOak(), []);
  const brass = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#b98f4e", metalness: 1, roughness: 0.28 }),
    [],
  );
  const brassDark = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#8a6a38", metalness: 1, roughness: 0.42 }),
    [],
  );
  const pinHead = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#9ec3a3",
        emissive: new THREE.Color("#65a16e"),
        emissiveIntensity: 1.5,
        roughness: 0.35,
        metalness: 0,
      }),
    [],
  );

  const spinRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  const scratch = useMemo(
    () => ({ w: new THREE.Vector3(), n: new THREE.Vector3(), c: new THREE.Vector3(), q: new THREE.Quaternion() }),
    [],
  );

  useFrame((_, dt) => {
    const spin = spinRef.current;
    if (!spin) return;
    spin.rotation.y += SPIN_SPEED * Math.min(dt, 0.05);

    // The Morse schedule keys the pin itself rather than a CSS glow, so the
    // easter egg is now something happening on the object.
    const k = keyRef.current;
    pinHead.emissiveIntensity = 0.45 + 1.5 * k;
    if (glowRef.current) glowRef.current.intensity = 0.2 + 0.5 * k;

    const el = overlayRef.current;
    if (!el) return;
    spin.updateMatrixWorld(true);
    scratch.w.copy(OSLO_DIR).multiplyScalar(R + 0.16).applyMatrix4(spin.matrixWorld);
    scratch.n.copy(OSLO_DIR).applyQuaternion(spin.getWorldQuaternion(scratch.q)).normalize();
    scratch.c.copy(camera.position).sub(scratch.w).normalize();

    // Fade the label out as Oslo turns toward the far side; the pin itself
    // needs no culling because the depth buffer already hides it.
    const facing = scratch.n.dot(scratch.c);
    if (facing <= 0.12) {
      el.style.opacity = "0";
      return;
    }
    el.style.opacity = String(Math.min(1, (facing - 0.12) * 3.4));
    scratch.w.project(camera);
    const x = ((scratch.w.x + 1) / 2) * size.width;
    const y = ((-scratch.w.y + 1) / 2) * size.height;
    el.style.transform = `translate(${x}px, ${y}px)`;
  });

  const osloQuat = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), OSLO_DIR),
    [],
  );

  return (
    <>
      <group position={[gx, -0.05, 0]} scale={scale}>
        <group ref={spinRef} rotation={[TILT, INITIAL_ROTATION, 0]}>
          <mesh castShadow receiveShadow material={ballMaterial}>
            <sphereGeometry args={[R, 96, 64]} />
          </mesh>

          {/* Oslo is a pin pushed into the globe, so it turns with the ball
              and is occluded by it without any projection maths. */}
          <group quaternion={osloQuat}>
            <mesh position={[0, R + 0.05, 0]} material={brassDark}>
              <cylinderGeometry args={[0.009, 0.009, 0.2, 10]} />
            </mesh>
            <mesh position={[0, R + 0.16, 0]} castShadow material={pinHead}>
              <sphereGeometry args={[0.038, 24, 18]} />
            </mesh>
            <pointLight
              ref={glowRef}
              position={[0, R + 0.16, 0]}
              color="#6fbb7c"
              intensity={0.45}
              distance={0.85}
              decay={2}
            />
          </group>
        </group>

        {/* Meridian ring, pin through the poles, and the pedestal it stands on. */}
        <mesh rotation={[0, Math.PI / 2, TILT]} castShadow material={brass}>
          <torusGeometry args={[R + 0.1, 0.035, 20, 160]} />
        </mesh>
        <mesh rotation={[0, 0, TILT]} material={brassDark}>
          <cylinderGeometry args={[0.02, 0.02, (R + 0.1) * 2, 16]} />
        </mesh>
        <mesh position={[0, -(R + 0.11), 0]} rotation={[Math.PI / 2, 0, 0]} material={brassDark}>
          <torusGeometry args={[0.1, 0.028, 14, 40]} />
        </mesh>
        <mesh position={[0, -(R + 0.42), 0]} castShadow material={brass}>
          <cylinderGeometry args={[0.055, 0.075, 0.62, 20]} />
        </mesh>
        <mesh position={[0, -(R + 0.76), 0]} castShadow receiveShadow material={brass}>
          <cylinderGeometry args={[0.42, 0.5, 0.09, 40]} />
        </mesh>
      </group>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, TABLE_Y, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial map={oak} roughness={0.52} metalness={0} />
      </mesh>

      {/* Dark warm plaster, lit only by the key's falloff. */}
      <mesh position={[0, 8, -9]}>
        <planeGeometry args={[60, 30]} />
        <meshStandardMaterial color="#241a12" roughness={1} />
      </mesh>

      {/* Brass only looks like brass when it has something to reflect. */}
      <mesh>
        <boxGeometry args={[40, 40, 40]} />
        <meshBasicMaterial color="#2a2016" side={THREE.BackSide} />
      </mesh>
    </>
  );
}

function Lights() {
  const key = useRef<THREE.DirectionalLight>(null);
  const rakeTarget = useRef<THREE.Object3D>(null);
  const rake = useRef<THREE.SpotLight>(null);

  useEffect(() => {
    if (rake.current && rakeTarget.current) rake.current.target = rakeTarget.current;
  }, []);

  return (
    <>
      <ambientLight color="#31251a" intensity={0.42} />
      {/* One window at the upper left. Everything the copy sits on stays in
          shadow, which is what gives the frame its weight. */}
      <directionalLight
        ref={key}
        color="#ffd49a"
        intensity={3}
        position={[-5.5, 5.5, 4.5]}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={26}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0006}
        shadow-radius={3}
      />
      {/* A dim moss bounce off the right, so the dark side is not dead. */}
      <directionalLight color="#6f9c72" intensity={0.5} position={[5, -0.5, 2]} />
      {/* Rakes across the tabletop so the wood reads without lifting the wall. */}
      <spotLight
        ref={rake}
        color="#ffca8a"
        intensity={26}
        distance={22}
        angle={0.72}
        penumbra={0.85}
        decay={1.6}
        position={[-4.5, 2.2, 5.5]}
      />
      <object3D ref={rakeTarget} position={[1.2, TABLE_Y, 0.5]} />
    </>
  );
}

export default function InlineGlobeScene({
  overlayRef,
  keyRef,
}: {
  overlayRef: React.RefObject<HTMLDivElement | null>;
  keyRef: React.MutableRefObject<number>;
}) {
  return (
    <Canvas
      shadows
      camera={{ position: [0.1, 0.3, CAM_Z], fov: FOV }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
      style={{ width: "100%", height: "100%" }}
    >
      <Suspense fallback={null}>
        <Lights />
        <Globe overlayRef={overlayRef} keyRef={keyRef} />
      </Suspense>
    </Canvas>
  );
}
