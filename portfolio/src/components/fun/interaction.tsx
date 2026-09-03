"use client";

import { useFrame, useThree } from "@react-three/fiber";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { FLAT, sightBoxes } from "./flat";

/**
 * Look-at-and-press interaction.
 *
 * Pointer lock parks the cursor in the middle of the screen, so r3f's pointer
 * events never fire. Instead we raycast straight down the camera's centre each
 * frame against a registry of opted-in objects, and the nearest hit inside
 * REACH becomes the active target — unless a wall is nearer.
 */

const REACH = 2.4;

/**
 * The interior walls, as boxes the ray stops at.
 *
 * The registry only knows about things that opted in, so on its own the ray
 * has no idea a wall is in the way and everything within REACH is fair game
 * through one. Taken from `sightBoxes()` rather than listed here, for the
 * reason the collision boxes are: a wall that moves without its sight line
 * moving with it is the same class of bug in a different sense.
 */
const SIGHT = sightBoxes().map(
  (b) =>
    new THREE.Box3(
      new THREE.Vector3(b.x - b.hx, 0, b.z - b.hz),
      new THREE.Vector3(b.x + b.hx, FLAT.h, b.z + b.hz),
    ),
);

const wallHit = new THREE.Vector3();



/**
 * How far the ray gets before a wall stops it, or Infinity in the open.
 *
 * A box containing the origin is skipped: standing inside one would otherwise
 * report zero and make every target in the flat unreachable, and a camera
 * clipped a few millimetres into a wall is a state the walker can reach.
 *
 * The 40mm slack is for things hung on a wall's own face. Their geometry sits
 * within a hair of the plane the ray stops at, and without it a switch reads
 * as being behind the wall it is screwed to. Well under WALL_T, so it cannot
 * reach something on the far side.
 */
function wallDistance(ray: THREE.Ray): number {
  let nearest = Infinity;
  for (const box of SIGHT) {
    if (box.containsPoint(ray.origin)) continue;
    if (ray.intersectBox(box, wallHit)) {
      nearest = Math.min(nearest, ray.origin.distanceTo(wallHit));
    }
  }
  return nearest + 0.04;
}

type Target = {
  label: string;
  /** Short verb shown in the prompt, e.g. "flip", "press". */
  verb: string;
  /** Optional second line, e.g. what a device is for. Shown on look, not on
   *  press, so the room answers "what is that?" without asking for a keystroke
   *  first — most things in here are worth naming but not worth opening. */
  detail?: string;
  onActivate: () => void;
  disabled?: boolean;
};

/**
 * Registration is deliberately split from hover state, and targets register a
 * ref rather than a value.
 *
 * Both details matter. If the registry context carried the hovered object, its
 * identity would change on every hover, re-running every Interactive's
 * registration effect, whose cleanup clears the hover — a loop that never
 * settles and leaves the prompt flickering off. And if targets registered a
 * plain object, any inline `onActivate` (every switch has one) would
 * re-register on every render for the same reason. A ref updated in place
 * sidesteps both: registration happens once, the payload stays current.
 */
type Registry = {
  register: (obj: THREE.Object3D, target: React.RefObject<Target>) => void;
  unregister: (obj: THREE.Object3D) => void;
  /**
   * Activate whatever sits under a point in normalised device coordinates.
   *
   * Touch has no crosshair to aim and no key to press, so a tap has to do both
   * jobs at once. Everything else about picking is shared with the look-at
   * path — same registry, same REACH — so a tap can never reach something a
   * walk-up-and-press could not.
   */
  activateAt: (ndc: THREE.Vector2) => boolean;
};

const RegistryCtx = createContext<Registry | null>(null);
const HoverCtx = createContext<THREE.Object3D | null>(null);

export type Prompt = { label: string; verb: string; detail?: string } | null;

