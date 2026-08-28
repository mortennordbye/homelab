"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { site } from "@/content/site";
import { VCARD_FILENAME, vcard } from "@/lib/vcard";

/**
 * How far the card has to travel before it comes away in your hand.
 *
 * A CSS pixel is 1/96 inch by definition, so this is two inches and says so.
 * Far enough that a nudge, a text selection or a scroll that starts on the
 * card cannot trigger a download, short enough to complete in one motion
 * without repositioning your hand.
 */
const PULL_DISTANCE_PX = 2 * 96;

/**
 * Movement below this is a click that wobbled, not a drag.
 *
 * Needed because a pointer release also fires `click`, and the click path is
 * what makes the card work from the keyboard. Without a slop, a mouse that
 * moved one pixel during a deliberate click would be read as an abandoned
 * drag and nothing would happen.
 */
const CLICK_SLOP_PX = 6;

/** How long "Saved" stays up before the card offers itself again. */
const SAVED_MS = 2600;

type Drag = { pointerId: number; startX: number; startY: number };

export function ContactCard() {
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null);
  const [saved, setSaved] = useState(false);
  const drag = useRef<Drag | null>(null);
  // The furthest the pointer got this interaction, so `click` can tell a drag
  // from a press after the fact.
  const travelled = useRef(0);
  // One download per interaction. Without it, every pointermove past the
  // threshold fires another.
  const fired = useRef(false);
  const savedTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(savedTimer.current), []);

  const save = useCallback(() => {
    // Built here rather than fetched: the card is nine lines of text that
    // already exist in `site.ts`, so a network round trip would be a way for
    // the file to disagree with the page.
    const blob = new Blob([vcard()], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = VCARD_FILENAME;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Not immediately: Safari has to have started the download before the URL
    // is revoked, and it does that off the end of the current task.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);

    setSaved(true);
    window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setSaved(false), SAVED_MS);
  }, []);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    // Left button and touch only. A right click is a context menu and a
    // middle click is a paste on some platforms.
    if (event.button !== 0) return;
    drag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY };
    travelled.current = 0;
    fired.current = false;
    // Capture, so a fast drag that leaves the card keeps sending moves here
    // rather than to whatever is underneath.
    event.currentTarget.setPointerCapture(event.pointerId);
    setOffset({ x: 0, y: 0 });
  }, []);

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const held = drag.current;
      if (!held || held.pointerId !== event.pointerId) return;

      const x = event.clientX - held.startX;
      const y = event.clientY - held.startY;
      travelled.current = Math.max(travelled.current, Math.hypot(x, y));
      setOffset({ x, y });

      if (!fired.current && Math.hypot(x, y) >= PULL_DISTANCE_PX) {
        fired.current = true;
        save();
      }
    },
    [save],
  );

  const release = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    const held = drag.current;
    if (!held || held.pointerId !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    // Back to the desk. `null` rather than {0,0} is what re-enables the
    // transition, so the return is animated where the drag is not.
    setOffset(null);
  }, []);

  const onClick = useCallback(() => {
    // A drag has already decided, one way or the other: past the threshold it
    // downloaded, short of it the release was a cancel. This branch is for a
    // genuine press, which includes Enter and Space, where the pointer never
    // moved at all.
    if (travelled.current > CLICK_SLOP_PX) return;
    save();
  }, [save]);

  const held = offset !== null;
  const distance = held ? Math.hypot(offset.x, offset.y) : 0;
  const armed = distance >= PULL_DISTANCE_PX;
  // Eases in over the pull so the card feels like it is coming unstuck rather
  // than switching state at the threshold.
  const lift = held ? Math.min(distance / PULL_DISTANCE_PX, 1) : 0;

  return (
    <div className="flex flex-col items-start gap-4">
      <button
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={release}
        onPointerCancel={release}
        onClick={onClick}
        aria-label={`Save the contact card for ${site.firstName} ${site.lastName} as a vCard. Drag it, or press to download.`}
        className="card-stock focus-ring block w-full max-w-[26rem] cursor-grab p-7 text-left active:cursor-grabbing"
        style={{
          // The pointer owns the gesture. Without this a touch drag scrolls
          // the page and the card never moves.
          touchAction: "none",
          transform: `translate(${offset?.x ?? 0}px, ${offset?.y ?? 0}px) rotate(${
            -2 + (offset ? offset.x * 0.012 : 0)
          }deg) scale(${1 + lift * 0.03})`,
          // Only on the way back. Transitioning during the drag puts the card
          // behind the pointer, which reads as lag rather than as weight.
          transition: held ? "none" : "transform 520ms cubic-bezier(0.22, 1.4, 0.36, 1)",
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.5), ${
            8 + lift * 18
          }px ${14 + lift * 26}px ${20 + lift * 30}px -12px rgba(0,0,0,0.9)`,
        }}
      >
        <p
          className="text-h3"
          style={{ color: "var(--paper-ink)", fontVariationSettings: '"opsz" 20' }}
        >
          {site.firstName} {site.lastName}
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--paper-ink-2)" }}>
          {site.role}
        </p>

        <hr className="mt-8 border-0 border-t" style={{ borderColor: "var(--paper-3)" }} />

        <div
          className="mt-5 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs"
          style={{ color: "var(--paper-ink-2)" }}
        >
          <span>{site.email}</span>
          <span className="text-right">{site.homepage}</span>
          <span style={{ color: "var(--paper-ink-3)" }}>{site.location}</span>
          <span className="text-right" style={{ color: "var(--paper-ink-3)" }}>
            CET / CEST
          </span>
        </div>
      </button>

      {/* Polite, because this narrates something the reader just did rather
          than interrupting them, and assertive would talk over the download
          announcement the browser makes anyway. */}
      <p className="eyebrow" aria-live="polite" style={{ color: armed || saved ? "var(--accent)" : undefined }}>
        {saved ? "Saved · vCard downloaded" : armed ? "Let go" : "Pull it off the page to save"}
      </p>
    </div>
  );
}
