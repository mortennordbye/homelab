"use client";

import { RoundedBox } from "@/components/scene/RoundedBox";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { DEVICE, HOUSE, type HouseDevice } from "@/content/hardware";
import { at } from "./flat";
import type { InfoCard } from "./Hud";
import { Interactive } from "./interaction";
import { MERGE_STATIC } from "./StaticMerge";
import { Sonos } from "./Sonos";
import { Television } from "./Furniture";
import { OAK } from "@/components/materials/oak";

/**
 * The real homelab, modelled from reference photos of the actual flat, in an
 * open-fronted oak sideboard — never hide the one thing the room exists to
 * show. Dimensions are the real products in metres: relative scale does more
 * for believability than detail.
 */

const PLASTIC_WHITE = { color: "#dcdde0", roughness: 0.44, metalness: 0.04 };
const CHASSIS_BLACK = { color: "#141619", roughness: 0.58, metalness: 0.3 };
const CHASSIS_GREY = { color: "#232629", roughness: 0.52, metalness: 0.42 };

/** Blinking status LED on a deterministic schedule, so it reads as activity. */
function Led({
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
        <meshBasicMaterial color="#81bccf" transparent opacity={0.85} />
      </mesh>
      <Led position={[0, 0.03, D / 2 + 0.003]} color="#7fc48c" seed={2.1} size={0.0035} />
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
          color={i === 0 ? "#81bccf" : "#7fc48c"}
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
      <Led position={[0, -0.004, 0.0556]} color="#81b288" seed={1.1} size={0.004} />
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
          color="#81b288"
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
          color={i % 3 === 0 ? "#7fc48c" : "#81b288"}
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
          color={i === 0 ? "#7fc48c" : "#9aa3ad"}
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
        color="#81b288"
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
        <meshBasicMaterial color="#81b288" transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

type Placed = {
  position: [number, number, number];
  rotation?: [number, number, number];
};

/** Nabu Casa ZBT-2: a white upright stick on its USB lead, LED at the top. */
export function ZigbeeStick({ position, rotation = [0, 0, 0] }: Placed) {
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox position={[0, 0.047, 0]} args={[0.03, 0.09, 0.018]} radius={0.007} smoothness={4} castShadow>
        <meshStandardMaterial {...PLASTIC_WHITE} />
      </RoundedBox>
      <mesh position={[0, 0.004, 0]}>
        <boxGeometry args={[0.04, 0.008, 0.03]} />
        <meshStandardMaterial color="#cfd0d3" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.006, -0.035]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.0022, 0.0022, 0.05, 8]} />
        <meshStandardMaterial color="#e2e2e2" roughness={0.6} />
      </mesh>
      <Led position={[0, 0.082, 0.0095]} color="#81bccf" steady size={0.004} />
    </group>
  );
}

/** M5Stack Atom Lite: a 24mm dark cube, its whole top a pale button. */
export function AtomLite({ position, rotation = [0, 0, 0] }: Placed) {
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox position={[0, 0.012, 0]} args={[0.024, 0.024, 0.01]} radius={0.002} smoothness={3}>
        <meshStandardMaterial color="#2a2d31" roughness={0.6} metalness={0.1} />
      </RoundedBox>
      <RoundedBox position={[0, 0.012, 0.005]} args={[0.019, 0.019, 0.002]} radius={0.0015} smoothness={3}>
        <meshStandardMaterial color="#d6d8da" roughness={0.45} />
      </RoundedBox>
      <Led position={[0, 0.012, 0.0062]} color="#81bccf" seed={2.6} size={0.004} />
      {/* USB-C lead, out of the bottom and back to the wall */}
      <mesh position={[0, 0.0015, -0.03]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.0018, 0.0018, 0.06, 8]} />
        <meshStandardMaterial color="#e2e2e2" roughness={0.6} />
      </mesh>
    </group>
  );
}

/**
 * Where the security camera looks from: its local +z is the view direction.
 * One camera in the flat, so one shared object that the camera view reads.
 */
export const CCTV_LENS = new THREE.Object3D();

