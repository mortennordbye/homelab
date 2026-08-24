"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, RoundedBox, useTexture } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { NodeState } from "./hardware";
import { HOSTS } from "./hardware";

/**
 * The homelab as it actually stands: a BESTÅ at its real 180 x 42 x 38 with
 * three bays, and the set on top carrying the node status.
 *
 * The one liberty taken with the truth is the wood. The real cabinet is
 * white-stained oak, and a pale laminate carcass is the exact register
 * `branding/DECISIONS.md` rules out, so this keeps the geometry and cuts it
 * from the site's dark oak instead.
 *
 * The division of labour between the lights and the screen is deliberate and
 * is the reason both exist. Each machine's power button says the *box* is
 * powered. The screen says which *node* is Ready, which is a different fact —
 * a host can be up with a node NotReady — plus the versions and the ArgoCD
 * verdict, none of which a lamp can carry.
 *
 * Clicking a device is depth, not a toll gate: everything the object has to
 * say about the cluster is on the screen before anyone touches it, and a click
 * only adds the spec of the box you pointed at. The keyboard path to the same
 * information lives in the panel outside the canvas, because a canvas has none
 * of its own.
 */

/* One unit is 10 cm.
   A ThinkCentre Tiny is 179 x 182.9 x 36.5 mm. Stood upright in its printed
   stand, the face it shows is 36.5 mm across and 179 mm tall — nearly all of
   the machine is depth, which is why the camera sits off axis.
   A DS1522+ is 166 x 230 x 223 mm and is the largest thing in the frame. */
const T_W = 0.365, T_H = 1.79, T_D = 1.83;
const N_W = 2.3, N_H = 1.66, N_D = 2.23;

const BENCH_W = 18, BENCH_D = 4.2, BENCH_H = 3.8, PANEL = 0.16;
const BAY_W = (BENCH_W - 4 * PANEL) / 3;
const BAY_X = [-(BAY_W + PANEL), 0, BAY_W + PANEL];
const FLOOR = PANEL / 2;
const Z_BACK = -BENCH_D / 2 + PANEL;
const LEG_H = 0.95;

const TV_W = 8.4;
const SCREEN_PX_W = 1280, SCREEN_PX_H = 720;
const TV_H = TV_W * (SCREEN_PX_H / SCREEN_PX_W);

/** How a node reads on the set. The machines themselves only show power. */
type NodeStatus = "ready" | "notReady" | "unschedulable";

/* -------------------------------------------------------------------------
   Surfaces
------------------------------------------------------------------------- */

function useSurface(name: string, repeat: [number, number]) {
  const loaded = useTexture([
    `/textures/shelf/${name}_diff.webp`,
    `/textures/shelf/${name}_nor.webp`,
    `/textures/shelf/${name}_arm.webp`,
  ]) as THREE.Texture[];

  return useMemo(() => {
    const prep = (src: THREE.Texture, colour: boolean) => {
      const t = src.clone();
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeat[0], repeat[1]);
      t.colorSpace = colour ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.anisotropy = 8;
      t.needsUpdate = true;
      return t;
    };
    // metalness is deliberately not fed from the ARM map: its blue channel
    // turns the veneer into foil.
    return {
      map: prep(loaded[0], true),
      normalMap: prep(loaded[1], false),
      roughnessMap: prep(loaded[2], false),
    };
  }, [loaded, repeat[0], repeat[1]]); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * A perforated panel as a texture rather than geometry. The Tiny's front is
 * mostly holes and punching a few hundred as meshes would cost more than
 * everything else in the scene put together.
 */