export function InteractionProvider({
  enabled,
  onPrompt,
  /**
   * Called when the visitor presses interact with nothing under the crosshair.
   *
   * Sitting down needs this. Standing back up is the one action whose affordance
   * you cannot look at — you are in the chair, so the chair is under you rather
   * than in front of you, and there is no object left to aim at. Rather than
   * bolt a second global key handler onto the window and race this one for the
   * same keystroke, the registry that already owns E hands the miss back.
   */
  onEmptyActivate,
  children,
}: {
  enabled: boolean;
  onPrompt: (p: Prompt) => void;
  onEmptyActivate?: () => void;
  children: React.ReactNode;
}) {
  const targets = useRef(new Map<THREE.Object3D, React.RefObject<Target>>());
  const [hoveredObject, setHoveredObject] = useState<THREE.Object3D | null>(null);
  const hoveredRef = useRef<THREE.Object3D | null>(null);
  /** Last prompt actually emitted. A switch that flips from "on" to "off" is
   *  the same object with a different label, so tracking the object alone
   *  leaves the HUD showing stale text until you look away and back. */
  const lastPrompt = useRef<string | null>(null);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const centre = useMemo(() => new THREE.Vector2(0, 0), []);
  const { camera } = useThree();

  /* Held in a ref for the same reason targets are: the callback is inline at
     the call site, so putting it in the key effect's deps would rebind the
     listener on every render. */
  const emptyActivate = useRef(onEmptyActivate);
  useEffect(() => {
    emptyActivate.current = onEmptyActivate;
  });

  const register = useCallback(
    (obj: THREE.Object3D, target: React.RefObject<Target>) => {
      targets.current.set(obj, target);
    },
    [],
  );
  const unregister = useCallback((obj: THREE.Object3D) => {
    targets.current.delete(obj);
    if (hoveredRef.current === obj) {
      hoveredRef.current = null;
      setHoveredObject(null);
    }
  }, []);

  useFrame(() => {
    if (!enabled) {
      if (hoveredRef.current || lastPrompt.current !== null) {
        hoveredRef.current = null;
        lastPrompt.current = null;
        setHoveredObject(null);
        onPrompt(null);
      }
      return;
    }

    raycaster.setFromCamera(centre, camera);
    raycaster.far = REACH;

    /* Raycasting every registered target every frame looks like it should be
       the expensive part here, and it is not. With ~30 targets it measured as
       free; a distance-reject added on that assumption changed nothing. The
       frame cost that did show up came from shadows, not picking — see the
       note in Bookshelf.tsx. Measure before optimising this loop. */
    const wall = wallDistance(raycaster.ray);
    let best: { root: THREE.Object3D; dist: number } | null = null;
    for (const [root] of targets.current) {
      const hits = raycaster.intersectObject(root, true);
      if (!hits.length || hits[0].distance > wall) continue;
      if (!best || hits[0].distance < best.dist) {
        best = { root, dist: hits[0].distance };
      }
    }

    const next = best?.root ?? null;
    if (next !== hoveredRef.current) {
      hoveredRef.current = next;
      setHoveredObject(next);
    }

    const t = next ? targets.current.get(next)?.current : null;
    const prompt =
      t && !t.disabled
        ? { label: t.label, verb: t.verb, detail: t.detail }
        : null;
    const key = prompt
      ? `${prompt.verb}\u0000${prompt.label}\u0000${prompt.detail ?? ""}`
      : null;
    if (key !== lastPrompt.current) {
      lastPrompt.current = key;
      onPrompt(prompt);
    }
  });

  // Activate whatever is under the crosshair.
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyE" && e.code !== "Enter") return;
      const obj = hoveredRef.current;
      const t = obj ? targets.current.get(obj)?.current : null;
      if (!t || t.disabled) {
        if (!emptyActivate.current) return;
        e.preventDefault();
        emptyActivate.current();
        return;
      }
      e.preventDefault();
      t.onActivate();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);

  /* Deliberately not folded into the useFrame pick above. That one tracks what
     the crosshair is on; this one answers "what did the finger land on", which
     is a different point on the screen and has to be resolved at the moment of
     the tap rather than a frame later. */
  const activateAt = useCallback(
    (ndc: THREE.Vector2) => {
      if (!enabled) return false;
      raycaster.setFromCamera(ndc, camera);
      raycaster.far = REACH;
      const wall = wallDistance(raycaster.ray);
      let best: { root: THREE.Object3D; dist: number } | null = null;
      for (const [root] of targets.current) {
        const hits = raycaster.intersectObject(root, true);
        if (!hits.length || hits[0].distance > wall) continue;
        if (!best || hits[0].distance < best.dist) {
          best = { root, dist: hits[0].distance };
        }
      }
      const t = best ? targets.current.get(best.root)?.current : null;
      /* Same fallback as the key path, and load-bearing rather than symmetric:
         sitting freezes movement, so a touch visitor whose tap on empty floor
         did nothing would be stuck in the chair with no keyboard to press E on
         and no walk stick to leave with. */
      if (!t || t.disabled) {
        if (!emptyActivate.current) return false;
        emptyActivate.current();
        return true;
      }
      t.onActivate();
      return true;
    },
    [enabled, raycaster, camera],
  );

  const registry = useMemo(
    () => ({ register, unregister, activateAt }),
    [register, unregister, activateAt],
  );

  return (
    <RegistryCtx.Provider value={registry}>
      <HoverCtx.Provider value={hoveredObject}>{children}</HoverCtx.Provider>
    </RegistryCtx.Provider>
  );
}

/**
 * Marks its subtree as interactive. Renders a plain group, so it can wrap any
 * geometry. Children may be a render prop to receive hover state for
 * highlighting.
 */
export function Interactive({
  label,
  verb = "use",
  detail,
  onActivate,
  disabled,
  children,
}: {
  label: string;
  verb?: string;
  detail?: string;
  onActivate: () => void;
  disabled?: boolean;
  children: React.ReactNode | ((hovered: boolean) => React.ReactNode);
}) {
  // The group goes into state via a callback ref rather than a ref object, so
  // hover can be compared during render without reading `.current` mid-render.
  const [group, setGroup] = useState<THREE.Group | null>(null);
  const registry = useContext(RegistryCtx);
  const hoveredObject = useContext(HoverCtx);

  // Kept current after every render so the registry always sees live values
  // without the registration effect having to re-run. Updated in an effect
  // rather than during render; activation only ever happens on user input,
  // which is well after effects have flushed.
  const target = useRef<Target>({ label, verb, detail, onActivate, disabled });
  useEffect(() => {
    target.current = { label, verb, detail, onActivate, disabled };
  });

  useEffect(() => {
    if (!group || !registry) return;
    registry.register(group, target);
    return () => registry.unregister(group);
  }, [registry, group]);

  const hovered = hoveredObject !== null && hoveredObject === group;

  return (
    <group ref={setGroup}>
      {typeof children === "function" ? children(hovered) : children}
    </group>
  );
}

/** Lets the touch layer drive activation without reaching into the registry. */
export function useActivateAt() {
  return useContext(RegistryCtx)?.activateAt ?? null;
}
