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

/**
 * The look-at label under the reticle.
 *
 * The name is the point. Most things in the room are worth identifying but not
 * worth opening, so looking at a device names it and gives its role, and the
 * E key is offered underneath rather than being the only way to learn anything.
 */
export function InteractPrompt({
  prompt,
  /** Touch has no E key; the same line has to offer the tap instead. */
  touch = false,
}: {
  prompt: Prompt;
  touch?: boolean;
}) {
  if (!prompt) return null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-[calc(50%+30px)] -translate-x-1/2">
      <div className="max-w-[22rem] rounded-[5px] border border-white/15 bg-black/70 px-3.5 py-2.5 text-center shadow-lg">
        <p className="font-mono text-[13px] leading-tight text-accent">
          {prompt.label}
        </p>
        {prompt.detail && (
          <p className="mt-1 font-mono text-[11px] leading-tight text-white/55">
            {prompt.detail}
          </p>
        )}
        <p className="mt-2 flex items-center justify-center gap-2 font-mono text-[11px] text-white/70">
          {touch ? "tap to" : <Key>E</Key>}
          {prompt.verb}
        </p>
      </div>
    </div>
  );
}

/** A field in an InfoCard. */
export type InfoRow = { k: string; v: string };

export type InfoCard = {
  kicker: string;
  title: string;
  subtitle?: string;
  rows: InfoRow[];
  body?: string;
  tags?: string[];
  note?: string;
  href?: string;
  /** Link text. Defaults to the case-study wording the shelf uses. */
  hrefLabel?: string;
};

/**
 * The panel opened with E. One component for hardware, case studies and
 * certificates: they are all "a name, some fields, some prose", and three
 * near-identical panels would drift apart the first time one was edited.
 */
export function InfoPanel({
  card,
  onClose,
}: {
  card: InfoCard | null;
  onClose: () => void;
}) {
  if (!card) return null;
  return (
    <div className="absolute inset-0 z-30 grid place-content-center bg-black/55 px-6">
      <div className="max-h-[80vh] w-[min(34rem,90vw)] overflow-y-auto rounded-[6px] border border-white/15 bg-[#12100d]/95 p-6 shadow-2xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">
          {card.kicker}
        </p>
        <h2 className="mt-2 font-mono text-lg leading-tight text-white">
          {card.title}
        </h2>
        {card.subtitle && (
          <p className="mt-1 font-mono text-xs text-white/50">{card.subtitle}</p>
        )}

        {card.rows.length > 0 && (
          <dl className="mt-5 space-y-2">
            {card.rows.map((r) => (
              <div key={r.k} className="flex gap-3">
                <dt className="w-24 shrink-0 font-mono text-[11px] uppercase tracking-wider text-white/35">
                  {r.k}
                </dt>
                <dd className="font-mono text-[12px] text-white/80">{r.v}</dd>
              </div>
            ))}
          </dl>
        )}

        {card.body && (
          <p className="mt-5 text-[13px] leading-relaxed text-white/70">
            {card.body}
          </p>
        )}

        {card.tags && card.tags.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {card.tags.map((t) => (
              <li
                key={t}
                className="rounded-[3px] border border-white/12 px-2 py-1 font-mono text-[10px] text-white/55"
              >
                {t}
              </li>
            ))}
          </ul>
        )}

        {card.note && (
          <p className="mt-5 border-t border-white/10 pt-4 font-mono text-[11px] leading-relaxed text-white/40">
            {card.note}
          </p>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="focus-ring border border-white/25 px-4 py-2 font-mono text-xs text-white transition-colors hover:border-white/60 hover:bg-white/5"
          >
            close
          </button>
          {card.href && (
            <a
              href={card.href}
              className="focus-ring font-mono text-xs text-accent underline-offset-4 hover:underline"
            >
              {card.hrefLabel ?? "read the full case study"}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The way out of the chair, shown for as long as you are in it.
 *
 * Sitting takes walking away, so unlike every other state in the room there is
 * no way to leave it by accident and no object to look at that offers the exit.
 * A prompt that only appeared on hover would leave the visitor holding W at a
 * view that will not move.
 */
export function SeatedHint({ touch = false }: { touch?: boolean }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-[calc(50%+30px)] -translate-x-1/2">
      <div className="rounded-[5px] border border-white/15 bg-black/70 px-3.5 py-2.5 text-center shadow-lg">
        <p className="flex items-center justify-center gap-2 font-mono text-[11px] text-white/70">
          {touch ? "tap to" : <Key>E</Key>}
          stand up
        </p>
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
  { keys: <Key wide>esc</Key>, action: "back / release cursor" },
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