function perforation(cols: number, rows: number) {
  const cell = 16;
  const c = document.createElement("canvas");
  c.width = cols * cell;
  c.height = rows * cell;
  const g = c.getContext("2d")!;
  g.fillStyle = "#b9b4ae";
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = "#0d0c0b";
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const ox = (y % 2) * cell * 0.5;
      g.beginPath();
      g.arc(x * cell + cell / 2 + ox, y * cell + cell / 2, cell * 0.29, 0, Math.PI * 2);
      g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/**
 * Fine surface noise as a normal map. Colour-only procedural surfaces read as
 * flat-shaded boxes — every point on a face takes the light identically and the
 * eye stops believing it is a material. This is the cheapest fix: no second
 * asset, and enough microstructure that a moulded plastic lid varies across
 * its own width.
 */
function buildMicroNormal() {
  const N = 128;
  const c = document.createElement("canvas");
  c.width = N;
  c.height = N;
  const g = c.getContext("2d")!;
  const img = g.createImageData(N, N);
  // A deterministic hash rather than Math.random, so the map is identical on
  // every mount and two devices never disagree about their own finish.
  const h = (x: number, y: number) => {
    const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return v - Math.floor(v);
  };
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = (y * N + x) * 4;
      const dx = (h(x + 1, y) - h(x - 1, y)) * 0.5;
      const dy = (h(x, y + 1) - h(x, y - 1)) * 0.5;
      img.data[i] = 128 + dx * 46;
      img.data[i + 1] = 128 - dy * 46;
      img.data[i + 2] = 255;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

let microCache: THREE.Texture | null = null;
function microNormal() {
  if (!microCache) microCache = buildMicroNormal();
  return microCache;
}

/**
 * An engraved brass plate, ported from the portfolio shelf's own
 * `shelfPlateMaterial` so the two objects letter identically. Not full metal,
 * for the reason the shelf records: a mirror finish in a dim room reads as a
 * dark smear, so this is a brighter scattered alloy, lightly self-lit through
 * the same mask so the engraving reads where the key does not reach.
 */
function plateMaterial(text: string) {
  const c = document.createElement("canvas");
  c.width = 768;
  c.height = 88;
  const x = c.getContext("2d")!;
  x.fillStyle = "#fff";
  x.font = '38px "Fragment Mono", ui-monospace, monospace';
  x.textAlign = "center";
  x.textBaseline = "middle";
  const chars = [...text.toUpperCase()];
  const sp = 6;
  const total = chars.reduce((a, ch) => a + x.measureText(ch).width + sp, -sp);
  let cx = 384 - total / 2;
  chars.forEach((ch) => {
    const w = x.measureText(ch).width;
    x.fillText(ch, cx + w / 2, 46);
    cx += w + sp;
  });
  x.globalAlpha = 0.5;
  x.lineWidth = 3;
  x.strokeStyle = "#fff";
  x.strokeRect(8, 8, 752, 72);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return new THREE.MeshStandardMaterial({
    map: t,
    alphaMap: t,
    emissive: new THREE.Color("#c9a05a"),
    emissiveMap: t,
    emissiveIntensity: 0.85,
    transparent: true,
    color: new THREE.Color("#e8c98c"),
    metalness: 0.55,
    roughness: 0.34,
    envMapIntensity: 1,
  });
}

/** Each bay carries its own name, which is the shelf's move: the split between
    network, storage and compute becomes a property of the object rather than
    something you operate a control to discover. */
const BAY_LABELS = ["network", "storage", "compute"];

function BayPlates() {
  const mats = useMemo(() => BAY_LABELS.map(plateMaterial), []);
  return (
    <>
      {mats.map((m, i) => (
        <mesh key={BAY_LABELS[i]} position={[BAY_X[i], FLOOR + 0.30, BENCH_D / 2 + 0.04]}>
          <planeGeometry args={[4.0, 0.5]} />
          <primitive object={m} attach="material" />
        </mesh>
      ))}
    </>
  );
}

/* -------------------------------------------------------------------------
   The set
------------------------------------------------------------------------- */

type Feed = {
  nodes: NodeState[];
  argocd: { sync: string; health: string };
  versions: { kubernetes?: string; talos?: string };
  stale: boolean;
};

type Pick = {
  selected: string | null;
  onSelect: (id: string) => void;
};

/**
 * Wraps one device so it can be pointed at. Selecting nudges it towards the
 * camera rather than tinting or outlining it: the scene is lit by one warm key
 * and a highlight colour would be the only thing in frame not obeying that,
 * which is how a render starts looking like a game.
 */
function Pickable({
  id, position, pick, children, lift = 0.3, hit, hitOffset,
}: {
  id: string;
  position: [number, number, number];
  pick: Pick;
  children: React.ReactNode;
  lift?: number;
  /**
   * An invisible box that takes the click instead of the geometry. A dongle is
   * a few pixels tall on screen and a switch is a thin slab; both were
   * effectively unclickable without this. `colorWrite={false}` rather than
   * `visible={false}`, because the raycaster skips invisible objects entirely.
   */
  hit?: [number, number, number];
  hitOffset?: [number, number, number];
}) {
  const { invalidate } = useThree();
  const active = pick.selected === id;

  return (
    <group
      position={[position[0], position[1], position[2] + (active ? lift : 0)]}
      onClick={(e) => {
        e.stopPropagation();
        pick.onSelect(id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
        invalidate();
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
        invalidate();
      }}
    >
      {children}
      {hit && (
        <mesh position={hitOffset ?? [0, 0, 0]}>
          <boxGeometry args={hit} />
          <meshBasicMaterial colorWrite={false} depthWrite={false} transparent opacity={0} />
        </mesh>
      )}
    </group>
  );
}

/**
 * Palette is the fun room's monitor verbatim, so the two screens on the site
 * are the same screen: #0d160f ground, #cfe1d2 body, #65a16e accent.
 */
function drawScreen(ctx: CanvasRenderingContext2D, feed: Feed) {
  const W = SCREEN_PX_W, H = SCREEN_PX_H;

  const grad = ctx.createLinearGradient(0, 0, W * 0.4, H);
  grad.addColorStop(0, "#0d160f");
  grad.addColorStop(0.55, "#0a110b");
  grad.addColorStop(1, "#080e09");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const mono = (px: number) => `${px}px "Fragment Mono", ui-monospace, monospace`;
  ctx.textBaseline = "middle";

  ctx.fillStyle = "#65a16e";
  ctx.font = mono(40);
  ctx.textAlign = "left";
  ctx.fillText("G E N E S I S", 64, 68);

  ctx.textAlign = "right";
  ctx.fillStyle = feed.stale ? "#c4832a" : "#65a16e";
  ctx.font = mono(30);
  ctx.fillText(feed.stale ? "stale" : "live", W - 64, 68);

  ctx.strokeStyle = "#202e23";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(64, 112);
  ctx.lineTo(W - 64, 112);
  ctx.stroke();

  let y = 172;
  let ready = 0;
  HOSTS.forEach((host) => {
    ctx.textAlign = "left";
    ctx.font = mono(32);
    ctx.fillStyle = "#cfe1d2";
    ctx.fillText(host.host, 64, y + 22);
    ctx.font = mono(22);
    ctx.fillStyle = "#465548";
    ctx.fillText(host.model, 230, y + 22);

    host.nodes.forEach((name, j) => {
      const state = feed.nodes.find((n) => n.name === name);
      const ry = y + j * 44;
      const status: NodeStatus = !state
        ? "notReady"
        : !state.ready
          ? "notReady"
          : state.schedulable === false
            ? "unschedulable"
            : "ready";
      if (status === "ready") ready++;

      ctx.font = mono(26);
      ctx.fillStyle = "#8fa392";
      ctx.textAlign = "left";
      ctx.fillText(name.replace("genesis-", ""), 560, ry);

      ctx.textAlign = "right";
      ctx.fillStyle =
        status === "ready" ? "#65a16e" : status === "notReady" ? "#a3564a" : "#c4832a";
      ctx.fillText(
        status === "ready" ? "Ready" : status === "notReady" ? "NotReady" : "SchedDisabled",
        W - 110,
        ry,
      );
      ctx.beginPath();
      ctx.arc(W - 78, ry, 8, 0, Math.PI * 2);
      ctx.fillStyle =
        status === "ready" ? "#65a16e" : status === "notReady" ? "#5c2b24" : "#c4832a";
      ctx.fill();
    });

    y += 132;
  });

  ctx.strokeStyle = "#202e23";
  ctx.beginPath();
  ctx.moveTo(64, H - 116);
  ctx.lineTo(W - 64, H - 116);
  ctx.stroke();

  const total = feed.nodes.length || 6;
  ctx.textAlign = "left";
  ctx.font = mono(25);
  ctx.fillStyle = "#465548";
  ctx.fillText("argocd", 64, H - 72);
  ctx.fillStyle = feed.argocd.health === "Healthy" ? "#cfe1d2" : "#c4832a";
  ctx.fillText(`${feed.argocd.sync} / ${feed.argocd.health}`, 200, H - 72);

  ctx.fillStyle = "#465548";
  ctx.fillText("nodes", 64, H - 32);
  ctx.fillStyle = ready === total ? "#cfe1d2" : "#c4832a";
  ctx.fillText(`${ready} / ${total} Ready`, 200, H - 32);

  ctx.textAlign = "right";
  ctx.fillStyle = "#465548";
  if (feed.versions.talos) ctx.fillText(`talos ${feed.versions.talos}`, W - 64, H - 72);
  if (feed.versions.kubernetes) ctx.fillText(`k8s ${feed.versions.kubernetes}`, W - 64, H - 32);

  ctx.fillStyle = "rgba(0,0,0,0.16)";
  for (let sy = 0; sy < H; sy += 4) ctx.fillRect(0, sy, W, 2);
}

function Television({ feed }: { feed: Feed }) {
  const { invalidate } = useThree();

  const { texture, ctx } = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = SCREEN_PX_W;
    c.height = SCREEN_PX_H;
    const context = c.getContext("2d")!;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return { texture: t, ctx: context };
  }, []);

  useEffect(() => {
    // The webfont has to have arrived, or the readout silently falls back to a
    // system mono and the whole panel changes character.
    let cancelled = false;
    const paint = () => {
      if (cancelled) return;
      drawScreen(ctx, feed);
      texture.needsUpdate = true;
      invalidate();
    };
    paint();
    document.fonts?.ready.then(paint);
    return () => {
      cancelled = true;
    };
  }, [ctx, texture, feed, invalidate]);

  const y = BENCH_H + TV_H / 2 + 0.61;

  return (
    <group position={[0, y, Z_BACK + 1.5]}>
      <mesh castShadow>
        <boxGeometry args={[TV_W * 1.02, TV_H * 1.035, 0.28]} />
        <meshStandardMaterial color="#0f100f" roughness={0.58} metalness={0.3} envMapIntensity={0.3} />
      </mesh>

      {/* A screen is a source, not a surface. As a lit material it catches a
          specular hotspot from its own room spill. */}
      <mesh position={[0, 0, 0.142]}>
        <planeGeometry args={[TV_W, TV_H]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>

      {[-1, 1].map((sx) => (
        <group key={sx}>
          <mesh position={[sx * TV_W * 0.36, -TV_H / 2 - 0.28, 0.02]} rotation={[0, 0, sx * 0.14]} castShadow>
            <boxGeometry args={[0.14, 0.62, 0.16]} />
            <meshStandardMaterial color="#171817" roughness={0.45} metalness={0.5} envMapIntensity={0.4} />
          </mesh>
          <mesh position={[sx * TV_W * 0.375, -TV_H / 2 - 0.575, 0.02]} castShadow>
            <boxGeometry args={[0.3, 0.07, 1.05]} />
            <meshStandardMaterial color="#171817" roughness={0.45} metalness={0.5} envMapIntensity={0.4} />
          </mesh>
        </group>
      ))}

      {/* The set is the practical light here and has to behave like one. The
          wash is what rakes into the bays: the cabinet's own top panel shadows
          them from the key, and without it the hardware is six silhouettes.
          Inverse-square over six units to the far bays needs far more than it
          looks like it should. */}
      <pointLight color="#76b884" intensity={1.5} distance={TV_W * 2.6} decay={2} position={[0, -TV_H * 0.1, TV_W * 0.22]} />
      <pointLight color="#8fc79c" intensity={30} distance={TV_W * 2.6} decay={2} position={[0, -TV_H * 0.62, TV_W * 0.3]} />
    </group>
  );
}

/* -------------------------------------------------------------------------
   Hardware
------------------------------------------------------------------------- */

/** A small emissive disc. Device indicators get these rather than a full lamp:
    twenty point lights would cost more than the rest of the scene. */
function Led({ position, colour, power = 0.8, radius = 0.022 }: {
  position: [number, number, number];
  colour: string;
  power?: number;
  radius?: number;
}) {
  return (
    <mesh position={position}>
      <circleGeometry args={[radius, 10]} />
      <meshStandardMaterial color="#0c0e0c" emissive={colour} emissiveIntensity={power} roughness={0.4} />
    </mesh>
  );
}

function ThinkCentre() {
  const vent = useMemo(() => perforation(4, 26), []);
  const micro = useMemo(() => microNormal(), []);
  const face = T_D / 2;

  return (
    <group>
      <RoundedBox args={[T_W, T_H, T_D]} radius={0.03} smoothness={3} castShadow receiveShadow>
        <meshStandardMaterial
          color="#2b2825"
          metalness={0.32}
          roughness={0.62}
          envMapIntensity={0.5}
          normalMap={micro}
          normalScale={new THREE.Vector2(0.3, 0.3)}
        />
      </RoundedBox>

      <mesh position={[0, -T_H * 0.16, face + 0.004]}>
        <planeGeometry args={[T_W * 0.78, T_H * 0.52]} />
        <meshStandardMaterial map={vent} color="#2b2825" roughness={0.8} metalness={0.2} envMapIntensity={0.18} />
      </mesh>

      {/* The power button is the machine's own light and says the box is
          powered. Amber, because it is a lamp on a machine, not a status. */}
      <mesh position={[0, T_H * 0.36, face + 0.006]}>
        <torusGeometry args={[0.072, 0.014, 8, 20]} />
        <meshStandardMaterial color="#3a3733" roughness={0.5} metalness={0.5} />
      </mesh>
      <mesh position={[0, T_H * 0.36, face + 0.008]}>
        <circleGeometry args={[0.062, 18]} />
        <meshStandardMaterial color="#14110d" emissive="#c98a3a" emissiveIntensity={0.9} roughness={0.45} />
      </mesh>
      <pointLight color="#c98a3a" intensity={0.2} distance={0.9} decay={2} position={[0, T_H * 0.36, face + 0.1]} />

      {[0.2, 0.14].map((y) => (
        <mesh key={y} position={[0, T_H * y, face + 0.004]}>
          <boxGeometry args={[0.115, 0.042, 0.02]} />
          <meshStandardMaterial color="#131110" metalness={0.4} roughness={0.55} envMapIntensity={0.3} />
        </mesh>
      ))}
      <mesh position={[-0.055, T_H * 0.085, face + 0.004]}>
        <boxGeometry args={[0.07, 0.028, 0.02]} />
        <meshStandardMaterial color="#131110" metalness={0.4} roughness={0.55} />
      </mesh>
    </group>
  );
}

/** The printed stand. These are the actual reason the Lenovos stand up, so
    they are worth modelling rather than substituting a generic foot. */
function PrintedStand({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.95, 0.11, 1.55]} />
        <meshStandardMaterial color="#24211e" roughness={0.88} metalness={0.02} envMapIntensity={0.12} />
      </mesh>
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * (T_W / 2 + 0.06), 0.28, 0]} castShadow>
          <boxGeometry args={[0.1, 0.46, 1.35]} />
          <meshStandardMaterial color="#24211e" roughness={0.88} metalness={0.02} envMapIntensity={0.12} />
        </mesh>
      ))}
    </group>
  );
}

