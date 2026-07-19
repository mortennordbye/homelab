"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Interactive } from "./interaction";

/**
 * The real homelab, modelled from reference photos of the actual flat.
 *
 * It does not live on a rack or an open shelf. It lives inside a pale oak
 * sideboard in the living room, behind doors, which is both the truth and a
 * better reveal than a shelf: you open something that looks like furniture and
 * find a Kubernetes cluster in it.
 *
 * Dimensions are the real products in metres. Getting relative scale right
 * does more for believability than detail does — a NAS the same size as a
 * network switch reads as toys however well it is shaded.
 */

const PLASTIC_WHITE = { color: "#dcdde0", roughness: 0.44, metalness: 0.04 };
const CHASSIS_BLACK = { color: "#141619", roughness: 0.58, metalness: 0.3 };
const CHASSIS_GREY = { color: "#232629", roughness: 0.52, metalness: 0.42 };

/** Blinking status LED on a deterministic schedule, so it reads as activity. */
function Led({
  position,
  rotation = [0, 0, 0],
  color = "#57d98b",
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
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (steady || !ref.current) return;
    const m = ref.current.material as THREE.MeshBasicMaterial;
    const p = Math.sin(clock.getElapsedTime() * seed + seed * 3.1);
    m.opacity = p > 0.55 ? 1 : p > -0.1 ? 0.4 : 0.08;
  });
  return (
    <mesh ref={ref} position={position} rotation={rotation}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial color={color} transparent opacity={steady ? 0.95 : 0.5} />
    </mesh>
  );
}

/**
 * Lenovo ThinkCentre tiny, stood on edge as they actually are: 183 x 179 x
 * 37mm, so on edge that is 37mm wide and 183mm tall. Three of these run the
 * whole Talos cluster, which is the most surprising fact in the room.
 */
export function ThinkCentre({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  const W = 0.037;
  const H = 0.183;
  const D = 0.179;
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[W, H, D]} radius={0.003} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial {...CHASSIS_GREY} />
      </RoundedBox>
      <mesh position={[0, 0, D / 2 + 0.001]}>
        <planeGeometry args={[W - 0.004, H - 0.006]} />
        <meshStandardMaterial color="#111316" roughness={0.72} metalness={0.25} />
      </mesh>
      {/* the red ThinkCentre stripe */}
      <mesh position={[0, -0.028, D / 2 + 0.002]}>
        <planeGeometry args={[W - 0.008, 0.006]} />
        <meshStandardMaterial color="#b8322c" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.052, D / 2 + 0.003]}>
        <ringGeometry args={[0.0035, 0.0055, 20]} />
        <meshBasicMaterial color="#8fd4ff" transparent opacity={0.85} />
      </mesh>
      <Led position={[0, 0.03, D / 2 + 0.003]} color="#57d98b" seed={2.1} size={0.0035} />
    </group>
  );
}

/** Synology 4-bay NAS: a chunky black cube, the biggest thing in the cabinet. */
export function SynologyNas({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  const W = 0.199;
  const H = 0.166;
  const D = 0.223;
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[W, H, D]} radius={0.007} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial {...CHASSIS_BLACK} />
      </RoundedBox>
      <mesh position={[0, 0, D / 2 + 0.001]}>
        <planeGeometry args={[W - 0.008, H - 0.008]} />
        <meshStandardMaterial color="#0f1114" roughness={0.75} metalness={0.15} />
      </mesh>
      {/* four drive bay seams */}
      {[-0.06, -0.02, 0.02, 0.06].map((x) => (
        <mesh key={x} position={[x, 0, D / 2 + 0.002]}>
          <planeGeometry args={[0.0012, H - 0.03]} />
          <meshStandardMaterial color="#05070a" roughness={0.9} />
        </mesh>
      ))}
      {[0.052, 0.036, 0.02, 0.004].map((y, i) => (
        <Led
          key={y}
          position={[W / 2 - 0.016, y, D / 2 + 0.003]}
          color={i === 0 ? "#8fd4ff" : "#57d98b"}
          seed={0.9 + i * 0.8}
          size={0.0045}
        />
      ))}
    </group>
  );
}

/** UniFi Cloud Gateway Ultra: flat white slab with the U mark on the lid. */
export function CloudGateway({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[0.148, 0.03, 0.111]} radius={0.008} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial {...PLASTIC_WHITE} />
      </RoundedBox>
      <mesh position={[0, 0.0152, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.008, 0.011, 24]} />
        <meshBasicMaterial color="#9aa3ad" transparent opacity={0.75} />
      </mesh>
      <Led position={[0, -0.004, 0.0556]} color="#7fd6ff" seed={1.1} size={0.004} />
    </group>
  );
}

