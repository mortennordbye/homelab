/**
 * Phosphor ramp for emitting screens (§2: nothing emits light except a screen
 * or a lamp). The command palette and the status instrument share it so the
 * two screens cannot drift apart. Not tokens.css colours: these surfaces
 * emit, everything else on the site reflects.
 */
export const PHOS_DIM = "#3e5b42";
export const PHOS_LIT = "#79b381";
export const PHOS_BRIGHT = "#a9d3ae";
export const PHOS_AMBER = "#c09955";
export const GLOW = "0 0 6px rgba(101,161,110,0.35)";
export const GLOW_BRIGHT = "0 0 7px rgba(101,161,110,0.45)";

/** The housing and glass, as style objects, so every instrument is the same
 *  fixture: a reflective bezel around an emitting screen. */
export const BEZEL_STYLE = {
  background: "linear-gradient(180deg, #1c1610, #0e0b07 70%)",
  border: "1px solid rgba(0,0,0,0.7)",
  boxShadow: "inset 1px 1px 0 var(--lit-edge-soft), var(--cast)",
} as const;

export const SCREEN_STYLE = {
  background: "radial-gradient(120% 130% at 50% 20%, #0c130c, #070b07 75%)",
  boxShadow: "inset 0 0 34px rgba(0,0,0,0.8), 0 0 22px -6px rgba(101,161,110,0.25)",
} as const;

export const SCANLINES_STYLE = {
  backgroundImage:
    "repeating-linear-gradient(0deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 3px)",
} as const;