/** The Synology. Its lights are drawn lit and never change: nothing in the
    publisher knows this machine exists, and pretending otherwise would be the
    one lie this object cannot afford. */
function Nas() {
  const strip = useMemo(() => perforation(3, 18), []);
  const micro = useMemo(() => microNormal(), []);
  const face = N_D / 2;
  const bayW = N_W * 0.155;

  return (
    <group>
      <RoundedBox args={[N_W, N_H, N_D]} radius={0.05} smoothness={3} castShadow receiveShadow>
        <meshStandardMaterial
          color="#2a2724"
          metalness={0.28}
          roughness={0.68}
          envMapIntensity={0.5}
          normalMap={micro}
          normalScale={new THREE.Vector2(0.3, 0.3)}
        />
      </RoundedBox>

      {Array.from({ length: 5 }, (_, i) => {
        const x = (i - 2) * (N_W * 0.168);
        return (
          <group key={i}>
            <RoundedBox args={[bayW, N_H * 0.8, 0.05]} radius={0.012} smoothness={2} position={[x, -N_H * 0.04, face]} castShadow>
              <meshStandardMaterial
                color="#201d1a"
                metalness={0.34}
                roughness={0.62}
                envMapIntensity={0.55}
                normalMap={micro}
                normalScale={new THREE.Vector2(0.25, 0.25)}
              />
            </RoundedBox>
            <mesh position={[x, -N_H * 0.07, face + 0.028]}>
              <planeGeometry args={[bayW * 0.44, N_H * 0.56]} />
              <meshStandardMaterial map={strip} color="#2a2724" roughness={0.82} metalness={0.2} envMapIntensity={0.15} />
            </mesh>
            <mesh position={[x, -N_H * 0.38, face + 0.03]}>
              <boxGeometry args={[bayW * 0.6, 0.05, 0.03]} />
              <meshStandardMaterial color="#131110" metalness={0.4} roughness={0.55} />
            </mesh>
            <Led position={[x, N_H * 0.3, face + 0.03]} colour="#3fbf6d" power={0.75} radius={0.026} />
          </group>
        );
      })}

      {[0.3, 0.22, 0.14].map((y, i) => (
        <Led
          key={y}
          position={[N_W * 0.42, N_H * y, face + 0.005]}
          colour={i === 2 ? "#c4832a" : "#3fbf6d"}
          power={0.6}
          radius={0.019}
        />
      ))}

      <pointLight color="#3fbf6d" intensity={0.5} distance={2.4} decay={2} position={[0, N_H * 0.3, face + 0.35]} />
    </group>
  );
}

