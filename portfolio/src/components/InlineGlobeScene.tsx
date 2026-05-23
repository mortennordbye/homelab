"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Preload, Text, useTexture } from "@react-three/drei";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";

// Silence the noisy "THREE.Clock has been deprecated" warning emitted from
// inside @react-three/fiber / drei. The library still uses Clock internally;
// the message floods the dev indicator until upstream migrates to Timer.
if (typeof window !== "undefined") {
  const origWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    const first = args[0];
    if (typeof first === "string" && first.includes("THREE.Clock")) return;
    origWarn(...args);
  };
}

const OSLO = { lat: 59.91, lon: 10.75 };
const RADIUS = 1.6;
const EARTH_TILT_X = 0.32;
// Rotation centered on Europe / North Atlantic. The globe sways back and
// forth around this pose so Oslo stays in the visible hemisphere while the
// earth still feels alive. The OsloProjector follows the live rotation.
const INITIAL_ROTATION = -1.95;
const SWAY_AMPLITUDE = 0.7; // radians — ~±40°, keeps Oslo on the visible face
const SWAY_SPEED = 0.08; // radians per second of the sine argument — ~80s full cycle

function latLonToVec3(lat: number, lon: number, radius = RADIUS) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

function Earth({
  rotationRef,
}: {
  rotationRef: React.MutableRefObject<number>;
}) {
  const [day, normal, specular] = useTexture([
    "/textures/earth-day.webp",
    "/textures/earth-normal.webp",
    "/textures/earth-specular.webp",
  ]);

  useEffect(() => {
    day.colorSpace = THREE.SRGBColorSpace;
    normal.colorSpace = THREE.NoColorSpace;
    specular.colorSpace = THREE.NoColorSpace;
    [day, normal, specular].forEach((t) => {
      t.anisotropy = 8;
    });
  }, [day, normal, specular]);

  const groupRef = useRef<THREE.Group>(null);
  const elapsed = useRef(0);

  useFrame((_, dt) => {
    elapsed.current += dt;
    rotationRef.current =
      INITIAL_ROTATION + SWAY_AMPLITUDE * Math.sin(elapsed.current * SWAY_SPEED);
    if (groupRef.current) {
      groupRef.current.rotation.y = rotationRef.current;
    }
  });

  return (
    <group ref={groupRef} rotation={[EARTH_TILT_X, INITIAL_ROTATION, 0]}>
      <mesh>
        <sphereGeometry args={[RADIUS, 96, 64]} />
        <meshStandardMaterial
          map={day}
          normalMap={normal}
          normalScale={new THREE.Vector2(0.6, 0.6)}
          roughnessMap={specular}
          roughness={0.85}
          metalness={0.05}
        />
      </mesh>
    </group>
  );
}

// Projects the Oslo surface point through the camera each frame and writes
// the resulting screen pixel position to a ref'd DOM element. That element
// lives OUTSIDE the dimmed canvas wrapper, so the visible marker is rendered
// in HTML/CSS at full brightness — no longer affected by the wrapper's
// opacity-[0.85] dimming that covers the rest of the sky.
function OsloProjector({
  overlayRef,
  offsetX,
  rotationRef,
}: {
  overlayRef: React.RefObject<HTMLDivElement | null>;
  offsetX: number;
  rotationRef: React.MutableRefObject<number>;
}) {
  const { camera, size } = useThree();
  const localOslo = useMemo(
    () => latLonToVec3(OSLO.lat, OSLO.lon, RADIUS * 1.005),
    [],
  );
  const scratch = useMemo(
    () => ({
      v: new THREE.Vector3(),
      world: new THREE.Vector3(),
      center: new THREE.Vector3(),
      toOslo: new THREE.Vector3(),
      toCam: new THREE.Vector3(),
      euler: new THREE.Euler(),
      quat: new THREE.Quaternion(),
      scale: new THREE.Vector3(1, 1, 1),
      matrix: new THREE.Matrix4(),
    }),
    [],
  );

  useFrame(() => {
    const el = overlayRef.current;
    if (!el) return;

    scratch.center.set(offsetX, 0, 0);
    scratch.euler.set(EARTH_TILT_X, rotationRef.current, 0);
    scratch.quat.setFromEuler(scratch.euler);
    scratch.matrix.compose(scratch.center, scratch.quat, scratch.scale);
    scratch.world.copy(localOslo).applyMatrix4(scratch.matrix);

    // Cull when Oslo rotates to the back hemisphere of the globe.
    scratch.toOslo.copy(scratch.world).sub(scratch.center).normalize();
    scratch.toCam.copy(camera.position).sub(scratch.center).normalize();
    const facing = scratch.toOslo.dot(scratch.toCam);
    if (facing <= 0.05) {
      el.style.opacity = "0";
      return;
    }

    scratch.v.copy(scratch.world).project(camera);
    if (scratch.v.z > 1 || scratch.v.z < -1) {
      el.style.opacity = "0";
      return;
    }
    // Fade in/out near the limb so the marker doesn't pop on/off.
    el.style.opacity = String(Math.min(1, (facing - 0.05) * 5));
    const x = ((scratch.v.x + 1) / 2) * size.width;
    const y = ((-scratch.v.y + 1) / 2) * size.height;
    el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  });

  return null;
}