/** UniFi G6 Instant: a white cube with a black glass face round the lens, on a foot. */
export function G6Instant({ position, rotation = [0, 0, 0], tilt = 0 }: Placed & {
  /** Radians about x; positive tips the lens down. */
  tilt?: number;
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.006, 0]} castShadow>
        <cylinderGeometry args={[0.022, 0.024, 0.012, 24]} />
        <meshStandardMaterial {...PLASTIC_WHITE} />
      </mesh>
      <mesh position={[0, 0.018, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.014, 12]} />
        <meshStandardMaterial {...PLASTIC_WHITE} />
      </mesh>
      <group position={[0, 0.052, 0]} rotation={[tilt, 0, 0]}>
        <RoundedBox args={[0.054, 0.054, 0.042]} radius={0.009} smoothness={4} castShadow>
          <meshStandardMaterial {...PLASTIC_WHITE} />
        </RoundedBox>
        <RoundedBox position={[0, 0, 0.0195]} args={[0.046, 0.046, 0.004]} radius={0.007} smoothness={3}>
          <meshStandardMaterial color="#0d0f12" roughness={0.12} metalness={0.4} />
        </RoundedBox>
        <mesh position={[0, 0.002, 0.0222]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.0085, 0.0085, 0.002, 24]} />
          <meshStandardMaterial color="#1d2a33" roughness={0.05} metalness={0.8} />
        </mesh>
        <Led position={[0, -0.016, 0.0225]} color="#81bccf" steady size={0.003} />
        <primitive object={CCTV_LENS} position={[0, 0.002, 0.03]} />
      </group>
    </group>
  );
}

/** Home Assistant Voice PE: an 85mm grey square with a dial and an LED ring on top. */
export function VoicePe({ position, rotation = [0, 0, 0] }: Placed) {
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox position={[0, 0.0115, 0]} args={[0.085, 0.023, 0.085]} radius={0.01} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial color="#3a3d42" roughness={0.62} metalness={0.05} />
      </RoundedBox>
      <mesh position={[0, 0.024, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.026, 0.03, 40]} />
        <meshBasicMaterial color="#81bccf" transparent opacity={0.55} />
      </mesh>
      <mesh position={[0, 0.025, 0]}>
        <cylinderGeometry args={[0.024, 0.024, 0.004, 32]} />
        <meshStandardMaterial color="#2b2e32" roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh position={[0.03, 0.0235, 0.03]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.004, 16]} />
        <meshStandardMaterial color="#1a1c1f" roughness={0.7} />
      </mesh>
    </group>
  );
}

/** Aqara T1 climate sensor: a 36mm white square, stuck to the wall. Front is +z. */
export function AqaraClimate({ position, rotation = [0, 0, 0] }: Placed) {
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[0.036, 0.036, 0.0095]} radius={0.004} smoothness={3}>
        <meshStandardMaterial {...PLASTIC_WHITE} />
      </RoundedBox>
      <mesh position={[0, -0.011, 0.0049]}>
        <planeGeometry args={[0.01, 0.0025]} />
        <meshStandardMaterial color="#b9bcc0" roughness={0.6} />
      </mesh>
    </group>
  );
}

/** Aqara vibration sensor T1: a small white tablet, upright. Front is +z. */
export function AqaraVibration({ position, rotation = [0, 0, 0] }: Placed) {
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[0.03, 0.046, 0.012]} radius={0.005} smoothness={3}>
        <meshStandardMaterial {...PLASTIC_WHITE} />
      </RoundedBox>
      <Led position={[0, 0.016, 0.0062]} color="#81bccf" seed={3.3} size={0.0025} />
    </group>
  );
}

/** Aqara T1 contact sensor: the sensor on the frame and its magnet on the leaf beside it. */
export function AqaraContact({ position, rotation = [0, 0, 0], gap = 0.03, step = 0 }: Placed & {
  /** Centre to centre, along local x, from the sensor to the magnet. */
  gap?: number;
  /** How far the magnet sits forward (+z) of the sensor, for a leaf proud of its frame. */
  step?: number;
}) {
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[0.022, 0.041, 0.011]} radius={0.004} smoothness={3}>
        <meshStandardMaterial {...PLASTIC_WHITE} />
      </RoundedBox>
      <RoundedBox position={[gap, 0, step]} args={[0.012, 0.03, 0.011]} radius={0.003} smoothness={3}>
        <meshStandardMaterial {...PLASTIC_WHITE} />
      </RoundedBox>
    </group>
  );
}