/** UniFi Flex Mini: the tiny 5-port puck. */
export function UnifiFlexMini({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[0.099, 0.022, 0.07]} radius={0.005} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial {...PLASTIC_WHITE} />
      </RoundedBox>
      <mesh position={[0, -0.002, 0.0355]}>
        <planeGeometry args={[0.078, 0.011]} />
        <meshStandardMaterial color="#2b2d31" roughness={0.7} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <Led
          key={i}
          position={[-0.031 + i * 0.0155, 0.008, 0.0356]}
          color="#7fd6ff"
          seed={1.2 + i * 0.7}
          size={0.003}
        />
      ))}
    </group>
  );
}

/** UniFi 8-port switch: longer and flatter, same white plastic family. */
export function UnifiSwitch8({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[0.206, 0.026, 0.104]} radius={0.005} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial {...PLASTIC_WHITE} />
      </RoundedBox>
      <mesh position={[0, -0.003, 0.0525]}>
        <planeGeometry args={[0.172, 0.013]} />
        <meshStandardMaterial color="#2b2d31" roughness={0.7} />
      </mesh>
      {Array.from({ length: 8 }).map((_, i) => (
        <Led
          key={i}
          position={[-0.075 + i * 0.0215, 0.0095, 0.0526]}
          color={i % 3 === 0 ? "#57d98b" : "#7fd6ff"}
          seed={0.8 + i * 0.55}
          size={0.003}
        />
      ))}
    </group>
  );
}

/** The ISP's router: white, vented, stood on its narrow edge. */
export function IspRouter({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[0.052, 0.2, 0.162]} radius={0.014} smoothness={5} castShadow receiveShadow>
        <meshStandardMaterial color="#e6e6e6" roughness={0.5} metalness={0.03} />
      </RoundedBox>
      <mesh position={[0.0265, 0.03, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.12, 0.1]} />
        <meshStandardMaterial color="#dcdcdc" roughness={0.75} />
      </mesh>
      {[0.05, 0.03, 0.01, -0.01, -0.03].map((y, i) => (
        <Led
          key={y}
          position={[0.0272, y, 0.055]}
          rotation={[0, Math.PI / 2, 0]}
          color={i === 0 ? "#57d98b" : "#9aa3ad"}
          seed={0.7 + i * 0.9}
          size={0.0035}
        />
      ))}
    </group>
  );
}

/** Fanless mini PC: the finned aluminium block. Its heatsink is the silhouette. */
export function FanlessBox({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  const fins = useMemo(() => Array.from({ length: 13 }, (_, i) => -0.058 + i * 0.0097), []);
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[0.132, 0.038, 0.126]} radius={0.004} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial color="#17191b" roughness={0.44} metalness={0.68} />
      </RoundedBox>
      {fins.map((x) => (
        <mesh key={x} position={[x, 0.026, 0]} castShadow>
          <boxGeometry args={[0.0042, 0.014, 0.118]} />
          <meshStandardMaterial color="#1c1e21" roughness={0.4} metalness={0.72} />
        </mesh>
      ))}
      <mesh position={[0, -0.004, 0.0632]}>
        <planeGeometry args={[0.11, 0.016]} />
        <meshStandardMaterial color="#0c0e10" roughness={0.8} />
      </mesh>
      <Led position={[-0.046, 0.008, 0.0633]} color="#5aa9e0" seed={1.9} size={0.0032} />
    </group>
  );
}

/** Small smart-home hub puck. */
export function HubPuck({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.037, 0.037, 0.024, 28]} />
        <meshStandardMaterial color="#1b1d20" roughness={0.55} metalness={0.2} />
      </mesh>
      <Led
        position={[0, 0.0125, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        color="#7fd6ff"
        seed={1.5}
        size={0.006}
      />
    </group>
  );
}

/** UniFi access point, lying flat on the cabinet top as it actually does. */
export function UnifiAccessPoint({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.088, 0.088, 0.021, 36]} />
        <meshStandardMaterial {...PLASTIC_WHITE} />
      </mesh>
      <mesh position={[0, 0.0107, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.026, 0.034, 32]} />
        <meshBasicMaterial color="#c9ced4" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.0108, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.0335, 0.0365, 32]} />
        <meshBasicMaterial color="#7fd6ff" transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** One hinged cabinet door, swinging about its outer edge. */
function Door({
  hingeX,
  width,
  height,
  open,
  /** -1 hinges on the left, +1 on the right. */
  swing,
}: {
  hingeX: number;
  width: number;
  height: number;
  open: boolean;
  swing: number;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, d) => {
    if (!ref.current) return;
    const target = open ? swing * -2.0 : 0;
    ref.current.rotation.y = THREE.MathUtils.damp(ref.current.rotation.y, target, 4.5, d);
  });
  return (
    <group ref={ref} position={[hingeX, 0, 0]}>
      <RoundedBox
        position={[(width / 2) * -swing, 0, 0]}
        args={[width, height, 0.018]}
        radius={0.003}
        smoothness={3}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#b39a72" roughness={0.66} />
      </RoundedBox>
    </group>
  );
}

