"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, useTexture } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { FirstFrame } from "@/components/scene/FirstFrame";
import {
  coverStamp,
  foilMaterial,
  pageEdgeCanvas,
  spinePatch,
  spineShellGeometry,
  spineStamp,
  texFrom,
  type Volume,
} from "./shelf-art";

/**
 * The portfolio as a bookcase: client engagements on the upper shelf, homelab
 * on the lower, split on the frontmatter `kind`. Every spine is stamped with
 * its own title, so the whole list is readable without touching anything.
 *
 * Interaction is depth, never a toll gate. A volume is already face-out with
 * its cover showing before anyone clicks, and clicking a spine only changes
 * which one that is. Opening a volume is navigation: the book turns its own
 * pages, the camera dives at the leaf until the paper fills the frame, and the
 * route hands over to /work/<slug>. The writing stays in one place.
 */

const SHELF_TOP = 0.1;
const SHELF_BOT = -1.9;
const GAP = 0.013;
const BOARD_T = 0.02;
const DISP: [number, number] = [1.55, 0.3]; // display slot x, z
const OPEN_END = 0.72; // past here the camera dives at the page
const FOV = 20;

const SHELF_LABELS: Array<[number, string]> = [
  [SHELF_TOP, "Client engagements"],
  [SHELF_BOT, "Homelab"],
];

const TINTS = [
  "#39422f",
  "#452a24",
  "#2b353c",
  "#57462c",
  "#3c3327",
  "#2f3b33",
  "#4a3a2a",
  "#333a44",
];

/**
 * The shelf's name, on a small brass plate screwed to the board edge. This is
 * the client/homelab split made visible: it used to be a filter control, and a
 * label on the thing itself says the same in less.
 */
function shelfPlateMaterial(text: string) {
  const c = document.createElement("canvas");
  c.width = 768;
  c.height = 88;
  const x = c.getContext("2d")!;
  x.fillStyle = "#fff";
  x.font = '40px "Fragment Mono", ui-monospace, monospace';
  x.textAlign = "center";
  x.textBaseline = "middle";
  // letterspaced by hand: canvas has no letter-spacing before Chrome 99
  const chars = [...text.toUpperCase()];
  const sp = 5;
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
  const t = texFrom(c, true);
  // Not full metal. A mirror-finish plate in a dim room reads as a dark smear;
  // this is a brighter, more scattered alloy so the shelf name can be read.
  return new THREE.MeshStandardMaterial({
    map: t,
    alphaMap: t,
    // Lightly self-lit through the same mask, so only the engraving glows. The
    // lower shelf sits in the key's shadow, and a purely reflective plate is
    // unreadable down there while the upper one reads fine.
    emissive: new THREE.Color("#c9a05a"),
    emissiveMap: t,
    emissiveIntensity: 0.5,
    transparent: true,
    color: new THREE.Color("#e8c98c"),
    metalness: 0.55,
    roughness: 0.34,
    envMapIntensity: 1,
  });
}

const ease = (t: number) => t * t * (3 - 2 * t);
const clamp = (t: number) => Math.max(0, Math.min(1, t));

type Placed = {
  v: Volume;
  W: number;
  H: number;
  T: number;
  tint: string;
  homeX: number;
  homeY: number;
  row: "professional" | "homelab";
};

/** Deterministic per-index jitter, so the shelf is stable across renders. */
function dims(i: number) {
  return {
    T: 0.175 + ((i * 2654435761) % 1000) / 1000 * 0.115,
    H: 1.3 + ((i * 7919) % 100) / 100 * 0.28,
    W: 0.94 + ((i * 104729) % 100) / 100 * 0.16,
  };
}

