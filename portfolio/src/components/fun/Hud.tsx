"use client";

import type { Prompt } from "./interaction";

/**
 * Game-style HUD: crosshair, the look-at prompt, and a keybind card.
 *
 * Deliberately not using backdrop-blur on the prompt. Blur is expensive per
 * frame over a live canvas, and it makes small mono text mushy at exactly the
 * moment the visitor is trying to read it.
 */

/** A key rendered as a physical keycap. */
export function Key({
  children,
  wide = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <kbd
      className={`inline-flex items-center justify-center rounded-[4px] border border-white/25 border-b-white/10 bg-white/[0.12] font-mono text-[10px] font-medium leading-none text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.35)] ${
        wide ? "h-[20px] min-w-[34px] px-1.5" : "h-[20px] w-[20px]"
      }`}
    >
      {children}
    </kbd>
  );
}

/**
 * Centre reticle. A dot at rest; on a usable target it opens into a ring with
 * corner ticks so the state change is readable without looking away from it.
 */
export function Crosshair({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
    >
      <div className="relative h-8 w-8">
        {/* centre dot */}
        <span
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-150 ${
            active ? "h-[5px] w-[5px] bg-accent" : "h-[3px] w-[3px] bg-white/50"
          }`}
        />
        {/* ring */}
        <span
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border transition-all duration-200 ${
            active
              ? "h-[26px] w-[26px] border-accent/70 opacity-100"
              : "h-[12px] w-[12px] border-white/0 opacity-0"
          }`}
        />
        {/* corner ticks, only when something is targetable */}
        {(
          [
            "left-0 top-0 border-l border-t",
            "right-0 top-0 border-r border-t",
            "left-0 bottom-0 border-l border-b",
            "right-0 bottom-0 border-r border-b",
          ] as const
        ).map((cls) => (
          <span
            key={cls}
            className={`absolute h-[6px] w-[6px] border-accent transition-opacity duration-200 ${cls} ${
              active ? "opacity-80" : "opacity-0"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/** The "press E to do the thing" label, just under the reticle. */
export function InteractPrompt({ prompt }: { prompt: Prompt }) {
  if (!prompt) return null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-[calc(50%+30px)] -translate-x-1/2 whitespace-nowrap">
      <div className="flex items-center gap-2.5 rounded-[5px] border border-white/15 bg-black/70 px-3 py-2 shadow-lg">
        <Key>E</Key>
        <span className="font-mono text-xs text-white/90">
          {prompt.verb}{" "}
          <span className="text-accent">{prompt.label}</span>
        </span>
      </div>
    </div>
  );
}

type Bind = { keys: React.ReactNode; action: string };

const BINDS: Bind[] = [
  {
    keys: (
      <span className="flex gap-1">
        <Key>W</Key>
        <Key>A</Key>
        <Key>S</Key>
        <Key>D</Key>
      </span>
    ),
    action: "move",
  },
  { keys: <Key wide>shift</Key>, action: "run" },
  { keys: <Key>E</Key>, action: "interact" },
  { keys: <Key wide>esc</Key>, action: "release cursor" },
  { keys: <Key>H</Key>, action: "hide these" },
];

export function Keybinds({ visible }: { visible: boolean }) {
  return (
    <div
      className={`pointer-events-none absolute bottom-6 left-6 transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="rounded-[5px] border border-white/12 bg-black/55 px-3.5 py-3">
        <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">
          controls
        </p>
        <ul className="space-y-2">
          {BINDS.map((b) => (
            <li key={b.action} className="flex items-center gap-3">
              {b.keys}
              <span className="font-mono text-[11px] text-white/60">{b.action}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
