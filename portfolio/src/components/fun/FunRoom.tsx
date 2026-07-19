"use client";

import { Environment, PointerLockControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import {
  Bloom,
  EffectComposer,
  N8AO,
  ToneMapping,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { PointerLockControls as PointerLockControlsImpl } from "three-stdlib";
import { EntrySequence, useSnapToOperator } from "./EntrySequence";
import { FirstPerson } from "./FirstPerson";
import { ACCENT, PANELS, type PanelProps } from "./Panels";
import { ROOM, Room } from "./Room";
import { Screen } from "./Screen";
import { Crosshair, InteractPrompt, Keybinds } from "./Hud";
import { InteractionProvider, type Prompt } from "./interaction";
import { useInfraFeed } from "./feed";
import { preloadProps } from "./props";
import { preloadSurfaces } from "./textures";

// Kick both caches at module scope. This route is dynamic-imported behind a
// nav click, so the module only evaluates once someone is heading here, and
// the fetches then overlap the entry sequence instead of popping in surface by
// surface after the room appears.
//
// These were previously exported and never called, which is worth flagging:
// a dead preload is invisible, because everything still loads correctly, just
// later and one at a time.
preloadSurfaces();
preloadProps();

// -----------------------------------------------------------------------------
// Screen placement. Four on the wall you face, two on the left, one on the right,
// so there is a reason to turn around.
// -----------------------------------------------------------------------------
type Placement = {
  position: [number, number, number];
  rotation: [number, number, number];
  /** Physical width in metres. */
  width: number;
};

const DESK_Z = -ROOM.d / 2 + 0.38;

/**
 * Six screens, sized and placed like real hardware in a small room:
 * three 24" monitors on the desk, one large panel on the wall above them, and
 * two smaller ones on the side wall.
 *
 * The seventh panel (FEED STATUS) has no screen. It would be redundant: the
 * HUD already carries the live/stale/snapshot state persistently, in view from
 * anywhere in the room, which is where that information belongs.
 */
const PLACEMENTS: Placement[] = [
  // desk monitors, outer two toed in toward the chair
  { position: [-0.72, 1.09, DESK_Z - 0.2], rotation: [0, 0.3, 0], width: 0.62 },
  { position: [0, 1.1, DESK_Z - 0.24], rotation: [0, 0, 0], width: 0.62 },
  { position: [0.72, 1.09, DESK_Z - 0.2], rotation: [0, -0.3, 0], width: 0.62 },
  // wall-mounted panel above the desk
  { position: [0, 1.87, -ROOM.d / 2 + 0.04], rotation: [0, 0, 0], width: 1.42 },
  // side wall pair
  { position: [-ROOM.w / 2 + 0.04, 1.5, -1.15], rotation: [0, Math.PI / 2, 0], width: 0.7 },
  { position: [-ROOM.w / 2 + 0.04, 1.5, -0.3], rotation: [0, Math.PI / 2, 0], width: 0.7 },
];

/**
 * Plan 5.4 capped the live DOM layers at four and promoted by camera distance.
 * With seven screens that made things worse, not better: pure distance ranking
 * favours the side-wall screens behind you over the wall you are facing, so
 * the panels you are looking at were the ones going dark.
 *
 * Phase 0 measured no detectable cost for four panels at 8.3 Mpx, and seven
 * measures the same, so all of them stay mounted and the culling machinery is
 * gone until there is a reason for it. If the room ever grows past a dozen
 * screens, reintroduce it scored by distance *and* view angle, not distance
 * alone.
 */
function ScreenWall({
  data,
  poweredCount,
}: {
  data: PanelProps;
  poweredCount: number;
}) {
  return (
    <>
      {PANELS.slice(0, PLACEMENTS.length).map((panel, i) => (
        <Screen
          key={panel.id}
          panel={panel}
          data={data}
          position={PLACEMENTS[i].position}
          rotation={PLACEMENTS[i].rotation}
          width={PLACEMENTS[i].width}
          powered={i < poweredCount}
          mounted
        />
      ))}
    </>
  );
}

/** Screens are the light source, so the fill has to follow them on. */
function Lighting({ poweredCount }: { poweredCount: number }) {
  const lit = poweredCount / PLACEMENTS.length;
  return (
    <>
      {/* Nordic daylight: a bright, soft, warm room rather than a dark one.
          The window does most of the fill, the ceiling fitting and the desk
          lamp add warmth, and the monitors contribute rather than dominate.
          Only the daylight casts shadows — one shadow map is plenty.

          Ambient and hemisphere are kept deliberately low. They add light from
          everywhere at once, which no real room does, and every unit of it
          flattens the shading gradient that tells you what shape a thing is.
          An earlier pass ran these at 0.5 and 0.9 to brighten the room and the
          result was uniformly lit and fake. Brightness belongs in the window
          and the fittings, where it arrives from a direction and falls off. */}
      <ambientLight intensity={0.12} color="#f2ece2" />
      <hemisphereLight args={["#e8f0fb", "#9d8a6a", 0.3]} />

      {/* soft daylight from the window on the right wall */}
      <directionalLight
        position={[4.4, 2.1, 1.2]}
        intensity={2.5}
        color="#eaf1fb"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0012}
        shadow-normalBias={0.02}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
      />
      <pointLight
        position={[2.0, 1.62, 1.15]}
        intensity={1.25}
        distance={5.5}
        decay={1.9}
        color="#dfeaf7"
      />

      {/* warm ceiling fitting */}
      <pointLight
        position={[0, ROOM.h - 0.16, 0.2]}
        intensity={5}
        distance={9}
        decay={1.8}
        color="#ffdcae"
      />
      {/* the mushroom lamp on the desk */}
      <pointLight
        position={[-1.0, 1.0, -ROOM.d / 2 + 0.55]}
        intensity={3.2}
        distance={2.8}
        decay={2}
        color="#ffcf94"
      />
      {/* monitor spill */}
      <pointLight
        position={[0, 1.25, -ROOM.d / 2 + 0.95]}
        intensity={1.6 * lit}
        distance={2.8}
        decay={2}
        color="#bcd8ef"
      />
    </>
  );
}

/* Raw WebGL output is most of what reads as "someone's three.js demo".
   Filmic tone mapping, a little bloom on the screens, and a vignette do more
   for perceived quality than any texture resolution.

   Ambient occlusion comes first in the chain and matters most. Direct lights
   cannot darken a crease, so without AO every corner, every join between leg
   and floor, every gap behind a device receives the same fill as an open wall
   and the eye reads the whole room as decals on a backdrop. AO is what makes
   objects look like they are resting on things. It costs no download, which
   is why it belongs ahead of any asset work. */
function Post() {
  return (
    <EffectComposer multisampling={4} enableNormalPass={false}>
      <N8AO
        aoRadius={0.55}
        intensity={2.6}
        distanceFalloff={0.9}
        color="#2b2a26"
        halfRes
      />
      <Bloom
        intensity={0.32}
        luminanceThreshold={0.72}
        luminanceSmoothing={0.22}
        mipmapBlur
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.34} darkness={0.42} blendFunction={BlendFunction.NORMAL} />
    </EffectComposer>
  );
}

