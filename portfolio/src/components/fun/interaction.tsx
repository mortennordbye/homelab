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

/**
 * Look-at-and-press interaction.
 *
 * Pointer lock parks the cursor in the middle of the screen, so r3f's pointer
 * events never fire. Instead we raycast straight down the camera's centre each
 * frame against a registry of opted-in objects, and the nearest hit inside
 * REACH becomes the active target.
 */

const REACH = 2.4;

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
};

const RegistryCtx = createContext<Registry | null>(null);
const HoverCtx = createContext<THREE.Object3D | null>(null);

export type Prompt = { label: string; verb: string; detail?: string } | null;

export function InteractionProvider({
  enabled,
  onPrompt,
  children,
}: {
  enabled: boolean;
  onPrompt: (p: Prompt) => void;
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
    let best: { root: THREE.Object3D; dist: number } | null = null;
    for (const [root] of targets.current) {
      const hits = raycaster.intersectObject(root, true);
      if (hits.length && (!best || hits[0].distance < best.dist)) {
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
      if (!obj) return;
      const t = targets.current.get(obj)?.current;
      if (!t || t.disabled) return;
      e.preventDefault();
      t.onActivate();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);

  const registry = useMemo(() => ({ register, unregister }), [register, unregister]);

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