/** A plain device box with a row of lights along its front edge. */
function DeviceBox({ size, tint, lights }: {
  size: [number, number, number];
  tint: string;
  lights: { x: number; colour: string; power?: number; radius?: number }[];
}) {
  const micro = useMemo(() => microNormal(), []);
  return (
    <group>
      <RoundedBox args={size} radius={0.035} smoothness={3} castShadow receiveShadow>
        <meshStandardMaterial
          color={tint}
          roughness={0.6}
          metalness={0.22}
          envMapIntensity={0.5}
          normalMap={micro}
          normalScale={new THREE.Vector2(0.35, 0.35)}
        />
      </RoundedBox>
      {lights.map((l) => (
        <Led
          key={l.x}
          position={[l.x, 0, size[2] / 2 + 0.004]}
          colour={l.colour}
          power={l.power}
          radius={l.radius}
        />
      ))}
    </group>
  );
}

/** The Lite 8 PoE. Eight ports with a link light over each — two dark, because
    two of the eight are unused. */
function Switch8() {
  const W = 1.6, H = 0.27, D = 1;
  const micro = useMemo(() => microNormal(), []);
  return (
    <group>
      <RoundedBox args={[W, H, D]} radius={0.03} smoothness={3} castShadow receiveShadow>
        <meshStandardMaterial
          color="#3a3733"
          roughness={0.58}
          metalness={0.26}
          envMapIntensity={0.55}
          normalMap={micro}
          normalScale={new THREE.Vector2(0.3, 0.3)}
        />
      </RoundedBox>
      {Array.from({ length: 8 }, (_, i) => {
        const x = (i - 3.5) * 0.165;
        const lit = i !== 5 && i !== 7;
        return (
          <group key={i}>
            <mesh position={[x, -H * 0.12, D / 2 + 0.006]}>
              <boxGeometry args={[0.115, 0.1, 0.03]} />
              <meshStandardMaterial color="#131110" metalness={0.4} roughness={0.55} />
            </mesh>
            <Led
              position={[x, H * 0.2, D / 2 + 0.006]}
              colour={lit ? "#3fbf6d" : "#14110f"}
              power={lit ? 0.85 : 0}
              radius={0.017}
            />
          </group>
        );
      })}
    </group>
  );
}

