"use client";

import { Environment, PointerLockControls, useProgress } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Bloom,
  EffectComposer,
  N8AO,
  ToneMapping,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { PointerLockControls as PointerLockControlsImpl } from "three-stdlib";
import { EYE, FirstPerson } from "./FirstPerson";
import { ACCENT, PANELS, type PanelProps } from "./Panels";
import {
  DESK_SCREEN,
  DESK_TERMINAL,
  LANTERN,
  ROOM,
  Room,
  type Placement,
} from "./Room";
import { CodeScreen, type Tab } from "./CodeScreen";
import { Dashboard } from "./Screen";
import { Crosshair, InfoPanel, InteractPrompt, Keybinds, type InfoCard } from "./Hud";
import type { Hardware } from "./hardware";
import type { CareerData, ShelfBook, ShelfCert, ShelfData } from "./shelf";
import type { SourceExcerpt } from "@/lib/source-excerpt";
import { TerminalScreen } from "./Terminal";
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
// Screen placement.
//
// The room ran six screens: three on the desk and two more on the side wall.
// That is a trading floor, not a flat. It is now two monitors on the desk —
// one landscape, one stood on its end for the shell — and the television,
// which carries the whole observability wall on its own.
//
// The side-wall pair is gone entirely rather than relocated. Two panels facing
// the bookshelf were screens nobody stood in front of, and every one of them
// was a live DOM layer being composited whether or not it was in view.
// -----------------------------------------------------------------------------
/* The desk pair lives in Room.tsx, because the monitor stands have to stand
   under the monitors and the desk owns those. Two sets of numbers that must
   agree is one set too many. */

/**
 * The television, on the sideboard where a television actually lives.
 *
 * Centred at z 0.15 rather than on the sideboard's own centre so it does not
 * stand in front of the access point on the top at z 0.97 — a 1.42m screen
 * there would occlude it, and an occluded device is one that can never be
 * looked at.
 */
const WALL_SCREEN: Placement = {
  position: [2.28, 1.09, 0.15],
  rotation: [0, -Math.PI / 2, 0],
  width: 1.42,
};

/**
 * Everything cluster-shaped goes on the television.
 *
 * FEED STATUS is filtered out and has no screen at all, which is where it
 * started: the HUD status chip carries live/stale/snapshot from anywhere in the
 * room, so a panel repeating it was always redundant. The desk monitor it
 * briefly occupied now shows source instead.
 */
const WALL_PANELS = PANELS.filter((p) => p.id !== "feed");

/** How many things stagger on at boot: the desk monitor, then the television. */
const POWER_STEPS = 2;

function ScreenWall({
  data,
  source,
  deskTab,
  poweredCount,
}: {
  data: PanelProps;
  source: SourceExcerpt;
  deskTab: Tab;
  poweredCount: number;
}) {
  return (
    <>
      <CodeScreen
        source={source}
        data={data}
        tab={deskTab}
        position={DESK_SCREEN.position}
        rotation={DESK_SCREEN.rotation}
        width={DESK_SCREEN.width}
        powered={poweredCount > 0}
      />
      <Dashboard
        panels={WALL_PANELS}
        data={data}
        position={WALL_SCREEN.position}
        rotation={WALL_SCREEN.rotation}
        width={WALL_SCREEN.width}
        powered={poweredCount > 1}
      />
    </>
  );
}

function TempCam() {
  const { camera } = useThree();
  useEffect(() => {
    (window as unknown as { __cam: unknown }).__cam = camera;
  }, [camera]);
  return null;
}

/** Mounts inside the Suspense boundary, so its effect cannot run until every
 *  asset under it has resolved. */
function SceneReady({ onReady }: { onReady: () => void }) {
  useEffect(() => onReady(), [onReady]);
  return null;
}

/**
 * Black screen with a bar, and then you are in the room.
 *
 * This replaces a "press to enter" gate. The gate existed because pointer lock
 * needs a user gesture and a button is the obvious place to take one — but it
 * charged every visitor a click to see a thing they had already clicked a nav
 * link to see, and it sat in front of a room that was by then fully loaded.
 *
 * The bar tracks real asset bytes through `useProgress`, not a timer. It is
 * held to whichever is slower, the assets or a short floor, so a warm cache
 * does not produce a single frame of flash before the room appears.
 */