function useSurface(name: string, repeat: [number, number], withArm: boolean) {
  const files = withArm
    ? [
        `/textures/shelf/${name}_diff.webp`,
        `/textures/shelf/${name}_nor.webp`,
        `/textures/shelf/${name}_arm.webp`,
      ]
    : [`/textures/shelf/${name}_diff.webp`, `/textures/shelf/${name}_nor.webp`];
  const loaded = useTexture(files) as THREE.Texture[];
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
    const arm = withArm ? prep(loaded[2], false) : undefined;
    return {
      map: prep(loaded[0], true),
      normalMap: prep(loaded[1], false),
      roughnessMap: arm,
      metalnessMap: arm,
      raw: loaded,
    };
  }, [loaded, repeat[0], repeat[1], withArm]); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Built in separable parts so it can open: the spine shell stays put, the front
 * board swings on a hinge at the joint, and a few leaves follow it over with a
 * stagger. A one-piece extruded case cannot do that.
 */
type Parts = {
  hinge: THREE.Group;
  front: THREE.Mesh;
  leaves: THREE.Group[];
  rightBlock: THREE.Mesh;
  leftBlock: THREE.Mesh;
  rightPage: THREE.Mesh;
  bt: number;
  h0: number;
  bW: number;
  jx: number;
};

function buildVolume(
  p: Placed,
  cloth: THREE.MeshStandardMaterial,
  page: THREE.MeshStandardMaterial,
  leaf: THREE.MeshStandardMaterial,
  paper: THREE.MeshStandardMaterial,
  spineMat: THREE.MeshStandardMaterial,
) {
  const { W, H, T } = p;
  const bt = BOARD_T;
  const sq = 0.024;
  const jx = -W / 2 + 0.034;
  const bW = W / 2 - jx;
  const g = new THREE.Group();

  const caseMat = cloth.clone();
  caseMat.color = new THREE.Color(p.tint);

  const spine = new THREE.Mesh(spineShellGeometry(W, H, T, bt), caseMat);
  spine.castShadow = true;
  spine.receiveShadow = true;
  g.add(spine);

  const board = () => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(bW, bt, H), caseMat);
    b.castShadow = true;
    b.receiveShadow = true;
    return b;
  };

  const back = board();
  back.position.set(jx + bW / 2, -(T / 2 - bt / 2), 0);
  g.add(back);

  const hinge = new THREE.Group();
  hinge.position.set(jx, T / 2 - bt / 2, 0);
  g.add(hinge);
  const front = board();
  front.position.set(bW / 2, 0, 0);
  hinge.add(front);

  const h0 = T - 2 * bt - 0.008;
  const rightBlock = new THREE.Mesh(new THREE.BoxGeometry(bW - sq, h0, H - 2 * sq), page);
  rightBlock.position.set(jx + bW / 2 + 0.006, 0, 0);
  rightBlock.castShadow = true;
  rightBlock.receiveShadow = true;
  g.add(rightBlock);

  const leftBlock = new THREE.Mesh(new THREE.BoxGeometry(bW - sq, h0 * 0.45, H - 2 * sq), page);
  leftBlock.position.set(bW / 2, -(bt / 2 + h0 * 0.225), 0);
  leftBlock.scale.y = 0.001;
  hinge.add(leftBlock);

  // The title leaf sits below the whole left block in local y, so the hinge's
  // own turn through pi lands it on top rather than under.
  const lp = new THREE.Mesh(new THREE.PlaneGeometry(bW - 0.03, H - 0.055), paper);
  lp.rotation.x = Math.PI / 2;
  lp.position.set(bW / 2, -(bt / 2 + h0 * 0.45 + 0.006), 0);
  hinge.add(lp);

  const rightPage = new THREE.Mesh(new THREE.PlaneGeometry(bW - 0.03, H - 0.055), paper);
  rightPage.rotation.x = -Math.PI / 2;
  rightPage.rotation.z = Math.PI;
  rightPage.position.set(jx + bW / 2 + 0.006, h0 / 2 + 0.004, 0);
  g.add(rightPage);

  const leaves: THREE.Group[] = [];
  for (let i = 0; i < 4; i++) {
    const pv = new THREE.Group();
    pv.position.set(jx, T / 2 - bt - 0.004 - i * 0.005, 0);
    g.add(pv);
    const lf = new THREE.Mesh(new THREE.PlaneGeometry(bW - 0.012, H - 2 * sq), leaf);
    lf.rotation.x = Math.PI / 2;
    lf.position.set(bW / 2, 0, 0);
    pv.add(lf);
    leaves.push(pv);
  }

  const groove = new THREE.Mesh(
    new THREE.BoxGeometry(0.007, T - 2 * bt - 0.01, H + 0.003),
    new THREE.MeshStandardMaterial({ color: "#0b0908", roughness: 1, metalness: 0 }),
  );
  groove.position.set(jx - 0.004, 0, 0);
  g.add(groove);

  const sp = spinePatch(W, T, bt, H - 0.02, 0.86, 0.0075);
  g.add(new THREE.Mesh(sp.geo, spineMat));

  // Tip it upright with the spine toward the camera. Nested groups so the two
  // rotations compose in a fixed order.
  const tip = new THREE.Group();
  tip.rotation.x = -Math.PI / 2;
  tip.add(g);
  const holder = new THREE.Group();
  holder.rotation.y = Math.PI / 2;
  holder.add(tip);

  const parts: Parts = { hinge, front, leaves, rightBlock, leftBlock, rightPage, bt, h0, bW, jx };
  return { holder, parts };
}