/**
 * The Sonos Era 100: 182.5 x 120.3 x 130.5 mm. Not a box — the body is an
 * upright with an oval plan and softly rounded top and bottom edges, wrapped in
 * grille cloth almost to the top plate. A rounded box gets the dimensions right
 * and the object wrong, so this is a lathed profile revolved and then scaled on
 * one axis to make the oval, which is what the real silhouette is.
 *
 * The fun room already calls it "the Sonos Era 100 on the TV bench", so the
 * model is named rather than guessed.
 */
function Sonos() {
  const grille = useMemo(() => perforation(26, 22), []);

  const { profile, squash } = useMemo(() => {
    const W = 1.203, H = 1.825, D = 1.305;
    const r = W / 2;
    const c = 0.17; // corner radius, top and bottom
    const pts: THREE.Vector2[] = [];
    pts.push(new THREE.Vector2(0, 0));
    pts.push(new THREE.Vector2(r - c, 0));
    for (let i = 1; i <= 6; i++) {
      const a = (i / 6) * (Math.PI / 2);
      pts.push(new THREE.Vector2(r - c + Math.sin(a) * c, c - Math.cos(a) * c));
    }
    pts.push(new THREE.Vector2(r, H - c));
    for (let i = 1; i <= 6; i++) {
      const a = (i / 6) * (Math.PI / 2);
      pts.push(new THREE.Vector2(r - c + Math.cos(a) * c, H - c + Math.sin(a) * c));
    }
    pts.push(new THREE.Vector2(0, H));
    return { profile: pts, squash: D / W };
  }, []);

  return (
    <group position={[0, -1.825 / 2, 0]} scale={[1, 1, 1]}>
      <group scale={[1, 1, 1.085]}>
        {/* The cloth. It wraps the whole body, which is why the speaker reads
            as one soft form rather than a lid on a case. */}
        <mesh castShadow receiveShadow scale={[1, 1, squash]}>
          <latheGeometry args={[profile, 48]} />
          <meshStandardMaterial
            map={grille}
            color="#211f1d"
            roughness={0.88}
            metalness={0.06}
            envMapIntensity={0.18}
          />
        </mesh>
      </group>

      {/* The top plate: smooth, slightly inset, with the touch groove. */}
      <mesh position={[0, 1.825 + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1.085, 1]}>
        <circleGeometry args={[0.52, 40]} />
        <meshStandardMaterial color="#1a1816" roughness={0.55} metalness={0.22} envMapIntensity={0.4} />
      </mesh>
      <mesh position={[0, 1.825 + 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1.085, 1]}>
        <ringGeometry args={[0.2, 0.235, 32]} />
        <meshStandardMaterial color="#2c2926" roughness={0.45} metalness={0.3} envMapIntensity={0.5} />
      </mesh>
      <Led position={[0, 1.825 + 0.008, -0.33]} colour="#9fd8b0" power={0.4} radius={0.019} />
    </group>
  );
}

/**
 * The UniFi U6+: a 160 mm disc, 33 mm deep, with a domed face, a chamfered rim
 * and the LED ring inset from the edge rather than at it. A plain cylinder is
 * what made this read as a roll of tape.
 */