/** The sideboard. Looks like living-room furniture until you open it. */
export function Sideboard({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  const [open, setOpen] = useState(false);

  const W = 1.92;
  const H = 0.6;
  const D = 0.45;
  const LEG = 0.11;
  const bodyH = H - LEG;
  const bodyY = LEG + bodyH / 2;
  const floorY = LEG + 0.02;

  const oak = { color: "#b39a72", roughness: 0.66, metalness: 0 };
  const oakDark = { color: "#9d8763", roughness: 0.74, metalness: 0 };

  return (
    <group position={position} rotation={rotation}>
      {/* Carcass built from panels, open at the front. A solid box would look
          identical closed and reveal nothing when the doors swing. */}
      {/* back */}
      <mesh position={[0, bodyY, -D / 2 - 0.012]} receiveShadow castShadow>
        <boxGeometry args={[W, bodyH, 0.018]} />
        <meshStandardMaterial {...oakDark} />
      </mesh>
      {/* bottom */}
      <mesh position={[0, LEG + 0.009, -0.012]} receiveShadow castShadow>
        <boxGeometry args={[W, 0.018, D]} />
        <meshStandardMaterial {...oakDark} />
      </mesh>
      {/* top of the cavity */}
      <mesh position={[0, H - 0.009, -0.012]} receiveShadow castShadow>
        <boxGeometry args={[W, 0.018, D]} />
        <meshStandardMaterial {...oakDark} />
      </mesh>
      {/* sides */}
      {[-W / 2 + 0.009, W / 2 - 0.009].map((x) => (
        <mesh key={x} position={[x, bodyY, -0.012]} receiveShadow castShadow>
          <boxGeometry args={[0.018, bodyH, D]} />
          <meshStandardMaterial {...oakDark} />
        </mesh>
      ))}
      {/* top slab, slightly proud */}
      <RoundedBox
        position={[0, H + 0.008, 0]}
        args={[W + 0.03, 0.026, D + 0.03]}
        radius={0.004}
        smoothness={3}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial {...oak} />
      </RoundedBox>
      {/* legs */}
      {[-W / 2 + 0.09, W / 2 - 0.09].map((x) =>
        [-D / 2 + 0.08, D / 2 - 0.08].map((z) => (
          <mesh key={`${x}:${z}`} position={[x, LEG / 2, z]} castShadow>
            <boxGeometry args={[0.035, LEG, 0.035]} />
            <meshStandardMaterial {...oak} />
          </mesh>
        )),
      )}
      {/* interior floor and dividers, so the inside reads as compartments */}
      {[-0.32, 0.32].map((x) => (
        <mesh key={x} position={[x, bodyY, -0.012]} receiveShadow>
          <boxGeometry args={[0.018, bodyH - 0.06, D - 0.05]} />
          <meshStandardMaterial color="#a8926c" roughness={0.75} />
        </mesh>
      ))}

      {/* the kit, laid out left to right as in the photos */}
      <ThinkCentre position={[-0.78, floorY + 0.0915, 0.02]} />
      <ThinkCentre position={[-0.72, floorY + 0.0915, 0.02]} />
      <ThinkCentre position={[-0.66, floorY + 0.0915, 0.02]} />
      <IspRouter position={[-0.44, floorY + 0.1, 0.01]} />

      <CloudGateway position={[-0.16, floorY + 0.015, 0.03]} />
      <FanlessBox position={[0.09, floorY + 0.019, -0.02]} />
      <UnifiFlexMini position={[0.16, floorY + 0.011, 0.12]} />

      <SynologyNas position={[0.68, floorY + 0.083, -0.02]} />
      <UnifiSwitch8 position={[0.44, floorY + 0.013, 0.09]} />
      <HubPuck position={[0.46, floorY + 0.012, -0.11]} />

      {/* Doors are visuals only. The interaction target is a fixed invisible
          face across the cabinet front: once the doors swing away they are no
          longer under the crosshair, so hanging the interaction on them would
          leave an open cabinet you cannot close. */}
      <group position={[0, bodyY, D / 2 + 0.002]}>
        <Door hingeX={-W / 2 + 0.01} width={W / 3 - 0.012} height={bodyH - 0.02} open={open} swing={-1} />
        <Door hingeX={-W / 6 + 0.004} width={W / 3 - 0.012} height={bodyH - 0.02} open={open} swing={-1} />
        <Door hingeX={W / 2 - 0.01} width={W / 3 - 0.012} height={bodyH - 0.02} open={open} swing={1} />
      </group>

      <Interactive
        label="the cabinet"
        verb={open ? "close" : "open"}
        onActivate={() => setOpen((v) => !v)}
      >
        <mesh position={[0, bodyY, D / 2 + 0.01]} visible={false}>
          <boxGeometry args={[W, bodyH, 0.05]} />
          <meshBasicMaterial />
        </mesh>
      </Interactive>

      {/* access point on top, flat, where a TV would sit in front of it */}
      <UnifiAccessPoint position={[0.62, H + 0.032, -0.1]} />
    </group>
  );
}
