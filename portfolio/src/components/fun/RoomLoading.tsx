"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/**
 * The screen between the hero and the room.
 *
 * It shows the same poster the hero's monitor shows, picked up at the scale
 * the hero's zoom ended on and still drifting inward, so arriving here reads
 * as one continuous move rather than as a second screen. The real scene
 * resolves behind it and the poster fades off, which is the whole trick: the
 * still becomes the room. It only works while the poster's framing and the
 * room's opening camera pose agree — see BACKLOG.md on regenerating it.
 *
 * Two callers, two states. The dynamic import's fallback has no progress to
 * report yet (the chunk carrying `useProgress` is what it is waiting for), so
 * it gets an indeterminate bar; once the room mounts, the real byte progress
 * takes over on the identical screen, so the swap between them is invisible.
 */
export function RoomLoading({
  progress,
  done = false,
}: {
  progress?: number;
  done?: boolean;
}) {
  const indeterminate = progress === undefined;

  /* Unmount once the fade has run. A full-viewport image left sitting at
     opacity 0 over the canvas is an extra compositing layer for the rest of
     the session, and the room needs the GPU more than this does. */
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setGone(true), 760);
    return () => clearTimeout(t);
  }, [done]);

  if (gone) return null;

  return (
    <div
      aria-hidden={done}
      className="pointer-events-none fixed inset-0 z-[120] overflow-hidden bg-bg transition-opacity duration-700"
      style={{ opacity: done ? 0 : 1 }}
    >
      <Image
        src="/images/room-poster.jpg"
        alt=""
        aria-hidden
        fill
        priority
        sizes="100vw"
        className="room-enter__poster object-cover brightness-[0.42] saturate-[0.85]"
        style={{ objectPosition: "50% 58%" }}
      />
      <span
        aria-hidden
        className="absolute inset-0 bg-[repeating-linear-gradient(180deg,rgba(0,0,0,0.26)_0_1px,transparent_1px_3px)]"
      />
      <span
        aria-hidden
        className="absolute inset-0 shadow-[inset_0_0_200px_70px_rgba(0,0,0,0.85)]"
      />

      <div className="absolute inset-0 grid place-content-center">
        <p className="eyebrow mb-6 text-center text-[0.65rem] text-fg-3">
          nordbye.it · the room
        </p>
        <div className="h-[3px] w-[260px] overflow-hidden rounded-full bg-fg/10">
          <div
            className={
              indeterminate
                ? "room-enter__bar h-full w-1/3 rounded-full bg-accent"
                : "h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
            }
            style={indeterminate ? undefined : { width: `${Math.max(4, Math.round(progress))}%` }}
          />
        </div>
        <p className="mt-4 text-center font-mono text-[11px] tabular-nums text-fg-3">
          {indeterminate
            ? "warming up the room…"
            : done
              ? "ready"
              : `loading the room · ${Math.round(progress)}%`}
        </p>
      </div>
    </div>
  );
}