function AccessPoint() {
  const profile = useMemo(() => {
    const R = 0.8, H = 0.24, c = 0.05;
    const pts: THREE.Vector2[] = [];
    pts.push(new THREE.Vector2(0, 0));
    pts.push(new THREE.Vector2(R - c, 0));
    for (let i = 1; i <= 5; i++) {
      const a = (i / 5) * (Math.PI / 2);
      pts.push(new THREE.Vector2(R - c + Math.sin(a) * c, c - Math.cos(a) * c));
    }
    pts.push(new THREE.Vector2(R, H - c));
    for (let i = 1; i <= 5; i++) {
      const a = (i / 5) * (Math.PI / 2);
      pts.push(new THREE.Vector2(R - c + Math.cos(a) * c, H - c + Math.sin(a) * c));
    }
    // A shallow dome rather than a flat lid.
    for (let i = 1; i <= 5; i++) {
      const t = i / 5;
      pts.push(new THREE.Vector2((R - c) * (1 - t), H + 0.035 * Math.sin((t * Math.PI) / 2)));
    }
    return pts;
  }, []);

  return (
    <group position={[0, -0.12, 0]}>
      <mesh castShadow receiveShadow>
        <latheGeometry args={[profile, 44]} />
        <meshStandardMaterial color="#3f3a34" roughness={0.6} metalness={0.1} envMapIntensity={0.35} />
      </mesh>
      <mesh position={[0, 0.262, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.6, 0.625, 44]} />
        <meshStandardMaterial color="#0d0f0d" emissive="#8ec79f" emissiveIntensity={0.42} roughness={0.4} />
      </mesh>
    </group>
  );
}

/**
 * The Nabu Casa Connect ZBT-2: a slim USB stick, roughly 62 x 21 x 12 mm, in
 * Nabu Casa's pale shell, with a hinged antenna longer than the body it comes
 * out of. The antenna is the whole reason it is recognisable across a room,
 * which is why it is the part worth getting right.
 */
function Zigbee() {
  const micro = useMemo(() => microNormal(), []);
  const L = 0.62, W = 0.21, H = 0.12;

  return (
    <group>
      <RoundedBox args={[L, H, W]} radius={0.03} smoothness={3} castShadow receiveShadow>
        <meshStandardMaterial
          color="#6f6a62"
          roughness={0.56}
          metalness={0.08}
          envMapIntensity={0.45}
          normalMap={micro}
          normalScale={new THREE.Vector2(0.25, 0.25)}
        />
      </RoundedBox>

      {/* The USB-A shell at one end, which is most of what says "dongle". */}
      <mesh position={[-L / 2 - 0.07, 0, 0]} castShadow>
        <boxGeometry args={[0.15, 0.055, 0.14]} />
        <meshStandardMaterial color="#8e8a84" roughness={0.34} metalness={0.85} envMapIntensity={0.9} />
      </mesh>

      {/* The antenna, hinged upright. */}
      <group position={[L / 2 - 0.05, H / 2, 0]} rotation={[0, 0, -0.08]}>
        <mesh position={[0, 0.05, 0]} castShadow>
          <cylinderGeometry args={[0.032, 0.038, 0.1, 12]} />
          <meshStandardMaterial color="#3a3733" roughness={0.45} metalness={0.5} envMapIntensity={0.7} />
        </mesh>
        <mesh position={[0, 0.53, 0]} castShadow>
          <cylinderGeometry args={[0.026, 0.03, 0.86, 12]} />
          <meshStandardMaterial color="#26231f" roughness={0.55} metalness={0.3} envMapIntensity={0.5} />
        </mesh>
        <mesh position={[0, 0.965, 0]}>
          <sphereGeometry args={[0.028, 12, 10]} />
          <meshStandardMaterial color="#26231f" roughness={0.55} metalness={0.3} />
        </mesh>
      </group>

      <Led position={[-0.05, 0, W / 2 + 0.004]} colour="#3fbf6d" power={0.7} radius={0.016} />
    </group>
  );
}

/* -------------------------------------------------------------------------
   The cabinet and everything in it
------------------------------------------------------------------------- */

type Surface = { map: THREE.Texture; normalMap: THREE.Texture; roughnessMap: THREE.Texture };

function Slab({ args, position, surface }: {
  args: [number, number, number];
  position: [number, number, number];
  surface: Surface;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial
        {...surface}
        color="#54422f"
        normalScale={new THREE.Vector2(0.8, 0.8)}
        envMapIntensity={0.06}
      />
    </mesh>
  );
}