/** Aqara T1 leak sensor: a 50mm white puck on its probes, a drop on the lid. */
export function AqaraLeak({ position, rotation = [0, 0, 0] }: Placed) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.011, 0]}>
        <cylinderGeometry args={[0.025, 0.026, 0.018, 32]} />
        <meshStandardMaterial {...PLASTIC_WHITE} />
      </mesh>
      <mesh position={[0, 0.0202, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.005, 16]} />
        <meshStandardMaterial color="#9aa3ad" roughness={0.6} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[Math.cos(i * 2.1) * 0.017, 0.001, Math.sin(i * 2.1) * 0.017]}>
          <cylinderGeometry args={[0.002, 0.002, 0.002, 8]} />
          <meshStandardMaterial color="#b9bcc0" roughness={0.3} metalness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/** What the room needs to name and card a device. */
export type Inspected = HouseDevice;

/** The device's card with where it stands in the flat as its last row. */
function located(hw: Inspected, where: string): Inspected {
  return { ...hw, facts: [...hw.facts, ["location", where]] };
}

/**
 * Wraps a device so looking at it names it.
 *
 * The wrapper sits here rather than inside each device component so the models
 * stay pure geometry and every device gets identified the same way. Adding a
 * device to the sideboard and forgetting to label it should look obviously
 * wrong at the call site.
 */
function Inspectable({
  hw,
  onInspect,
  children,
}: {
  hw: Inspected;
  onInspect: (hw: Inspected) => void;
  children: React.ReactNode;
}) {
  return (
    <Interactive
      label={hw.model}
      verb="inspect"
      detail={hw.tag}
      onActivate={() => onInspect(hw)}
    >
      {/* Devices are pure geometry; their blinking LEDs are basic materials,
          which the merge never takes. */}
      <group userData={MERGE_STATIC}>{children}</group>
    </Interactive>
  );
}

/**
 * Where the television stands on the cabinet top, in the cabinet's own frame.
 * Exported because the dashboard on its glass is placed from Room.tsx, which is
 * the only file that knows where the cabinet itself stands.
 */
export const SIDEBOARD_H = 0.42;
export const SIDEBOARD_TV: [number, number, number] = [-0.08, SIDEBOARD_H + 0.021, 0];

const LEFT_BAY = "Living room, TV bench, left bay";
const MIDDLE_BAY = "Living room, TV bench, middle bay";
const RIGHT_BAY = "Living room, TV bench, right bay";