function Shelf({
  volumes,
  selected,
  onSelect,
  onOpen,
  opening,
}: {
  volumes: Volume[];
  selected: string | null;
  onSelect: (slug: string) => void;
  onOpen: (slug?: string) => void;
  opening: boolean;
}) {
  const { camera, gl, invalidate } = useThree();
  const [hovered, setHovered] = useState<string | null>(null);

  const oak = useSurface("black_oak_veneer", [2.4, 0.5], true);
  const panels = useSurface("wooden_panels", [2.6, 1.8], true);
  const clothTex = useSurface("book_pattern", [3.5, 3.5], false);

  const shared = useMemo(() => {
    const cloth = new THREE.MeshStandardMaterial({
      map: clothTex.map,
      normalMap: clothTex.normalMap,
      normalScale: new THREE.Vector2(1.7, 1.7),
      roughness: 0.7,
      envMapIntensity: 0.15,
    });
    const pageCanvas = pageEdgeCanvas();
    const pageTex = texFrom(pageCanvas, true);
    const page = new THREE.MeshStandardMaterial({
      map: pageTex,
      color: new THREE.Color("#847860"),
      roughness: 0.94,
      envMapIntensity: 0.14,
    });
    const leaf = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#8d8168"),
      roughness: 0.95,
      envMapIntensity: 0.14,
      side: THREE.DoubleSide,
    });
    const paper = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#cbc0a4"),
      roughness: 0.93,
      envMapIntensity: 0.16,
      side: THREE.DoubleSide,
    });
    return { cloth, page, leaf, paper };
  }, [clothTex]);

  // The bookcloth images are needed as raw bitmaps to tile under each stamp.
  const clothImgs = useMemo(() => {
    const src = clothTex.raw as THREE.Texture[];
    return {
      diff: src[0].image as HTMLImageElement,
      nor: src[1].image as HTMLImageElement,
    };
  }, [clothTex]);

  const plates = useMemo(
    () =>
      Object.fromEntries(
        SHELF_LABELS.map(([, label]) => [label, shelfPlateMaterial(label)]),
      ) as Record<string, THREE.MeshStandardMaterial>,
    [],
  );

  const placed = useMemo<Placed[]>(() => {
    const rows: Array<{ key: "professional" | "homelab"; y: number; list: Volume[] }> = [
      {
        key: "professional",
        y: SHELF_TOP,
        list: volumes.filter((v) => v.kind !== "homelab"),
      },
      { key: "homelab", y: SHELF_BOT, list: volumes.filter((v) => v.kind === "homelab") },
    ];
    const out: Placed[] = [];
    let gi = 0;
    rows.forEach((row) => {
      let cursor = -2.42;
      row.list.forEach((v, i) => {
        const d = dims(i);
        out.push({
          v,
          ...d,
          tint: TINTS[gi % TINTS.length],
          homeX: cursor + d.T / 2,
          homeY: row.y + d.H / 2,
          row: row.key,
        });
        cursor += d.T + GAP;
        gi++;
      });
    });
    return out;
  }, [volumes]);

  const built = useMemo(() => {
    if (!clothImgs.diff?.width) return [];
    return placed.map((p) => {
      const sp = spinePatch(p.W, p.T, BOARD_T, p.H - 0.02, 0.86, 0.0075);
      const spineMat = foilMaterial(
        spineStamp(p.v, sp.arcLen, p.H - 0.02),
        p.tint,
        clothImgs.diff,
        clothImgs.nor,
        150,
      );
      const { holder, parts } = buildVolume(
        p,
        shared.cloth,
        shared.page,
        shared.leaf,
        shared.paper,
        spineMat,
      );
      holder.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) o.userData.slug = p.v.slug;
      });
      return { p, holder, parts, turn: 0, open: 0, out: 0, dressed: false };
    });
  }, [placed, shared, clothImgs]);

  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
  }, [gl]);

  /* A cover is a 768x1158 stamp turned into four maps, most of it a per-pixel
     pass. Doing all thirteen at build time cost over a second before the shelf
     could be touched, and twelve of them are never seen. */
  useEffect(() => {
    const b = built.find((x) => x.p.v.slug === selected);
    if (!b || b.dressed || !clothImgs.diff?.width) return;
    b.dressed = true;
    const mat = foilMaterial(coverStamp(b.p.v), b.p.tint, clothImgs.diff, clothImgs.nor, 240);
    const cov = new THREE.Mesh(
      new THREE.PlaneGeometry(b.parts.bW - 0.03, b.p.H - 0.055),
      mat,
    );
    cov.rotation.x = -Math.PI / 2;
    cov.rotation.z = Math.PI;
    cov.position.set(0, b.parts.bt / 2 + 0.0022, 0);
    /* The traverse that tags every mesh with its slug ran when `built` was
       memoised, and this one is added later. Without the tag the cover picks
       as nothing, which meant the largest and most obviously clickable target
       on the shelf — the face-out board with the title on it — was the one
       part of a volume that did not open it. */
    cov.userData.slug = b.p.v.slug;
    b.parts.front.add(cov);
    invalidate();
  }, [selected, built, clothImgs, invalidate]);

  const scratch = useMemo(
    () => ({
      p: new THREE.Vector3(),
      t: new THREE.Vector3(),
      n: new THREE.Vector3(),
      c: new THREE.Vector3(),
      shelfP: new THREE.Vector3(-0.185, -0.2, 11.6),
      shelfT: new THREE.Vector3(-0.185, -0.2, -0.15),
      readP: new THREE.Vector3(-0.28, -0.1, 8.28),
      readT: new THREE.Vector3(-0.28, -0.3, 1.55),
      hinge: new THREE.Vector3(-0.28, -0.3, 1.55),
    }),
    [],
  );

  useFrame(() => {
    let moving = false;
    built.forEach((b) => {
      const sel = b.p.v.slug === selected;
      const wantT = sel ? 1 : 0;
      const dT = wantT - b.turn;
      if (Math.abs(dT) > 0.0008) {
        b.turn += dT * 0.13;
        moving = true;
      } else b.turn = wantT;

      const wantO = sel && opening ? 1 : 0;
      const dO = wantO - b.open;
      if (Math.abs(dO) > 0.0008) {
        b.open += dO * 0.085;
        moving = true;
      } else b.open = wantO;

      const wantH = !sel && b.p.v.slug === hovered ? 0.13 : 0;
      const dH = wantH - b.out;
      if (Math.abs(dH) > 0.0008) {
        b.out += dH * 0.2;
        moving = true;
      } else b.out = wantH;

      const k = ease(b.turn);
      const o = b.open;
      const oe = ease(o);
      const th = Math.PI / 2 + k * (Math.PI / 2 - 0.16);
      b.holder.rotation.y = th;

      const dispX = b.p.homeX + (DISP[0] - b.p.homeX) * k;
      const dispY = b.p.homeY + (SHELF_TOP + b.p.H / 2 - b.p.homeY) * k;
      const dispZ = -0.3 + b.out + (DISP[1] - (-0.3 + b.out)) * k;
      const hx = (-b.p.W / 2) * Math.cos(th);
      const hz = (b.p.W / 2) * Math.sin(th);
      b.holder.position.set(
        dispX + (scratch.hinge.x - hx - dispX) * oe,
        dispY + (scratch.hinge.y - dispY) * oe,
        dispZ + (scratch.hinge.z - hz - dispZ) * oe,
      );

      const pt = b.parts;
      pt.hinge.rotation.z = ease(clamp(o / 0.86)) * Math.PI * 0.988;
      pt.leaves.forEach((pv, i) => {
        pv.rotation.z = ease(clamp((o - (0.1 + i * 0.115)) / 0.46)) * Math.PI * (0.975 - i * 0.007);
      });
      pt.rightBlock.scale.y = 1 - 0.46 * o;
      pt.rightBlock.position.y = (-(b.p.T / 2 - pt.bt) + (pt.h0 * 0.54) / 2) * o;
      pt.leftBlock.scale.y = Math.max(0.001, o);
      pt.rightPage.position.y =
        pt.rightBlock.position.y + (pt.h0 * (1 - 0.46 * o)) / 2 + 0.004;
    });

    const sel = built.find((b) => b.p.v.slug === selected);
    const o = sel ? sel.open : 0;
    if (o <= OPEN_END || !sel) {
      const k = ease(clamp(o / OPEN_END));
      scratch.p.lerpVectors(scratch.shelfP, scratch.readP, k);
      scratch.t.lerpVectors(scratch.shelfT, scratch.readT, k);
    } else {
      const k = ease(clamp((o - OPEN_END) / (1 - OPEN_END)));
      sel.parts.rightPage.updateWorldMatrix(true, false);
      sel.parts.rightPage.getWorldPosition(scratch.c);
      scratch.n.set(0, 0, 1).transformDirection(sel.parts.rightPage.matrixWorld).normalize();
      scratch.p.copy(scratch.c).addScaledVector(scratch.n, 1.3);
      scratch.p.lerpVectors(scratch.readP, scratch.p.clone(), k);
      scratch.t.lerpVectors(scratch.readT, scratch.c, k);
    }
    camera.position.copy(scratch.p);
    camera.lookAt(scratch.t);

    if (moving) {
      gl.shadowMap.needsUpdate = true;
      invalidate();
    }
  });

  const pick = (e: { object: THREE.Object3D; stopPropagation: () => void }) => {
    e.stopPropagation();
    return (e.object.userData.slug as string) ?? null;
  };

  /* A canvas has no cursor of its own, so nothing on the shelf looked
     pressable. Cheap to fix and it is the whole affordance the volumes had. */
  useEffect(() => {
    document.body.style.cursor = hovered ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hovered]);

  return (
    <>
      <mesh position={[0, 0.2, -0.92]} receiveShadow>
        <boxGeometry args={[6.4, 9.5, 0.24]} />
        <meshStandardMaterial
          map={panels.map}
          normalMap={panels.normalMap}
          roughnessMap={panels.roughnessMap}
          color="#4a3c2e"
          normalScale={new THREE.Vector2(0.8, 0.8)}
          envMapIntensity={0}
        />
      </mesh>

      {[SHELF_TOP, SHELF_BOT, SHELF_TOP + 1.9].map((y) => (
        <mesh key={y} position={[0, y - 0.1, -0.16]} receiveShadow castShadow>
          <boxGeometry args={[6.4, 0.2, 1.2]} />
          <meshStandardMaterial
            map={oak.map}
            normalMap={oak.normalMap}
            roughnessMap={oak.roughnessMap}
            color="#6a5541"
            normalScale={new THREE.Vector2(0.75, 0.75)}
            envMapIntensity={0.08}
          />
        </mesh>
      ))}
      {[-2.94, 2.94].map((x) => (
        <mesh key={x} position={[x, -0.1, -0.16]} receiveShadow castShadow>
          <boxGeometry args={[0.26, 4.4, 1.2]} />
          <meshStandardMaterial
            map={oak.map}
            normalMap={oak.normalMap}
            roughnessMap={oak.roughnessMap}
            color="#6a5541"
            envMapIntensity={0.08}
          />
        </mesh>
      ))}

      {SHELF_LABELS.map(([y, label]) => (
        <mesh key={label} position={[-1.72, y - 0.1, 0.45]}>
          <planeGeometry args={[1.55, 0.15]} />
          <primitive object={plates[label]} attach="material" />
        </mesh>
      ))}

      <group
        onPointerMove={(e) => {
          const s = pick(e);
          if (s !== hovered) {
            setHovered(s);
            invalidate();
          }
        }}
        onPointerOut={() => {
          setHovered(null);
          invalidate();
        }}
        onClick={(e) => {
          const s = pick(e);
          if (!s) return;
          if (s === selected) onOpen(s);
          else onSelect(s);
        }}
        /* Picking a volume moves it to the display slot, so "click it again"
           lands on empty shelf. A double-click opens whatever is under the
           cursor, wherever it happens to be. */
        onDoubleClick={(e) => {
          const s = pick(e);
          if (!s) return;
          onSelect(s);
          onOpen(s);
        }}
      >
        {built.map((b) => (
          <primitive key={b.p.v.slug} object={b.holder} />
        ))}
      </group>
    </>
  );
}

