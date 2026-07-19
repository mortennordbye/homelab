"use client";

import { Html, RoundedBox } from "@react-three/drei";
import type { PanelDef, PanelProps } from "./Panels";

// The DOM panel is authored at a fixed pixel size and mapped onto the screen
// plane. Keeps text crisp (it is real DOM, not a texture).
//
// In transform mode drei sizes the DOM at `distanceFactor / 400` world units
// per CSS pixel (see @react-three/drei/web/Html.js, the getObjectCSSMatrix call
// and the occlusion-mesh ratio). So the factor is derived from the panel size
// rather than guessed — and the `scale` prop must stay off, or it compounds.
export const PANEL_PX_W = 640;
export const PANEL_PX_H = 376;
const ASPECT = PANEL_PX_H / PANEL_PX_W; // 0.5875

/** World metres per CSS pixel, for a screen of the given physical width. */
const pxToWorld = (width: number) => width / PANEL_PX_W;
/** drei wants this expressed as distanceFactor = (metres per px) * 400. */
const distanceFactor = (width: number) => pxToWorld(width) * 400;

export function Screen({
  panel,
  data,
  position,
  rotation,
  /** Physical width in metres. A desk monitor is ~0.62, a wall panel ~1.5. */
  width,
  powered,
  /** Whether to mount the DOM layer at all. Every screen currently passes
   *  true; the flag exists so culling can come back if the room grows. */
  mounted,
}: {
  panel: PanelDef;
  data: PanelProps;
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  powered: boolean;
  mounted: boolean;
}) {
  const w = width;
  const h = width * ASPECT;
  return (
    <group position={position} rotation={rotation}>
      {/* bezel */}
      <RoundedBox
        position={[0, 0, -0.018]}
        args={[w + 0.022, h + 0.022, 0.03]}
        radius={0.005}
        smoothness={4}
        castShadow
      >
        <meshStandardMaterial color="#121417" roughness={0.62} metalness={0.25} />
      </RoundedBox>

      {/* the panel surface itself. Dark when unpowered, faintly emissive when on,
          so the power-on sequence reads even before the DOM fades in. */}
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial color={powered ? "#080d13" : "#05080b"} />
      </mesh>

      {mounted && (
        <Html
          transform
          occlude="blending"
          distanceFactor={distanceFactor(width)}
          position={[0, 0, 0.008]}
          zIndexRange={[10, 0]}
          style={{
            width: `${PANEL_PX_W}px`,
            height: `${PANEL_PX_H}px`,
            opacity: powered ? 1 : 0,
            transform: powered ? "scale(1)" : "scale(0.985)",
            transition: "opacity 520ms ease-out, transform 520ms ease-out",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          <div
            className="relative h-full w-full overflow-hidden font-mono"
            style={{
              background:
                "linear-gradient(160deg, #0a1119 0%, #070d14 55%, #060a10 100%)",
              border: `1px solid ${panel.accent}3d`,
              boxShadow: `inset 0 0 60px ${panel.accent}14`,
              color: "#c8d8e8",
              padding: "20px 24px 22px",
              fontSize: "15px",
            }}
          >
            {/* title bar */}
            <div
              className="mb-4 flex items-center justify-between border-b pb-3"
              style={{ borderColor: `${panel.accent}26` }}
            >
              <span
                className="text-[13px] tracking-[0.22em]"
                style={{ color: panel.accent }}
              >
                {panel.title}
              </span>
              <span className="text-[11px] tracking-[0.14em] text-[#3f4d5c]">
                GENESIS
              </span>
            </div>

            {panel.body(data)}

            {/* scanlines — the one bit of set dressing on the DOM layer */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "repeating-linear-gradient(0deg, rgba(255,255,255,0.028) 0px, rgba(255,255,255,0.028) 1px, transparent 1px, transparent 3px)",
              }}
            />
          </div>
        </Html>
      )}
    </group>
  );
}