function Scene({
  data,
  phase,
  reduced,
  onEntryDone,
  controlsRef,
  interacting,
  onPrompt,
  onPrinterStatus,
}: {
  data: PanelProps;
  phase: Phase;
  reduced: boolean;
  onEntryDone: () => void;
  controlsRef: React.RefObject<PointerLockControlsImpl | null>;
  interacting: boolean;
  onPrompt: (p: Prompt) => void;
  onPrinterStatus: (msg: string | null) => void;
}) {
  const [poweredCount, setPoweredCount] = useState(0);
  const snap = useSnapToOperator();
  const { camera } = useThree();

  // Stagger the screens on once the visitor has committed to entering.
  useEffect(() => {
    if (phase === "idle") {
      setPoweredCount(0);
      return;
    }
    if (reduced) {
      setPoweredCount(PLACEMENTS.length);
      return;
    }
    const timers = PLACEMENTS.map((_, i) =>
      setTimeout(() => setPoweredCount((c) => Math.max(c, i + 1)), 700 + i * 260),
    );
    return () => timers.forEach(clearTimeout);
  }, [phase, reduced]);

  // Reduced motion skips the fly-in entirely.
  useEffect(() => {
    if (phase === "entering" && reduced) {
      snap();
      onEntryDone();
    }
  }, [phase, reduced, snap, onEntryDone]);

  // Park the camera somewhere presentable while the enter overlay is up.
  useEffect(() => {
    if (phase !== "idle") return;
    camera.position.set(0, 1.5, ROOM.d / 2 - 1.2);
    camera.lookAt(0, 1.8, -ROOM.d / 2);
  }, [phase, camera]);

  return (
    <>
      <color attach="background" args={["#cfd6dd"]} />
      <fog attach="fog" args={["#dcd8cc", 16, 42]} />
      <Lighting poweredCount={poweredCount} />
      <InteractionProvider enabled={interacting} onPrompt={onPrompt}>
      <Suspense fallback={null}>
        {/* Image-based lighting. Does most of the work on specular: without an
            environment map, metal and plastic have nothing to reflect and every
            surface reads as flat paint. */}
        <Environment
          files="/textures/fun/env_studio_1k.hdr"
          environmentIntensity={0.75}
        />
        <Room onPrinterStatus={onPrinterStatus} />
        <Post />
      </Suspense>
      <ScreenWall data={data} poweredCount={poweredCount} />
      <EntrySequence
        active={phase === "entering" && !reduced}
        onDone={onEntryDone}
      />
      </InteractionProvider>
      <FirstPerson enabled={phase === "exploring"} />
      <PointerLockControls ref={controlsRef} selector="#fun-lock-target" />
    </>
  );
}