function LoadingScreen({ progress, done }: { progress: number; done: boolean }) {
  return (
    <div
      aria-hidden={done}
      className="pointer-events-none absolute inset-0 z-40 grid place-content-center bg-[#04070a] transition-opacity duration-700"
      style={{ opacity: done ? 0 : 1 }}
    >
      <p className="eyebrow mb-6 text-center text-[0.65rem] text-white/35">
        nordbye.it · the room
      </p>
      <div className="h-[3px] w-[260px] overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
          style={{ width: `${Math.max(4, Math.round(progress))}%` }}
        />
      </div>
      <p className="mt-4 text-center font-mono text-[11px] tabular-nums text-white/30">
        {done ? "ready" : `loading the room · ${Math.round(progress)}%`}
      </p>
    </div>
  );
}

/**
 * How far back from the panel the seated view sits. Set so the 0.72m portrait
 * screen fills most of a 72° view without its edges reaching the frame.
 */
const TERMINAL_VIEW_DIST = 0.72;

/**
 * Leans the camera in when you sit down at the terminal, and puts it back
 * exactly where it was when you step away.
 *
 * Reading a shell from standing height across a desk was the problem this
 * solves: the text is sized for a monitor, not for the far side of a room.
 *
 * Two things make this fiddlier than a lerp. FirstPerson writes the camera
 * position every frame it is enabled — including `y = EYE` — so it has to stay
 * switched off for the whole move, and that includes the way *back*, which is
 * after `terminalActive` has already gone false. Hence `onSettling`: the focus
 * owns a short window where nothing else may touch the camera.
 *
 * And the return pose is captured, not recomputed. Sending the visitor back to
 * a "sensible" spot in front of the desk would quietly relocate them; they
 * should end up standing exactly where they were when they leaned in.
 */
function TerminalFocus({
  active,
  onSettling,
}: {
  active: boolean;
  onSettling: (busy: boolean) => void;
}) {
  const { camera } = useThree();
  const saved = useRef<{ pos: THREE.Vector3; quat: THREE.Quaternion } | null>(null);
  const mode = useRef<"idle" | "in" | "out">("idle");

  const view = useMemo(() => {
    const screen = new THREE.Vector3(...DESK_TERMINAL.position);
    // The panel faces its local +z, so the seat is that far along the normal.
    const normal = new THREE.Vector3(0, 0, 1).applyEuler(
      new THREE.Euler(...DESK_TERMINAL.rotation),
    );
    const pos = screen.clone().addScaledVector(normal, TERMINAL_VIEW_DIST);
    const quat = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().lookAt(pos, screen, new THREE.Vector3(0, 1, 0)),
    );
    return { pos, quat };
  }, []);

  useEffect(() => {
    if (active) {
      mode.current = "in";
    } else if (saved.current) {
      mode.current = "out";
      onSettling(true);
    }
  }, [active, onSettling]);

  useFrame((_, rawDelta) => {
    if (mode.current === "idle") return;
    const delta = Math.min(rawDelta, 0.05);
    // Frame-rate independent ease, so the move takes the same time at 60fps as
    // at 120 rather than running twice as fast.
    const k = 1 - Math.pow(0.0004, delta);

    if (mode.current === "in") {
      if (!saved.current) {
        saved.current = {
          pos: camera.position.clone(),
          quat: camera.quaternion.clone(),
        };
      }
      camera.position.lerp(view.pos, k);
      camera.quaternion.slerp(view.quat, k);
      return;
    }

    const back = saved.current;
    if (!back) {
      mode.current = "idle";
      return;
    }
    camera.position.lerp(back.pos, k);
    camera.quaternion.slerp(back.quat, k);
    if (camera.position.distanceTo(back.pos) < 0.005) {
      camera.position.copy(back.pos);
      camera.quaternion.copy(back.quat);
      saved.current = null;
      mode.current = "idle";
      onSettling(false);
    }
  });

  return null;
}