/** The sideboard: an open-fronted oak unit with the homelab living in it. */
export function Sideboard({
  position,
  rotation = [0, 0, 0],
  onInspect,
  onOpenCard,
  onWatch,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  onInspect: (hw: Inspected) => void;
  onOpenCard: (card: InfoCard) => void;
  /** Looking through the security camera. */
  onWatch: () => void;
}) {

  // The real cabinet, at the size /infrastructure models it: a BESTÅ at
  // 180 x 42 x 38 with three bays. The television stands on it, because in the
  // flat the TV bench and the homelab are the same piece of furniture.
  const W = 1.8;
  const H = SIDEBOARD_H;
  const D = 0.42;
  const LEG = 0.06;
  const bodyH = H - LEG;
  const bodyY = LEG + bodyH / 2;
  const floorY = LEG + 0.02;

  // The same plank as every other oak surface in the flat.
  const oak = { color: OAK.case, roughness: 0.64, metalness: 0 };
  const oakDark = { color: OAK.carcass, roughness: 0.72, metalness: 0 };

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
      {[-0.297, 0.297].map((x) => (
        <mesh key={x} position={[x, bodyY, -0.012]} receiveShadow>
          <boxGeometry args={[0.018, bodyH - 0.06, D - 0.05]} />
          <meshStandardMaterial color={OAK.back} roughness={0.75} />
        </mesh>
      ))}

      {/* The kit, laid out left to right as in the photos. Names and specs come
          from the README hardware tables via ./hardware — the three ThinkCentres
          are three different machines, so they are labelled individually rather
          than as "a ThinkCentre" three times. */}
      <Inspectable hw={located(DEVICE.hyper1, LEFT_BAY)} onInspect={onInspect}>
        <ThinkCentre position={[-0.78, floorY + 0.0915, 0.02]} />
      </Inspectable>
      <Inspectable hw={located(DEVICE.hyper2, LEFT_BAY)} onInspect={onInspect}>
        <ThinkCentre position={[-0.72, floorY + 0.0915, 0.02]} />
      </Inspectable>
      <Inspectable hw={located(DEVICE.hyper3, LEFT_BAY)} onInspect={onInspect}>
        <ThinkCentre position={[-0.66, floorY + 0.0915, 0.02]} />
      </Inspectable>
      <Inspectable hw={located(DEVICE.modem, LEFT_BAY)} onInspect={onInspect}>
        <IspRouter position={[-0.44, floorY + 0.1, 0.01]} />
      </Inspectable>

      <Inspectable hw={located(DEVICE.gateway, MIDDLE_BAY)} onInspect={onInspect}>
        <CloudGateway position={[-0.16, floorY + 0.015, 0.03]} />
      </Inspectable>
      <Inspectable hw={located(DEVICE.ha, MIDDLE_BAY)} onInspect={onInspect}>
        <FanlessBox position={[0.09, floorY + 0.019, -0.02]} />
      </Inspectable>
      <Inspectable hw={located(HOUSE.flexMini, MIDDLE_BAY)} onInspect={onInspect}>
        <UnifiFlexMini position={[0.16, floorY + 0.011, 0.12]} />
      </Inspectable>
      <Inspectable hw={located(DEVICE.zigbee, MIDDLE_BAY)} onInspect={onInspect}>
        <ZigbeeStick position={[-0.045, floorY, 0.1]} />
      </Inspectable>

      <Inspectable hw={located(DEVICE.nas, RIGHT_BAY)} onInspect={onInspect}>
        <SynologyNas position={[0.68, floorY + 0.083, -0.02]} />
      </Inspectable>
      <Inspectable hw={located(DEVICE.switch, RIGHT_BAY)} onInspect={onInspect}>
        <UnifiSwitch8 position={[0.44, floorY + 0.013, 0.09]} />
      </Inspectable>
      {/* Clear of the 8-port switch rather than tucked in behind it. Sat at
          x 0.46 it was permanently occluded by the switch at 0.44, so the
          crosshair could never land on it and it was the one device in the
          room you could not name. Anything given a label has to be lookable
          at from where a visitor can actually stand. */}
      <Inspectable hw={located(DEVICE.hue, RIGHT_BAY)} onInspect={onInspect}>
        <HubPuck position={[0.26, floorY + 0.012, -0.09]} />
      </Inspectable>

      {/* access point on top, flat, where a TV would sit in front of it */}
      <Inspectable hw={located(DEVICE.ap, "Living room, on top of the TV bench")} onInspect={onInspect}>
        <UnifiAccessPoint position={[0.62, H + 0.032, -0.1]} />
      </Inspectable>

      {/* Between the access point and the Sonos, tipped up at whoever stands
          in front of the bench. Pressing it looks through it rather than
          opening a spec sheet. */}
      <Interactive label={HOUSE.camera.model} verb="look through" detail={HOUSE.camera.tag} onActivate={onWatch}>
        <group userData={MERGE_STATIC}>
          <G6Instant position={[0.75, H + 0.021, 0.04]} rotation={[0, -0.45, 0]} tilt={-0.22} />
        </group>
      </Interactive>

      {/* The Sonos, on the free end of the top past the television.
          Not an <Inspectable>: it owns its own label and card because pressing
          it plays something rather than opening a spec sheet.
          Placed at x 0.85 rather than tucked beside the access point at 0.62,
          which the two of them would fight over — the access point has been
          occluded once already and is not being buried a second time. */}
      <Sonos position={[0.85, H + 0.021, 0.1]} onOpen={onOpenCard} />

      {/* The television on the cabinet top. Its stand is centred; the access
          point and the speaker sit either side of it, under the panel. */}
      <Television position={SIDEBOARD_TV} />
    </group>
  );
}

