"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Kbd } from "@/components/primitives/Kbd";
import { RoomBackdrop } from "./RoomLoading";

const CONTROLS: { keys: string[]; action: string }[] = [
  { keys: ["W", "A", "S", "D"], action: "walk" },
  { keys: ["↑", "←", "↓", "→"], action: "the arrow keys walk too" },
  { keys: ["mouse"], action: "look around" },
  { keys: ["shift"], action: "run" },
  { keys: ["C"], action: "crouch" },
  { keys: ["E"], action: "open what the dot is on, or sit down" },
  { keys: ["esc"], action: "close, or free the cursor" },
];

const PLACES: { where: string; what: string }[] = [
  { where: "the hall cabinet", what: "case studies and my career album inside, the printer on top" },
  { where: "the walls by the desk", what: "certificates on a shelf, and blog posts as framed prints" },
  { where: "the printer", what: "my CV as a PDF, with switches for what goes in it" },
  { where: "the desk", what: "contact card, and a terminal you can type into" },
  { where: "the table", what: "an abacus counting up my skills" },  { where: "the TV bench", what: "the homelab hardware, with the live cluster on screen" },
  { where: "the fridge and hall", what: "my links, and the services I offer" },
];

/** Keys that must not enter the room: modifiers on their own, focus movement,
 *  and Escape, which everywhere else in the room means back. */
const IGNORED = new Set(["Shift", "Control", "Alt", "Meta", "Tab", "Escape", "CapsLock"]);

/**
 * What the room is and how to move in it, read while the room loads behind it.
 * Any key or click enters once it is ready. Same backdrop as RoomLoading, so
 * the handover from the dynamic-import fallback is not a visible cut.
 */
export function RoomIntro({
  progress,
  ready,
  entered,
  onEnter,
}: {
  progress: number;
  ready: boolean;
  entered: boolean;
  /** `byPointer` is true for a click, which is what may take the pointer lock. */
  onEnter: (byPointer: boolean) => void;
}) {
  /* Unmounted after the fade for the reason RoomLoading is: a full-viewport
     image at opacity 0 is still a compositing layer over the canvas. */
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (!entered) return;
    const t = setTimeout(() => setGone(true), 760);
    return () => clearTimeout(t);
  }, [entered]);

  useEffect(() => {
    if (!ready || entered) return;
    const onKey = (e: KeyboardEvent) => {
      if (IGNORED.has(e.key) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLAnchorElement) return;
      // Capture on window runs ahead of every other key handler in the room,
      // so the key that enters does not also walk, press E or toggle the HUD.
      e.stopImmediatePropagation();
      e.preventDefault();
      onEnter(false);
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [ready, entered, onEnter]);

  if (gone) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="About the room"
      className={`fixed inset-0 z-[120] overflow-y-auto overflow-x-hidden bg-bg transition-opacity duration-700 ${
        entered ? "pointer-events-none" : ready ? "cursor-pointer" : ""
      }`}
      style={{ opacity: entered ? 0 : 1 }}
      onClick={(e) => {
        if (!ready || entered || (e.target as Element).closest("a")) return;
        onEnter(true);
      }}
    >
      {/* Fixed and clipped: the poster's drift scales it past the viewport, and
          inside this scroll container that overflow becomes a scrollbar. */}
      <div className="fixed inset-0 overflow-hidden">
        <RoomBackdrop />
      </div>

      <div className="relative flex min-h-full items-center justify-center px-6 py-12">
        <div className="relative w-full max-w-[44rem]">
          {/* Falloff behind the copy rather than a panel: the poster stays the
              ground, it just goes darker where there is text to read. */}
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-16"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(4,7,10,0.85) 0%, rgba(4,7,10,0.62) 52%, rgba(4,7,10,0) 80%)",
            }}
          />

          <div className="relative">
            <p className="eyebrow mb-5 text-[0.65rem] text-snow/35">nordbye.it · the room</p>
            <h1 className="font-mono text-xl leading-snug text-fg">
              A walkable version of this portfolio.
            </h1>
            <p className="mt-4 max-w-[54ch] text-[15px] leading-relaxed text-snow/70">
              Everything on the site also lives somewhere in this flat, from the case studies and
              certificates to the CV and the homelab behind it all. Walk around and open whatever
              catches your eye. A brass pin floats over everything worth opening.
            </p>

            <span
              aria-hidden
              className="mt-7 block h-px w-full"
              style={{ background: "linear-gradient(to right, rgba(185,143,78,0.7), rgba(127,90,47,0))" }}
            />

            <div className="mt-7 grid gap-8 sm:grid-cols-[auto_1fr] sm:gap-12">
              <section>
                <p className="eyebrow mb-3 text-[0.6rem] text-snow/35">controls</p>
                <ul className="space-y-2.5">
                  {CONTROLS.map((c) => (
                    <li key={c.action} className="flex items-center gap-3">
                      <span className="flex gap-1">
                        {c.keys.map((k) => (
                          <Kbd key={k}>{k}</Kbd>
                        ))}
                      </span>
                      <span className="font-mono text-[11px] text-fg-3">{c.action}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <p className="eyebrow mb-3 text-[0.6rem] text-snow/35">where things are</p>
                <dl className="space-y-2.5">
                  {PLACES.map((p) => (
                    <div key={p.where} className="flex gap-4">
                      <dt className="w-32 shrink-0 font-mono text-[11px] leading-5 text-fg-2">{p.where}</dt>
                      <dd className="text-[13px] leading-5 text-snow/60">{p.what}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
              <div className="flex items-center gap-4">
                <div className="h-[3px] w-[160px] overflow-hidden rounded-full bg-fg/10">
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
                    style={{ width: `${ready ? 100 : Math.max(4, Math.round(progress))}%` }}
                  />
                </div>
                {ready ? (
                  <button
                    type="button"
                    className="focus-ring font-mono text-xs text-fg"
                  >
                    click or press any key to enter
                  </button>
                ) : (
                  <p className="font-mono text-[11px] tabular-nums text-fg-3">
                    loading the room · {Math.round(progress)}%
                  </p>
                )}
              </div>
              <Link
                href="/"
                className="focus-ring font-mono text-xs text-fg-3 underline-offset-4 transition-colors hover:text-fg hover:underline"
              >
                go to the site instead
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