/** Screens are the light source, so the fill has to follow them on. */
function Lighting({ poweredCount }: { poweredCount: number }) {
  const lit = poweredCount / POWER_STEPS;
  return (
    <>
      {/* A room lit the way a living room is at nine in the evening: nothing
          overhead, two warm lamps at lamp height, and the ceiling lit only by
          what bounces off them.

          Ambient and hemisphere are kept deliberately low. They add light from
          everywhere at once, which no real room does, and every unit of it
          flattens the shading gradient that tells you what shape a thing is.
          An earlier pass ran these at 0.5 and 0.9 to brighten the room and the
          result was uniformly lit and fake. Brightness belongs in the fittings,
          where it arrives from a direction and falls off.

          They are deliberately *cool*, which looks backwards for a warm room
          and is the thing that makes it work. Warmth only reads as warmth
          against something colder: tinting the fill orange too made every
          surface the same sepia and the sage walls disappeared entirely. This
          is the blue evening light in the room the lamps are fighting, and it
          is what leaves the walls green and the lamplight orange. */}
      <ambientLight intensity={0.16} color="#9fb2b8" />
      <hemisphereLight args={["#aac2c8", "#4a3a2c", 0.38]} />

      {/* The lantern. Main light and the only shadow caster, sitting inside
          the shade at the height the shade actually is. A point light this low
          throws long shadows across the floor rather than short ones straight
          down, which is most of what separates lamplight from daylight. */}
      <pointLight
        position={[LANTERN.x, 0.96, LANTERN.z]}
        intensity={26}
        distance={8.5}
        decay={1.5}
        color="#ffa758"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0015}
        shadow-normalBias={0.03}
      />
      {/* The bounce the lantern throws up the wall and across the ceiling.
          This is the single detail that makes a warm lamp look like it is in
          the room rather than pasted over it: without a lit patch above it the
          ceiling stays flat grey and quietly contradicts the fitting. */}
      <pointLight
        position={[LANTERN.x - 0.5, ROOM.h - 0.5, LANTERN.z]}
        intensity={5}
        distance={4.4}
        decay={1.9}
        color="#ff9a45"
      />
      {/* the mushroom lamp on the desk, the second pool of warm */}
      <pointLight
        position={[-1.0, 1.0, -ROOM.d / 2 + 0.55]}
        intensity={8.5}
        distance={3.6}
        decay={1.9}
        color="#ffb066"
      />
      {/* A low warm fill at the door end, which neither lamp reaches. Kept
          weak and warm enough to read as spill rather than as a third lamp the
          visitor can never find. */}
      <pointLight
        position={[-0.4, 1.5, ROOM.d / 2 - 1.4]}
        intensity={3.6}
        distance={5.4}
        decay={1.8}
        color="#ffb877"
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
    /* multisampling 2, down from 4. Measured at 1.8ms a frame for the step
       from 4 to 0 at 8 Mpx, and half of that comes back for free at 2 — which
       still resolves the room's many straight edges (door stiles, shelf
       boards, bezels) without the shimmer that 0 would bring. */
    <EffectComposer multisampling={2} enableNormalPass={false}>
      <N8AO
        aoRadius={0.55}
        intensity={2.6}
        distanceFalloff={0.9}
        color="#2b2a26"
        halfRes
      />
      {/* Threshold lowered so the lamp shades bloom, not just the screens.
          The glow around a warm shade is doing real work here — it is what
          makes the lantern look like it is emitting rather than painted. */}
      <Bloom
        intensity={0.42}
        luminanceThreshold={0.58}
        luminanceSmoothing={0.26}
        mipmapBlur
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.34} darkness={0.42} blendFunction={BlendFunction.NORMAL} />
    </EffectComposer>
  );
}