/** A device too small to aim at, given an invisible pick box around it. */
function Spot({
  position,
  rotation = [0, 0, 0],
  hit,
  children,
}: Placed & { hit: [number, number, number]; children: React.ReactNode }) {
  return (
    <group position={position} rotation={rotation}>
      {children}
      {/* The `visible` prop keeps it out of the merge; picking ignores it. */}
      <mesh visible={false}>
        <boxGeometry args={hit} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
}

const ORIGIN: [number, number, number] = [0, 0, 0];

/**
 * The README's smart-home kit, each where it stands in the flat. Placed in
 * plan metres like the furniture, against surfaces Room.tsx builds: wall
 * faces, the bedroom sill, the kitchen peninsula, the cupboard under the sink and the front door's casing.
 */
export function HouseDevices({ onInspect }: { onInspect: (hw: Inspected) => void }) {
  const H = Math.PI / 2;
  return (
    <>
      <Inspectable hw={located(HOUSE.voice, "Kitchen, on the peninsula")} onInspect={onInspect}>
        <Spot position={at(2.6, 0.898, 4.3)} rotation={[0, 0.3, 0]} hit={[0.1, 0.06, 0.1]}>
          <VoicePe position={ORIGIN} />
        </Spot>
      </Inspectable>
      <Inspectable hw={located(HOUSE.bleProxy, "Bedroom, on the window sill")} onInspect={onInspect}>
        <Spot position={at(4.55, 1.05, 0.05)} hit={[0.06, 0.06, 0.05]}>
          <AtomLite position={ORIGIN} />
        </Spot>
      </Inspectable>

      {/* Wall-mounted sensors: each faces into its room, its back on the wall face. */}
      <Inspectable hw={located(HOUSE.climate, "Living room, by the bedroom door")} onInspect={onInspect}>
        <Spot position={at(3.895, 1.5, 0.15)} rotation={[0, -H, 0]} hit={[0.07, 0.07, 0.03]}>
          <AqaraClimate position={ORIGIN} />
        </Spot>
      </Inspectable>
      <Inspectable hw={located(HOUSE.climate, "Bedroom, over the bed")} onInspect={onInspect}>
        <Spot position={at(4.45, 1.5, 2.695)} rotation={[0, Math.PI, 0]} hit={[0.07, 0.07, 0.03]}>
          <AqaraClimate position={ORIGIN} />
        </Spot>
      </Inspectable>
      <Inspectable hw={located(HOUSE.climate, "Bathroom, on the north wall")} onInspect={onInspect}>
        <Spot position={at(5.3, 1.5, 2.805)} hit={[0.07, 0.07, 0.03]}>
          <AqaraClimate position={ORIGIN} />
        </Spot>
      </Inspectable>
      <Inspectable hw={located(HOUSE.vibration, "Living room, on the window's glazing bar")} onInspect={onInspect}>
        <Spot position={at(2.45, 1.2, 0.036)} hit={[0.05, 0.07, 0.03]}>
          <AqaraVibration position={ORIGIN} />
        </Spot>
      </Inspectable>
      {/* Sensor on the casing at the latch side, magnet on the leaf, which
          stands 17.5mm proud of the casing. */}
      <Inspectable hw={located(HOUSE.contact, "Entré, on the front door")} onInspect={onInspect}>
        <Spot position={at(6.165, 1.85, 6.0465)} rotation={[0, Math.PI, 0]} hit={[0.08, 0.07, 0.04]}>
          <AqaraContact position={ORIGIN} gap={0.085} step={0.0175} />
        </Spot>
      </Inspectable>
      {/* On the floor of the sink cupboard, clear of the stock in it: only
          seen with the door open. */}
      <Inspectable hw={located(HOUSE.leak, "Kitchen, under the sink")} onInspect={onInspect}>
        <Spot position={at(3.45, 0.1, 2.38)} hit={[0.08, 0.05, 0.08]}>
          <AqaraLeak position={ORIGIN} />
        </Spot>
      </Inspectable>
    </>
  );
}