function Bench() {
  const carcass = useSurface("black_oak_veneer", [7, 0.9]);
  const inner = useSurface("black_oak_veneer", [6, 1.6]);

  return (
    <group>
      <Slab args={[BENCH_W, PANEL, BENCH_D]} position={[0, 0, 0]} surface={carcass} />
      <Slab args={[BENCH_W, PANEL, BENCH_D]} position={[0, BENCH_H - PANEL, 0]} surface={carcass} />

      {/* The back is a separate, darker piece. At carcass tint it fills a third
          of the frame and reads as a lit wall behind the devices. */}
      <mesh position={[0, BENCH_H / 2, Z_BACK - PANEL / 2]} receiveShadow>
        <boxGeometry args={[BENCH_W, BENCH_H, PANEL]} />
        <meshStandardMaterial
          {...inner}
          color="#33281d"
          normalScale={new THREE.Vector2(0.7, 0.7)}
          envMapIntensity={0.04}
        />
      </mesh>

      {[-(BENCH_W / 2 - PANEL / 2), -(BAY_W / 2 + PANEL / 2), BAY_W / 2 + PANEL / 2, BENCH_W / 2 - PANEL / 2].map((x) => (
        <Slab key={x} args={[PANEL, BENCH_H, BENCH_D]} position={[x, BENCH_H / 2, 0]} surface={carcass} />
      ))}

      {/* Turned brass legs. The real cabinet is wall hung, but the palette is
          four materials and brass was entirely absent from this object — which
          is most of why it read flat next to the shelf, where the foil and the
          plates do all the warm work. They also lift it clear of the floor so
          it casts a contact shadow instead of merging with it. */}
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <group key={`${sx}${sz}`} position={[sx * (BENCH_W / 2 - 0.6), -LEG_H / 2, sz * (BENCH_D / 2 - 0.55)]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.09, 0.13, LEG_H, 14]} />
              <meshStandardMaterial color="#d8b477" metalness={0.72} roughness={0.3} envMapIntensity={1} />
            </mesh>
            <mesh position={[0, LEG_H / 2 - 0.06, 0]} castShadow>
              <cylinderGeometry args={[0.16, 0.16, 0.1, 14]} />
              <meshStandardMaterial color="#d8b477" metalness={0.72} roughness={0.36} envMapIntensity={1} />
            </mesh>
          </group>
        )),
      )}
    </group>
  );
}

function Estate({ feed, pick }: { feed: Feed; pick: Pick }) {
  const zFront = Z_BACK + 1.2;

  return (
    <group>
      {/* The wall. Kept out of the camera framing, which is done off the
          cabinet: a 60-unit backdrop in the bounding box frames the whole
          scene at postage-stamp size. */}
      <mesh position={[0, 6, Z_BACK - 0.2]} receiveShadow>
        <planeGeometry args={[60, 40]} />
        <meshStandardMaterial color="#100d0b" roughness={0.97} metalness={0} envMapIntensity={0.03} />
      </mesh>

      {/* A floor, so the cabinet stands somewhere. Without it the legs end in
          nothing and the object floats in a void, which no amount of material
          work on the cabinet itself can fix. */}
      <mesh position={[0, -LEG_H, 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 40]} />
        <meshStandardMaterial color="#161210" roughness={0.94} metalness={0} envMapIntensity={0.05} />
      </mesh>

      <Bench />
      <BayPlates />

      {/* Left bay: what the house needs before any of the rest of it matters. */}
      <Pickable id="modem" position={[BAY_X[0] - 1.55, FLOOR + 0.2, zFront - 0.1]} pick={pick} lift={0.22} hit={[2.1, 0.6, 1.5]}>
        <DeviceBox
          size={[2, 0.4, 1.4]}
          tint="#35322e"
          lights={[
            { x: -0.62, colour: "#3fbf6d" },
            { x: -0.44, colour: "#3fbf6d" },
            { x: -0.26, colour: "#c4832a" },
            { x: -0.08, colour: "#3fbf6d", power: 0.4 },
          ]}
        />
      </Pickable>
      <Pickable id="gateway" position={[BAY_X[0] + 0.15, FLOOR + 0.15, zFront]} pick={pick} lift={0.22} hit={[1.4, 0.55, 1.4]}>
        <DeviceBox size={[1.3, 0.3, 1.3]} tint="#3d3a35" lights={[{ x: 0, colour: "#9fd8b0", radius: 0.03 }]} />
      </Pickable>
      <Pickable id="ha" position={[BAY_X[0] + 1.75, FLOOR + 0.25, zFront]} pick={pick} lift={0.22} hit={[1.4, 0.7, 1.35]}>
        <DeviceBox
          size={[1.3, 0.5, 1.26]}
          tint="#2c2926"
          lights={[
            { x: -0.38, colour: "#c4832a", radius: 0.018 },
            { x: -0.2, colour: "#3fbf6d", radius: 0.018 },
          ]}
        />
      </Pickable>

      {/* Middle bay: the NAS, the switch everything hangs off, the Hue bridge. */}
      <Pickable id="nas" position={[BAY_X[1] - 1.55, FLOOR + N_H / 2, zFront + 0.05]} pick={pick}>
        <Nas />
      </Pickable>
      <Pickable id="switch" position={[BAY_X[1] + 1.35, FLOOR + 0.135, zFront + 0.1]} pick={pick} lift={0.22} hit={[1.75, 0.29, 1.15]}>
        <Switch8 />
      </Pickable>
      <Pickable id="hue" position={[BAY_X[1] + 1.35, FLOOR + 0.42, zFront + 0.1]} pick={pick} lift={0.22} hit={[1.05, 0.3, 1.05]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.9, 0.26, 0.9]} />
          <meshStandardMaterial color="#565049" roughness={0.62} metalness={0.04} envMapIntensity={0.2} />
        </mesh>
      </Pickable>

      {/* Right bay: the three Lenovos, upright in their printed stands. */}
      {HOSTS.map((host, i) => {
        const x = BAY_X[2] + (i - 1) * 1.42;
        return (
          // The stand comes forward with its machine: they are one object to
          // anyone looking at them, and leaving it behind reads as a glitch.
          <Pickable
            key={host.host}
            id={host.host}
            position={[x, 0, zFront + 0.15]}
            pick={pick}
            lift={0.34}
            hit={[0.85, 2.1, 1.9]}
            hitOffset={[0, FLOOR + 0.11 + T_H / 2, 0]}
          >
            <PrintedStand position={[0, FLOOR + 0.055, 0]} />
            <group position={[0, FLOOR + 0.11 + T_H / 2, 0]}>
              <ThinkCentre />
            </group>
          </Pickable>
        );
      })}

      {/* On the bench top, flanking the set: the speaker and the access point
          to its left, the Zigbee antenna to its right. */}
      <Pickable id="sonos" position={[-6.4, BENCH_H + 1.825 / 2, Z_BACK + 1.55]} pick={pick} lift={0.25} hit={[1.4, 2.0, 1.5]}>
        <Sonos />
      </Pickable>
      <Pickable id="ap" position={[-4.9, BENCH_H + 0.12, Z_BACK + 2.05]} pick={pick} lift={0.25} hit={[1.75, 0.42, 1.75]}>
        <AccessPoint />
      </Pickable>
      <Pickable id="zigbee" position={[5.8, BENCH_H + 0.06, Z_BACK + 1.9]} pick={pick} lift={0.25} hit={[1.1, 1.3, 0.95]} hitOffset={[0.1, 0.55, 0]}>
        <Zigbee />
      </Pickable>

      <Television feed={feed} />
    </group>
  );
}