type Phase = "idle" | "entering" | "exploring";

export default function FunRoom() {
  const { status, feed, stale, ok, nodes, argocd } = useInfraFeed();
  const [phase, setPhase] = useState<Phase>("idle");
  const [locked, setLocked] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [prompt, setPrompt] = useState<Prompt>(null);
  const [printerStatus, setPrinterStatus] = useState<string | null>(null);
  const [showBinds, setShowBinds] = useState(true);
  const [coarse, setCoarse] = useState(false);
  const controlsRef = useRef<PointerLockControlsImpl | null>(null);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setCoarse(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  // H hides the keybind card, for people who want a clean look.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyH") setShowBinds((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Hide the site chrome and lock scrolling while the room owns the viewport.
  useEffect(() => {
    document.body.classList.add("fun-immersive");
    return () => document.body.classList.remove("fun-immersive");
  }, []);

  const data: PanelProps = useMemo(
    () => ({ status, feed, stale, ok, nodes, argocd }),
    [status, feed, stale, ok, nodes, argocd],
  );

  const enter = useCallback(() => {
    setPhase("entering");
    if (!coarse) controlsRef.current?.lock();
  }, [coarse]);

  const onEntryDone = useCallback(() => setPhase("exploring"), []);

  useEffect(() => {
    const c = controlsRef.current;
    if (!c) return;
    const onLock = () => setLocked(true);
    const onUnlock = () => setLocked(false);
    c.addEventListener("lock", onLock);
    c.addEventListener("unlock", onUnlock);
    return () => {
      c.removeEventListener("lock", onLock);
      c.removeEventListener("unlock", onUnlock);
    };
  }, [phase]);

  const feedTone =
    feed === "snapshot" || stale ? ACCENT.amber : ok ? ACCENT.green : ACCENT.amber;
  const feedLabel =
    feed === "loading"
      ? "checking the cluster"
      : feed === "snapshot"
        ? "snapshot · live feed unreachable"
        : stale
          ? "live feed stale"
          : ok
            ? "all systems operational"
            : "partially degraded";

  return (
    <div className="fixed inset-0 z-[200] bg-[#04070a]">
      <div id="fun-lock-target" className="absolute inset-0 z-0">
        <Canvas
          camera={{ fov: 72, near: 0.1, far: 60, position: [0, 1.5, ROOM.d / 2 - 1.2] }}
          shadows="soft"
          dpr={[1, 1.8]}
          gl={{
            antialias: false, // the composer multisamples instead
            powerPreference: "high-performance",
            // the ToneMapping effect owns this; leaving it on here double-applies
            toneMapping: THREE.NoToneMapping,
          }}
        >
          <Scene
            data={data}
            phase={phase}
            reduced={reduced}
            onEntryDone={onEntryDone}
            controlsRef={controlsRef}
            interacting={phase === "exploring"}
            onPrompt={setPrompt}
            onPrinterStatus={setPrinterStatus}
          />
        </Canvas>
      </div>

      {/* vignette + grade, sells the "camera in a dark room" look */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            "radial-gradient(ellipse at 50% 52%, transparent 42%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* persistent status line */}
      <div className="pointer-events-none absolute left-6 top-6 z-20 font-mono text-xs">
        <div className="flex items-center gap-2.5 border border-white/10 bg-black/45 px-3.5 py-2 backdrop-blur">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: feedTone, boxShadow: `0 0 10px ${feedTone}` }}
          />
          <span style={{ color: feedTone }}>{feedLabel}</span>
          <span className="text-white/35">· genesis · oslo</span>
        </div>
      </div>

      {/* CC0 asset attribution. Poly Haven does not require it, but shipping
          other people's work with no credit is not something to be casual
          about. */}
      <p className="pointer-events-none absolute bottom-6 right-6 z-20 font-mono text-[10px] text-white/25">
        surfaces &amp; environment: Poly Haven (CC0)
      </p>

      {/* exit */}
      <Link
        href="/"
        className="focus-ring absolute right-6 top-6 z-20 border border-white/10 bg-black/45 px-3.5 py-2 font-mono text-xs text-white/60 backdrop-blur transition-colors hover:text-white"
      >
        exit
      </Link>

      {phase === "exploring" && (
        <div className="pointer-events-none absolute inset-0 z-20">
          <Crosshair active={prompt !== null} />
          <InteractPrompt prompt={prompt} />
          <Keybinds visible={showBinds} />
        </div>
      )}

      {printerStatus && (
        <div className="pointer-events-none absolute bottom-24 left-1/2 z-20 -translate-x-1/2 rounded-[5px] border border-accent/40 bg-black/75 px-4 py-2 font-mono text-xs text-accent">
          {printerStatus}
        </div>
      )}

      {/* enter gate */}
      {phase === "idle" && (
        <div className="absolute inset-0 z-30 grid place-content-center bg-black/55 text-center backdrop-blur-[2px]">
          <p className="eyebrow mb-4 text-[0.65rem] text-white/40">
            nordbye.it · the room
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-white">
            Step inside the cluster.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/55">
            A small room with my homelab in it. The screens are reading live
            from the cluster right now. Walk up and look.
          </p>
          <button
            type="button"
            onClick={enter}
            className="focus-ring mx-auto mt-8 border border-white/25 px-7 py-3 font-mono text-sm text-white transition-colors hover:border-white/60 hover:bg-white/5"
          >
            enter the room
          </button>
          <p className="mt-5 font-mono text-[11px] text-white/30">
            {coarse
              ? "drag to look · touch controls"
              : "WASD to move · mouse to look · esc to release"}
          </p>
        </div>
      )}

      {/* paused: pointer lock released */}
      {phase === "exploring" && !locked && !coarse && (
        <div className="absolute inset-0 z-30 grid place-content-center bg-black/55 text-center backdrop-blur-[2px]">
          <p className="font-mono text-sm text-white/70">pointer released</p>
          <button
            type="button"
            onClick={() => controlsRef.current?.lock()}
            className="focus-ring mx-auto mt-5 border border-white/25 px-6 py-2.5 font-mono text-sm text-white transition-colors hover:border-white/60 hover:bg-white/5"
          >
            click to resume
          </button>
        </div>
      )}
    </div>
  );
}