function Lights() {
  const rake = useRef<THREE.SpotLight>(null);
  const target = useRef<THREE.Object3D>(null);
  useEffect(() => {
    if (rake.current && target.current) rake.current.target = target.current;
  }, []);
  return (
    <>
      <ambientLight color="#3b2d20" intensity={0.62} />
      <directionalLight
        color="#ffd49a"
        intensity={3.5}
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
      <directionalLight color="#6f9c72" intensity={0.5} position={[5, -0.5, 2]} />
      {/* A soft frontal fill, so the lower shelf is not a black hole. Not in
          the hero rig: a bookcase has a whole second shelf in the key's
          shadow, which a single object standing on a table does not. */}
      <directionalLight color="#ffcf9e" intensity={0.75} position={[0.5, -1.6, 6]} />
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
      <object3D ref={target} position={[1.2, SHELF_TOP, 0.5]} />
    </>
  );
}

export default function WorkShelfScene({
  onReady,
  ...props
}: {
  volumes: Volume[];
  selected: string | null;
  onSelect: (slug: string) => void;
  onOpen: (slug?: string) => void;
  opening: boolean;
  onReady?: () => void;
}) {
  return (
    <Canvas
      shadows
      frameloop="demand"
      camera={{ position: [-0.185, -0.2, 11.6], fov: FOV }}
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.22;
      }}
      style={{ width: "100%", height: "100%" }}
    >
      <Suspense fallback={null}>
        {/* Brass at metalness 1 with nothing to reflect renders as dull brown
            plastic. Two warm lightformers stand in for an interior HDRI at no
            asset cost, which is the whole reason the foil reads as metal. */}
        {/* Brass at metalness 1 with nothing to reflect is dull brown
            plastic, so this exists purely to give the foil something. It is
            kept dim, and the large matte surfaces take almost none of it via
            their own envMapIntensity — turned up across the set it lifts
            every surface at once and the whole shelf goes foggy. */}
        <Environment resolution={128} frames={1}>
          <Lightformer intensity={0.9} color="#ffd9a8" position={[-4, 3, 3]} scale={[8, 8, 1]} />
          <Lightformer intensity={0.22} color="#6f9c72" position={[5, -1, 2]} scale={[6, 6, 1]} />
          <mesh scale={40}>
            <sphereGeometry args={[1, 12, 12]} />
            <meshBasicMaterial color="#1a140d" side={THREE.BackSide} />
          </mesh>
        </Environment>
        <Lights />
        <Shelf {...props} />
        <FirstFrame onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
