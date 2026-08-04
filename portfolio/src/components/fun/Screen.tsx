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

/**
 * Portrait canvas for the vertical monitor.
 *
 * Deliberately not the landscape numbers swapped. The shell's help output is
 * two columns held apart with padEnd, so it only reads as aligned output while
 * every line fits on one row — and a wrapped line does not degrade gracefully,
 * it just looks broken.
 *
 * 512 is measured, not guessed. At 13px JetBrains Mono a character is 7.8px,
 * the longest help line is 57 of them, and 40px goes to padding: 512 leaves
 * 472px of content against 445px of text. Shortening any help line below that
 * budget is fine; widening one past it needs this number to move with it.
 */
export const PORTRAIT_PX_W = 512;
export const PORTRAIT_PX_H = 872;

/** The television. Big enough to carry six panels side by side and still be
 *  read from across the room. */
export const DASH_PX_W = 1280;
export const DASH_PX_H = 752;

/** drei wants this expressed as distanceFactor = (metres per px) * 400. */
export const distanceFactor = (width: number, pxW: number) =>
  (width / pxW) * 400;

/**
 * The bordered, titled box a panel is drawn in.
 *
 * Shared between the desk monitor and the television rather than written twice.
 * The two used to be one component because there was only one kind of screen;
 * pulling the chrome out is what lets the television lay six of these into a
 * grid without the panel bodies knowing anything about it.
 */
export function PanelCard({
  panel,
  data,
  compact = false,
}: {
  panel: PanelDef;
  data: PanelProps;
  /** Tightens the padding for a panel being scaled down into a grid cell. */
  compact?: boolean;
}) {
  return (
    <div
      className="relative h-full w-full overflow-hidden font-mono"
      style={{
        background:
          "linear-gradient(160deg, #0d160f 0%, #0a110b 55%, #080e09 100%)",
        border: `1px solid ${panel.accent}3d`,
        boxShadow: `inset 0 0 60px ${panel.accent}14`,
        color: "#cfe1d2",
        padding: compact ? "16px 18px 18px" : "20px 24px 22px",
        fontSize: "15px",
      }}
    >
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
        <span className="text-[11px] tracking-[0.14em] text-[#465548]">
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
  );
}

/** Bezel and dark panel surface, shared by every screen in the room. */
export function Housing({ w, h, powered }: { w: number; h: number; powered: boolean }) {
  return (
    <>
      <RoundedBox
        position={[0, 0, -0.018]}
        args={[w + 0.022, h + 0.022, 0.03]}
        radius={0.005}
        smoothness={4}
        castShadow
      >
        <meshStandardMaterial color="#131614" roughness={0.62} metalness={0.25} />
      </RoundedBox>
      {/* Dark when unpowered, faintly lit when on, so the power-on sequence
          reads even before the DOM fades in. */}
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial color={powered ? "#0a110b" : "#060a07"} />
      </mesh>
    </>
  );
}

export function Screen({
  panel,
  data,
  position,
  rotation,
  /** Physical width in metres. A desk monitor is ~0.62. */
  width,
  powered,
  /** Whether to mount the DOM layer at all. The flag exists so culling can come
   *  back if the room grows. */
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
  const h = width * (PANEL_PX_H / PANEL_PX_W);
  return (
    <group position={position} rotation={rotation}>
      <Housing w={w} h={h} powered={powered} />
      {mounted && (
        <Html
          transform
          occlude="blending"
          distanceFactor={distanceFactor(width, PANEL_PX_W)}
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
          <PanelCard panel={panel} data={data} />
        </Html>
      )}
    </group>
  );
}

/**
 * The television, carrying every observability panel at once.
 *
 * The panels are laid into a grid at ~62% rather than rewritten for a smaller
 * box. Each cell holds a full-size PanelCard scaled with a CSS transform, so
 * the bodies in Panels.tsx stay authored at one size and there is no second set
 * of "small" variants to keep in step with the first. Adding a seventh panel
 * changes the grid, not the panels.
 *
 * Cells cascade in on a transition delay instead of being driven by a powered
 * count. Same effect on screen, none of the state plumbing.
 */
export function Dashboard({
  panels,
  data,
  position,
  rotation,
  width,
  powered,
}: {
  panels: PanelDef[];
  data: PanelProps;
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  powered: boolean;
}) {
  const h = width * (DASH_PX_H / DASH_PX_W);

  const COLS = 3;
  const GAP = 18;
  const PAD = 26;
  const HEADER = 52;
  const cellW = (DASH_PX_W - PAD * 2 - GAP * (COLS - 1)) / COLS;
  const scale = cellW / PANEL_PX_W;
  const cellH = PANEL_PX_H * scale;

  return (
    <group position={position} rotation={rotation}>
      <Housing w={width} h={h} powered={powered} />
      <Html
        transform
        occlude="blending"
        distanceFactor={distanceFactor(width, DASH_PX_W)}
        position={[0, 0, 0.008]}
        zIndexRange={[10, 0]}
        style={{
          width: `${DASH_PX_W}px`,
          height: `${DASH_PX_H}px`,
          opacity: powered ? 1 : 0,
          transition: "opacity 520ms ease-out",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        <div
          className="relative flex h-full w-full flex-col overflow-hidden font-mono"
          style={{
            background:
              "linear-gradient(160deg, #0c160e 0%, #09100a 55%, #070d08 100%)",
            border: "1px solid #202e23",
            color: "#cfe1d2",
            padding: `${PAD}px`,
          }}
        >
          <div
            className="flex items-center justify-between border-b pb-4"
            style={{ borderColor: "#202e23", height: `${HEADER}px` }}
          >
            <span className="text-[19px] tracking-[0.3em] text-[#51a45e]">
              GENESIS · OBSERVABILITY
            </span>
            <span className="text-[15px] tracking-[0.18em] text-[#465548]">
              OSLO · TALOS
            </span>
          </div>

          <div className="flex flex-1 items-center justify-center">
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${COLS}, ${cellW}px)`,
                gap: `${GAP}px`,
              }}
            >
              {panels.map((panel, i) => (
                <div
                  key={panel.id}
                  style={{
                    width: `${cellW}px`,
                    height: `${cellH}px`,
                    opacity: powered ? 1 : 0,
                    transform: powered ? "translateY(0)" : "translateY(6px)",
                    transition: `opacity 420ms ease-out ${i * 90}ms, transform 420ms ease-out ${i * 90}ms`,
                  }}
                >
                  {/* Full-size card, shrunk to the cell. transform-origin has to
                      be top left or the scaled box drifts out of its cell. */}
                  <div
                    style={{
                      width: `${PANEL_PX_W}px`,
                      height: `${PANEL_PX_H}px`,
                      transform: `scale(${scale})`,
                      transformOrigin: "top left",
                    }}
                  >
                    <PanelCard panel={panel} data={data} compact />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 3px)",
            }}
          />
        </div>
      </Html>
    </group>
  );
}
