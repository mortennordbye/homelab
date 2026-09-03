"use client";

import { Kbd } from "@/components/primitives/Kbd";
import { LeaderLabel } from "./LeaderLabel";
import type { Prompt } from "./interaction";

/**
 * The room's overlay. Everything here is the site's annotation language rather
 * than game chrome: a leader label names what the crosshair is on, and the
 * panel that opens is a sheet of paper.
 */

/**
 * The aiming point. A dot, and on a usable target a slightly larger brass one
 * — enough of a state change to read without looking away from it. It is not a
 * reticle: no ring, no corner ticks.
 */
export function Crosshair({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
    >
      <span
        className={`block rounded-full transition-all duration-150 ${
          active ? "h-[5px] w-[5px]" : "h-[3px] w-[3px]"
        }`}
        style={{
          background: active ? "#b98f4e" : "rgba(233,235,233,0.45)",
          boxShadow: "0 0 4px rgba(0,0,0,0.9)",
        }}
      />
    </div>
  );
}

/**
 * The look-at label.
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
      <LeaderLabel
        caption={prompt.label}
        detail={prompt.detail}
        action={
          <>
            {touch ? "tap to" : <Kbd>E</Kbd>}
            {prompt.verb}
          </>
        }
      />
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
      {/* A sheet on the desk, not a card: paper is the only light field, it has
          an edge rather than a border, and depth is the shadow it casts. */}
      <div
        className="max-h-[80vh] w-[min(34rem,90vw)] overflow-y-auto p-7"
        style={{
          background: "linear-gradient(158deg, var(--paper) 0%, var(--paper-2) 62%, var(--paper-3) 100%)",
          color: "var(--paper-ink)",
          boxShadow: "var(--cast)",
        }}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: "var(--paper-ink-3)" }}>
          {card.kicker}
        </p>
        <h2 className="mt-2 text-xl leading-tight">{card.title}</h2>
        {card.subtitle && (
          <p className="mt-1 font-mono text-xs" style={{ color: "var(--paper-ink-2)" }}>
            {card.subtitle}
          </p>
        )}

        <span
          aria-hidden
          className="mt-5 block h-px w-full"
          style={{ background: "linear-gradient(to right, var(--brass), rgba(127,90,47,0))" }}
        />

        {card.rows.length > 0 && (
          <dl className="mt-4 space-y-2">
            {card.rows.map((r) => (
              <div key={r.k} className="flex gap-3">
                <dt
                  className="w-24 shrink-0 font-mono text-[11px] uppercase tracking-wider"
                  style={{ color: "var(--paper-ink-3)" }}
                >
                  {r.k}
                </dt>
                <dd className="font-mono text-[12px]">{r.v}</dd>
              </div>
            ))}
          </dl>
        )}

        {/* Prose is set in the body serif. Mono never carries a sentence. */}
        {card.body && <p className="mt-5 text-[14px] leading-relaxed">{card.body}</p>}

        {card.tags && card.tags.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {card.tags.map((t) => (
              <li
                key={t}
                className="px-2 py-1 font-mono text-[10px]"
                style={{ border: "1px solid var(--brass)", color: "var(--paper-ink-2)" }}
              >
                {t}
              </li>
            ))}
          </ul>
        )}

        {card.note && (
          <p
            className="mt-5 pt-4 font-mono text-[11px] leading-relaxed"
            style={{ borderTop: "1px solid rgba(127,90,47,0.35)", color: "var(--paper-ink-3)" }}
          >
            {card.note}
          </p>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="focus-ring px-4 py-2 font-mono text-xs transition-colors"
            style={{ border: "1px solid var(--brass)", color: "var(--paper-ink)" }}
          >
            close
          </button>
          {card.href && (
            <a
              href={card.href}
              /* The green solved against paper, not against the room's ground. */
              className="focus-ring font-mono text-xs underline-offset-4 hover:underline"
              style={{ color: "#4d7d54" }}
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
      <LeaderLabel
        caption="the chair"
        action={
          <>
            {touch ? "tap to" : <Kbd>E</Kbd>}
            stand up
          </>
        }
      />
    </div>
  );
}

type Bind = { keys: React.ReactNode; action: string };

const BINDS: Bind[] = [
  {
    keys: (
      <span className="flex gap-1">
        <Kbd>W</Kbd>
        <Kbd>A</Kbd>
        <Kbd>S</Kbd>
        <Kbd>D</Kbd>
      </span>
    ),
    action: "move",
  },
  { keys: <Kbd>shift</Kbd>, action: "run" },
  { keys: <Kbd>E</Kbd>, action: "interact" },
  { keys: <Kbd>esc</Kbd>, action: "back / release cursor" },
  { keys: <Kbd>H</Kbd>, action: "hide these" },
];

export function Keybinds({ visible }: { visible: boolean }) {
  return (
    <div
      className={`pointer-events-none absolute bottom-6 left-6 transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="px-1 py-1">
        <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-3">
          controls
        </p>
        <span
          aria-hidden
          className="mb-2.5 block h-px w-full"
          style={{ background: "linear-gradient(to right, rgba(185,143,78,0.7), rgba(127,90,47,0))" }}
        />
        <ul className="space-y-2">
          {BINDS.map((b) => (
            <li key={b.action} className="flex items-center gap-3">
              {b.keys}
              <span className="font-mono text-[11px] text-fg-3">{b.action}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