function Scene({
  data,
  source,
  phase,
  reduced,
  onSceneReady,
  controlsRef,
  interacting,
  onPrompt,
  onPrinterStatus,
  shelf,
  career,
  onInspect,
  onOpenBook,
  onOpenCert,
  onOpenCard,
  onExitRoom,
  terminalActive,
  onTerminalEnter,
  onTerminalExit,
  paused,
}: {
  data: PanelProps;
  source: SourceExcerpt;
  phase: Phase;
  reduced: boolean;
  onSceneReady: () => void;
  controlsRef: React.RefObject<PointerLockControlsImpl | null>;
  interacting: boolean;
  onPrompt: (p: Prompt) => void;
  onPrinterStatus: (msg: string | null) => void;
  shelf: ShelfData;
  career: CareerData;
  onInspect: (hw: Hardware) => void;
  onOpenBook: (b: ShelfBook) => void;
  onOpenCert: (c: ShelfCert) => void;
  onOpenCard: (c: InfoCard) => void;
  onExitRoom: () => void;
  terminalActive: boolean;
  onTerminalEnter: () => void;
  onTerminalExit: () => void;
  paused: boolean;
}) {
  const [poweredCount, setPoweredCount] = useState(0);
  /* True while the camera is easing back out of the terminal. `paused` has
     already gone false by then, so without this FirstPerson would grab the
     camera mid-move and snap it to eye height. */
  const [settling, setSettling] = useState(false);
  /* The desk monitor alternates between the manifest and the ArgoCD view.
     Held here rather than inside CodeScreen — see the note on its `tab` prop. */
  const [deskTab, setDeskTab] = useState<Tab>("code");
  useEffect(() => {
    if (phase !== "exploring") return;
    const t = setInterval(
      () => setDeskTab((v) => (v === "code" ? "argocd" : "code")),
      9000,
    );
    return () => clearInterval(t);
  }, [phase]);
  const { camera } = useThree();

  // Screens come on once the room is up.
  useEffect(() => {
    if (phase !== "exploring") {
      setPoweredCount(0);
      return;
    }
    if (reduced) {
      setPoweredCount(POWER_STEPS);
      return;
    }
    const timers = Array.from({ length: POWER_STEPS }, (_, i) =>
      setTimeout(() => setPoweredCount((c) => Math.max(c, i + 1)), 500 + i * 320),
    );
    return () => timers.forEach(clearTimeout);
  }, [phase, reduced]);

  /* Stand the visitor up just inside the door, facing the desk.
     This runs once, behind the loading screen, so the first frame anyone sees
     is already the view they will be walking from. There is no fly-in any more:
     an animated approach means the first few seconds of the room are a cutscene
     you cannot steer, and it read as a screensaver rather than a place. */
  useEffect(() => {
    if (phase !== "exploring") return;
    camera.position.set(0, EYE, ROOM.d / 2 - 1.1);
    camera.lookAt(0, 1.45, -ROOM.d / 2);
  }, [phase, camera]);

  return (
    <>
      <color attach="background" args={["#1b1410"]} />
      <fog attach="fog" args={["#241a13", 16, 42]} />
      <Lighting poweredCount={poweredCount} />
      <InteractionProvider enabled={interacting && !paused} onPrompt={onPrompt}>
      <Suspense fallback={null}>
        {/* Image-based lighting. Does most of the work on specular: without an
            environment map, metal and plastic have nothing to reflect and every
            surface reads as flat paint.

            Turned well down from 0.75. The map is a neutral studio, so at full
            strength it is a large cool source washing the whole room, and it
            was quietly cancelling out the warmth the lamps put in. It is here
            for reflections now, not for illumination. */}
        <Environment
          files="/textures/fun/env_studio_1k.hdr"
          environmentIntensity={0.28}
        />
        <Room
          onPrinterStatus={onPrinterStatus}
          shelf={shelf}
          career={career}
          onInspect={onInspect}
          onOpenBook={onOpenBook}
          onOpenCert={onOpenCert}
          onOpenCard={onOpenCard}
          onExitRoom={onExitRoom}
        />
        <Post />
        {/* Fires only once everything above has resolved, which is the honest
            "the room is ready" signal. Progress percentage alone is not: it
            hits 100 while the last texture is still being uploaded and the
            scene has yet to mount, so a bar driven purely by it finishes to a
            blank canvas. */}
        <SceneReady onReady={onSceneReady} />
      </Suspense>
      <ScreenWall data={data} source={source} deskTab={deskTab} poweredCount={poweredCount} />
      <TerminalScreen
        position={DESK_TERMINAL.position}
        rotation={DESK_TERMINAL.rotation}
        width={DESK_TERMINAL.width}
        portrait
        shelf={shelf}
        active={terminalActive}
        onActivate={onTerminalEnter}
        onExit={onTerminalExit}
      />
      </InteractionProvider>
      <TempCam />
      <TerminalFocus active={terminalActive} onSettling={setSettling} />
      <FirstPerson enabled={phase === "exploring" && !paused && !settling} />
      <PointerLockControls ref={controlsRef} selector="#fun-lock-target" />
    </>
  );
}