// ---------------------------------------------------------------------------
// Sky: starfield + brand-logo "constellations" + monospace IT easter-egg
// labels. All positioned in screen-NDC so they stay anchored to the same
// percent positions regardless of viewport, never crashing into the headline,
// body copy, badges, or photo card.
// ---------------------------------------------------------------------------

const STARS_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  uniform float uTime;
  varying float vTwinkle;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * (300.0 / -mv.z);
    vTwinkle = 0.55 + 0.45 * sin(uTime * 1.6 + aPhase);
  }
`;

const STARS_FRAG = /* glsl */ `
  varying float vTwinkle;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float a = (1.0 - d * 2.0) * vTwinkle;
    gl_FragColor = vec4(vec3(1.0), a);
  }
`;

function Stars() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);

  const { positions, sizes, phases } = useMemo(() => {
    const count = 2200;
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const ph = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const u = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const r = 30 + Math.random() * 10;
      pos[i * 3] = r * s * Math.cos(t);
      pos[i * 3 + 1] = r * s * Math.sin(t);
      pos[i * 3 + 2] = r * u;
      sz[i] = 0.4 + Math.pow(Math.random(), 5) * 1.8;
      ph[i] = Math.random() * Math.PI * 2;
    }
    return { positions: pos, sizes: sz, phases: ph };
  }, []);

  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  useFrame((_, dt) => {
    if (matRef.current) {
      (matRef.current.uniforms.uTime.value as number) += dt;
    }
    if (groupRef.current) {
      groupRef.current.rotation.y += dt * 0.004;
    }
  });

  return (
    <group ref={groupRef}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
          <bufferAttribute attach="attributes-aPhase" args={[phases, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={matRef}
          vertexShader={STARS_VERT}
          fragmentShader={STARS_FRAG}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

// Screen-NDC → world coords at depth z. ndcX in [-1,1] left→right, ndcY in
// [-1,1] top→bottom (CSS convention). Re-evaluated whenever the viewport
// changes so positions stay anchored on resize.
function useWorldFromNdc(ndcX: number, ndcY: number, z: number) {
  const { camera, size } = useThree();
  return useMemo(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const dist = cam.position.z - z;
    const vh = 2 * dist * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const vw = vh * (size.width / size.height);
    return [ndcX * (vw / 2), -ndcY * (vh / 2), z] as [number, number, number];
  }, [camera, size, ndcX, ndcY, z]);
}

type SpaceLabel = {
  text: string;
  ndc: [number, number];
  z: number;
  size: number;
  color?: string;
};

// Only the truly humorous easter eggs survive — straight status codes /
// protocol names were noise. Positions chosen so the labels never share a
// row with any SPACE_LOGOS entry: the funny labels sit at y≈0.78 (above the
// bottom logo row at y≈0.86-0.92) or at y≈-0.20 (between the right-edge
// logos at -0.55 and 0.10).
const SPACE_LABELS: SpaceLabel[] = [
  { text: "git push --force", ndc: [-0.25, 0.78], z: -8, size: 0.24, color: "#ffb27a" },
  { text: "sudo rm -rf /", ndc: [0.42, 0.78], z: -9, size: 0.24, color: "#ffb27a" },
  { text: ":wq", ndc: [0.92, -0.20], z: -10, size: 0.24 },
];

function NdcLabel({ label }: { label: SpaceLabel }) {
  const pos = useWorldFromNdc(label.ndc[0], label.ndc[1], label.z);
  return (
    <Billboard pos={pos}>
      <Text
        fontSize={label.size}
        color={label.color ?? "#9ec9ff"}
        anchorX="center"
        anchorY="middle"
        font="/fonts/JetBrainsMono-Regular.ttf"
        outlineWidth={0.004}
        outlineColor="#000000"
        outlineOpacity={0.6}
        material-transparent
        material-opacity={0.85}
      >
        {label.text}
      </Text>
    </Billboard>
  );
}

function SpaceLabels() {
  return (
    <group>
      {SPACE_LABELS.map((l) => (
        <NdcLabel key={l.text} label={l} />
      ))}
    </group>
  );
}

function Billboard({
  pos,
  children,
}: {
  pos: [number, number, number];
  children: React.ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ camera }) => {
    if (!ref.current) return;
    ref.current.quaternion.copy(camera.quaternion);
  });
  return (
    <group position={pos} ref={ref}>
      {children}
    </group>
  );
}

type SpaceLogo = {
  slug: string;
  ndc: [number, number];
  z: number;
  scale: number;
};

const SPACE_LOGOS: SpaceLogo[] = [
  // Top strip — below the nav, above the headline
  { slug: "prometheus", ndc: [-0.62, -0.72], z: -8, scale: 0.50 },
  { slug: "kubernetes", ndc: [-0.42, -0.66], z: -7, scale: 0.55 },
  { slug: "docker", ndc: [-0.22, -0.70], z: -7, scale: 0.45 },
  { slug: "github", ndc: [-0.04, -0.68], z: -7, scale: 0.40 },
  { slug: "linux", ndc: [0.14, -0.68], z: -7, scale: 0.50 },
  { slug: "helm", ndc: [0.40, -0.72], z: -8, scale: 0.45 },
  { slug: "nodedotjs", ndc: [0.62, -0.72], z: -8, scale: 0.45 },
  // Left strip
  { slug: "argo", ndc: [-0.92, -0.55], z: -9, scale: 0.55 },
  { slug: "go", ndc: [-0.94, 0.20], z: -9, scale: 0.55 },
  { slug: "python", ndc: [-0.88, 0.55], z: -9, scale: 0.50 },
  // Right strip
  { slug: "elasticsearch", ndc: [0.92, -0.55], z: -9, scale: 0.55 },
  { slug: "redis", ndc: [0.95, 0.10], z: -10, scale: 0.55 },
  { slug: "rabbitmq", ndc: [0.90, 0.62], z: -9, scale: 0.50 },
  // Bottom strip
  { slug: "terraform", ndc: [-0.42, 0.86], z: -8, scale: 0.50 },
  { slug: "nginx", ndc: [-0.05, 0.92], z: -9, scale: 0.45 },
  { slug: "grafana", ndc: [0.30, 0.86], z: -8, scale: 0.50 },
  { slug: "ansible", ndc: [0.55, 0.92], z: -9, scale: 0.45 },
  { slug: "cilium", ndc: [0.74, 0.86], z: -8, scale: 0.50 },
  { slug: "postgresql", ndc: [-0.68, 0.92], z: -9, scale: 0.50 },
];

async function svgToTexture(url: string, size = 192): Promise<THREE.Texture> {
  const res = await fetch(url);
  const text = await res.text();
  const blob = new Blob([text], { type: "image/svg+xml" });
  const objUrl = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(objUrl);
        reject(new Error("no 2d context"));
        return;
      }
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(objUrl);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      resolve(tex);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(objUrl);
      reject(e);
    };
    img.src = objUrl;
  });
}

function LogoSprite({ logo }: { logo: SpaceLogo }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const pos = useWorldFromNdc(logo.ndc[0], logo.ndc[1], logo.z);

  useEffect(() => {
    let cancelled = false;
    svgToTexture(`/icons/${logo.slug}.svg`)
      .then((t) => {
        if (!cancelled) setTexture(t);
      })
      .catch(() => {
        /* skip icon if it fails to load */
      });
    return () => {
      cancelled = true;
    };
  }, [logo.slug]);

  if (!texture) return null;
  return (
    <sprite position={pos} scale={[logo.scale, logo.scale, 1]}>
      <spriteMaterial map={texture} transparent opacity={0.9} />
    </sprite>
  );
}

function SpaceLogos() {
  return (
    <group>
      {SPACE_LOGOS.map((l) => (
        <LogoSprite key={l.slug} logo={l} />
      ))}
    </group>
  );
}

function useResponsiveEarthOffset() {
  const { camera, size } = useThree();
  return useMemo(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const vh = 2 * cam.position.z * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const vw = vh * (size.width / size.height);
    const halfW = vw / 2;
    const desired = halfW * 0.30;
    const cap = halfW - RADIUS - 0.25;
    return Math.max(0, Math.min(desired, cap));
  }, [camera, size]);
}

function EarthAssembly({
  rotationRef,
}: {
  rotationRef: React.MutableRefObject<number>;
}) {
  const offsetX = useResponsiveEarthOffset();
  return (
    <group position={[offsetX, 0, 0]}>
      <Earth rotationRef={rotationRef} />
    </group>
  );
}

function Scene({
  overlayRef,
}: {
  overlayRef: React.RefObject<HTMLDivElement | null>;
}) {
  const offsetX = useResponsiveEarthOffset();
  const rotationRef = useRef(INITIAL_ROTATION);
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 1.5, 2]} intensity={1.1} color="#fff5e0" />
      <directionalLight position={[-3, -1, -2]} intensity={0.35} color="#5db7ff" />
      <directionalLight position={[0, 4, 0]} intensity={0.4} color="#5db7ff" />
      <Stars />
      <SpaceLogos />
      <SpaceLabels />
      <EarthAssembly rotationRef={rotationRef} />
      <OsloProjector
        overlayRef={overlayRef}
        offsetX={offsetX}
        rotationRef={rotationRef}
      />
      <Preload all />
    </>
  );
}

export default function InlineGlobeScene({
  overlayRef,
}: {
  overlayRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <Canvas
      camera={{ position: [0, 0.3, 5.5], fov: 50 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%" }}
    >
      <Suspense fallback={null}>
        <Scene overlayRef={overlayRef} />
      </Suspense>
    </Canvas>
  );
}