/* -------------------------------------------------------------------------
   Rig and camera
------------------------------------------------------------------------- */

function Lights() {
  const rake = useRef<THREE.SpotLight>(null);
  const target = useRef<THREE.Object3D>(null);
  const reach = BENCH_W;

  useEffect(() => {
    if (rake.current && target.current) rake.current.target = target.current;
  }, []);

  return (
    <>
      <ambientLight color="#31251a" intensity={0.6} />
      <directionalLight
        color="#ffd49a"
        intensity={2.7}
        position={[-5.5, 5.5, 4.5]}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={reach * 4}
        shadow-camera-left={-reach}
        shadow-camera-right={reach}
        shadow-camera-top={reach}
        shadow-camera-bottom={-reach}
        shadow-bias={-0.0009}
        shadow-normalBias={0.03}
      />
      <directionalLight color="#6f9c72" intensity={0.5} position={[5, -0.5, 2]} />
      {/* A soft frontal fill, for the same reason the portfolio shelf has one:
          the cabinet's own top panel puts all three bays in the key's shadow,
          which a single object standing on a table never does. The set's wash
          does most of this work; this stops the far bays going black. */}
      <directionalLight color="#ffcf9e" intensity={0.55} position={[0.5, -0.8, 6]} />
      <spotLight
        ref={rake}
        color="#ffca8a"
        intensity={reach * reach * 0.62}
        distance={reach * 3.6}
        angle={0.6}
        penumbra={0.8}
        decay={1.8}
        position={[-reach * 0.75, reach * 0.6, reach]}
      />
      <object3D ref={target} position={[0, BENCH_H * 0.6, 0]} />
    </>
  );
}

/**
 * Framed off the cabinet's own bounds rather than a hand-placed camera, so a
 * change to the geometry or the container's aspect cannot silently push the
 * subject out of shot.
 */
function Framing() {
  const { camera, size, invalidate } = useThree();

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    // Frame the cabinet and the set together, from the legs to the top of the
    // screen, and no more of the room than that.
    const bottom = -LEG_H - 0.5;
    const top = BENCH_H + 0.61 + TV_H;
    const height = top - bottom;
    const centre = new THREE.Vector3(0, (top + bottom) / 2, 0);
    cam.aspect = size.width / Math.max(size.height, 1);

    const vFov = (cam.fov * Math.PI) / 180;
    const fitH = height / 2 / Math.tan(vFov / 2);
    const fitW = BENCH_W / 2 / Math.tan(vFov / 2) / cam.aspect;
    const dist = Math.max(fitH, fitW) * 1.015;

    const dir = new THREE.Vector3(0.26, 0.10, 1).normalize();
    cam.position.copy(centre).add(dir.multiplyScalar(dist));
    cam.near = dist / 60;
    cam.far = dist * 6;
    cam.lookAt(centre);
    cam.updateProjectionMatrix();
    invalidate();
  }, [camera, size, invalidate]);

  return null;
}

/** The lamps breathe very slightly. It is the only motion in the frame, and it
    is why the scene still renders on demand rather than every frame. */
function Breath() {
  const { invalidate } = useThree();
  const t = useRef(0);
  useFrame((_, delta) => {
    t.current += delta;
    if (t.current > 0.5) {
      t.current = 0;
      invalidate();
    }
  });
  return null;
}

export default function BenchScene({ feed, selected, onSelect }: {
  feed: Feed;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const pick = { selected, onSelect };

  return (
    <Canvas
      shadows
      frameloop="demand"
      camera={{ fov: 19 }}
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.15;
      }}
      style={{ width: "100%", height: "100%" }}
    >
      <Suspense fallback={null}>
        {/* Brass at metalness 1 with nothing to reflect is dull brown plastic.
            Two warm lightformers stand in for an interior HDRI at no asset
            cost, exactly as the portfolio shelf does. Kept dim: the large matte
            surfaces take almost none of it via their own envMapIntensity. */}
        <Environment resolution={128} frames={1}>
          <Lightformer intensity={0.9} color="#ffd9a8" position={[-4, 3, 3]} scale={[8, 8, 1]} />
          <Lightformer intensity={0.22} color="#6f9c72" position={[5, -1, 2]} scale={[6, 6, 1]} />
          <mesh scale={60}>
            <sphereGeometry args={[1, 12, 12]} />
            <meshBasicMaterial color="#1a140d" side={THREE.BackSide} />
          </mesh>
        </Environment>
        <Lights />
        <Framing />
        <Breath />
        <Estate feed={feed} pick={pick} />
      </Suspense>
    </Canvas>
  );
}