type Phase = "loading" | "exploring";

/* Card builders. Hardware, case studies and certificates all reduce to the same
   shape, so InfoPanel renders one layout rather than three that drift apart. */

function hardwareCard(hw: Hardware): InfoCard {
  return {
    kicker: "hardware",
    title: hw.name,
    subtitle: hw.role,
    rows: hw.specs.map((s) => ({ k: s.k, v: s.v })),
    note: hw.unlisted
      ? "Not in the README hardware tables, so no specification is quoted for it here."
      : "Specifications from the hardware tables in the Homelab README.",
  };
}

function bookCard(b: ShelfBook): InfoCard {
  return {
    kicker: b.kind,
    title: b.title,
    subtitle: `${b.client} · ${b.period}`,
    rows: [],
    body: b.summary,
    tags: b.stack,
    href: `/work/${b.slug}`,
  };
}

function certCard(c: ShelfCert): InfoCard {
  return {
    kicker: "certification",
    title: c.title,
    subtitle: c.issuer,
    rows: [
      { k: "Issued", v: c.date },
      ...(c.credentialId ? [{ k: "Credential", v: c.credentialId }] : []),
    ],
  };
}

export default function FunRoom({
  shelf,
  career,
  source,
}: {
  shelf: ShelfData;
  career: CareerData;
  source: SourceExcerpt;
}) {
  const router = useRouter();
  const { status, feed, stale, ok, nodes, argocd } = useInfraFeed();
  const [phase, setPhase] = useState<Phase>("loading");
  const [sceneReady, setSceneReady] = useState(false);
  const [floorDone, setFloorDone] = useState(false);
  const { progress } = useProgress();
  const [locked, setLocked] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [prompt, setPrompt] = useState<Prompt>(null);
  const [printerStatus, setPrinterStatus] = useState<string | null>(null);
  const [showBinds, setShowBinds] = useState(true);
  const [coarse, setCoarse] = useState(false);
  const [card, setCard] = useState<InfoCard | null>(null);
  const [terminalActive, setTerminalActive] = useState(false);
  const controlsRef = useRef<PointerLockControlsImpl | null>(null);

  /* Movement and look-at picking stop whenever something has taken focus.
     Without this, WASD still walks you across the room while a card is open
     or you are typing at the terminal — the pointer is released but the key
     handlers are on window and do not know that. */
  const paused = card !== null || terminalActive;

  /* Opening a card releases the pointer, because the card is a DOM panel and
     the visitor needs a cursor to click its link. Closing it hands the pointer
     straight back so they are not left looking at a room they cannot move in. */
  const openCard = useCallback((c: InfoCard) => {
    setCard(c);
    setTerminalActive(false);
    controlsRef.current?.unlock();
  }, []);

  /* The terminal needs the cursor released to take keystrokes, same as a card,
     but it stays in the room rather than opening an overlay. */
  const enterTerminal = useCallback(() => {
    setTerminalActive(true);
    controlsRef.current?.unlock();
  }, []);
  const exitTerminal = useCallback(() => {
    setTerminalActive(false);
    controlsRef.current?.lock();
  }, []);

  /* Walking out of the door leaves the room. Uses the router rather than
     window.location so it is a client navigation like any other nav link —
     the visitor lands on the site proper, not on a full page reload.
     The pointer is released first: leaving with the pointer still locked
     drops you onto the front page unable to move the mouse. */
  const exitRoom = useCallback(() => {
    controlsRef.current?.unlock();
    router.push("/");
  }, [router]);

  const closeCard = useCallback(() => {
    setCard(null);
    controlsRef.current?.lock();
  }, []);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setCoarse(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  /* A floor on how briefly the loading screen can exist. On a warm cache the
     room is ready in well under a second, and a bar that flashes to 100 and
     vanishes reads as a glitch rather than as loading. */
  useEffect(() => {
    const t = setTimeout(() => setFloorDone(true), 900);
    return () => clearTimeout(t);
  }, []);

  /* Into the room the moment it is actually ready — no gate, no click.
     Both conditions matter: `sceneReady` is the Suspense boundary resolving,
     which is the real signal, and the floor keeps the transition legible. */
  useEffect(() => {
    if (sceneReady && floorDone) {
      const t = setTimeout(() => setPhase("exploring"), 260);
      return () => clearTimeout(t);
    }
  }, [sceneReady, floorDone]);

  const onSceneReady = useCallback(() => setSceneReady(true), []);

  /* The bar cannot show real progress and also wait on the floor, so it shows
     whichever is further behind. It never goes backwards. */
  const shownProgress = sceneReady ? 100 : Math.min(progress, 96);

  // Esc closes an open card. PointerLockControls already owns Esc for
  // releasing the cursor, but the cursor is deliberately released while a card
  // is up, so Esc has nothing else to do and closing is what you expect.
  useEffect(() => {
    if (!card && !terminalActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Escape") return;
      if (card) closeCard();
      else exitTerminal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card, terminalActive, closeCard, exitTerminal]);

  // H hides the keybind card, for people who want a clean look.
  useEffect(() => {
    if (paused) return;
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
          /* Capped at 1.5, down from 1.8. The room is fill-rate bound and this
             is the cheapest frame time in the build: on a Retina display at a
             2056x1202 window, 1.8 renders 8.0 Mpx against 5.6 at 1.5, for a
             sharpness difference that is very hard to see and 1.9ms a frame
             that is not. Measured 74 -> 91fps together with the multisampling
             change below. */
          dpr={[1, 1.5]}
          gl={{
            antialias: false, // the composer multisamples instead
            powerPreference: "high-performance",
            // the ToneMapping effect owns this; leaving it on here double-applies
            toneMapping: THREE.NoToneMapping,
          }}
        >
          <Scene
            data={data}
            source={source}
            phase={phase}
            reduced={reduced}
            onSceneReady={onSceneReady}
            controlsRef={controlsRef}
            interacting={phase === "exploring"}
            onPrompt={setPrompt}
            onPrinterStatus={setPrinterStatus}
            shelf={shelf}
            career={career}
            onInspect={(hw) => openCard(hardwareCard(hw))}
            onOpenBook={(b) => openCard(bookCard(b))}
            onOpenCert={(c) => openCard(certCard(c))}
            onOpenCard={openCard}
            onExitRoom={exitRoom}
            terminalActive={terminalActive}
            onTerminalEnter={enterTerminal}
            onTerminalExit={exitTerminal}
            paused={paused}
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

      {phase === "exploring" && !paused && (
        <div className="pointer-events-none absolute inset-0 z-20">
          <Crosshair active={prompt !== null} />
          <InteractPrompt prompt={prompt} />
          <Keybinds visible={showBinds} />
        </div>
      )}

      <InfoPanel card={card} onClose={closeCard} />

      {printerStatus && (
        <div className="pointer-events-none absolute bottom-24 left-1/2 z-20 -translate-x-1/2 rounded-[5px] border border-accent/40 bg-black/75 px-4 py-2 font-mono text-xs text-accent">
          {printerStatus}
        </div>
      )}

      {/* Stays mounted and fades rather than unmounting, so the room is already
          rendering behind it as it goes. pointer-events-none throughout, which
          is what lets the very first click land on the canvas and take the
          pointer lock instead of being eaten by an overlay. */}
      <LoadingScreen progress={shownProgress} done={phase === "exploring"} />

      {/* A hint, not a gate.
          Pointer lock cannot be taken without a user gesture, and the click on
          the nav link that got us here does not carry across the navigation —
          so mouse-look genuinely needs one click and there is no way around it.
          WASD works immediately, which is why this is a line of text in the
          corner rather than the modal that used to sit here: the visitor is in
          the room and moving, and the click buys them the mouse when they want
          it. Not shown while a card is open, which releases the pointer on
          purpose. */}
      {phase === "exploring" && !locked && !coarse && !paused && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-30 -translate-x-1/2">
          <p className="border border-white/10 bg-black/45 px-3.5 py-2 font-mono text-[11px] text-white/45 backdrop-blur">
            click to look around · WASD to move
          </p>
        </div>
      )}
    </div>
  );
}
