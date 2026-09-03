"use client";

import type { ReactNode } from "react";

/**
 * The house annotation device: a Fragment Mono caption over a hairline brass
 * rule with a small dot at one end. The hero globe names Oslo with it, and
 * using it twice in a view is most of what makes two unrelated objects read as
 * one instrument.
 *
 * No box, no border, no backdrop-blur — blur is expensive per frame over a
 * live canvas and it makes small mono text mushy at the moment someone is
 * trying to read it. Legibility comes from a text shadow instead, the same way
 * .oslo-marker-label does it.
 *
 * `dot="lit"` is the one green per view and belongs to live state only.
 * Everything else takes brass.
 */
export function LeaderLabel({
  caption,
  detail,
  action,
  dot = "brass",
  className = "",
}: {
  caption: string;
  detail?: string;
  action?: ReactNode;
  dot?: "brass" | "lit" | "none";
  className?: string;
}) {
  return (
    <div className={`relative max-w-[24rem] text-center ${className}`}>
      {/* The label has to stay readable over a lit paper object as well as over
          a dark wall, and a panel behind it would be the card the brand bans.
          This is falloff instead of a separator: an edgeless radial shadow,
          which is the same instruction as moving one of two areas into shade. */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[165%] w-[150%] -translate-x-1/2 -translate-y-1/2"
        style={{
          /* Warm rather than grey: on a lit paper object a neutral scrim reads
             as a smudge, a warm one reads as the shade the lamp would cast.
             It can afford to be strong: against the room's dark walls a dark
             scrim is invisible, and it only does work over a lit paper object,
             which is exactly where the label would otherwise disappear. */
          background:
            "radial-gradient(ellipse at center, rgba(26,18,11,0.78) 0%, rgba(26,18,11,0.5) 38%, rgba(26,18,11,0) 72%)",
        }}
      />
      <p
        className="relative font-mono text-[12px] leading-tight tracking-[0.16em] text-fg"
        style={{
          textShadow:
            "0 1px 1px rgba(0,0,0,0.95), 0 0 3px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.75)",
        }}
      >
        {caption}
      </p>

      {/* The rule. A hairline that fades at both ends so it reads as an
          engraved leader rather than a drawn box edge. */}
      <span className="relative mt-1.5 flex items-center justify-center gap-1.5">
        <span
          aria-hidden
          className="h-px w-16"
          style={{
            background:
              "linear-gradient(to right, rgba(127,90,47,0), rgba(185,143,78,0.85))",
          }}
        />
        {dot !== "none" && (
          <span
            aria-hidden
            className="h-[3px] w-[3px] rounded-full"
            style={{ background: dot === "lit" ? "#7fc48c" : "#b98f4e" }}
          />
        )}
        <span
          aria-hidden
          className="h-px w-16"
          style={{
            background:
              "linear-gradient(to left, rgba(127,90,47,0), rgba(185,143,78,0.85))",
          }}
        />
      </span>

      {detail && (
        <p
          className="relative mt-1.5 font-mono text-[11px] leading-tight text-fg-3"
          style={{
            textShadow: "0 1px 1px rgba(0,0,0,0.95), 0 0 3px rgba(0,0,0,0.9)",
          }}
        >
          {detail}
        </p>
      )}
      {action && (
        <p
          className="relative mt-2 flex items-center justify-center gap-2 font-mono text-[11px] text-fg-2"
          style={{
            textShadow: "0 1px 1px rgba(0,0,0,0.95), 0 0 3px rgba(0,0,0,0.9)",
          }}
        >
          {action}
        </p>
      )}
    </div>
  );
}
