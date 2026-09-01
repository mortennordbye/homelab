import * as THREE from "three";

/**
 * The printed face of the sheet in the clip. Ruled measure, not body copy —
 * A4 at this camera distance is unreadable type (branding/DECISIONS.md §4).
 * One bar per real entry, so the sheet tells the truth about which PDF it is.
 */

export type SheetRun = {
  label: string;
  /** One ruled bar per entry. Comes from the real content, never a constant. */
  entries: number;
};

export type SheetSpec = {
  name: string;
  role: string;
  /** Printed at the foot: which variant this sheet is. */
  footer: string;
  runs: SheetRun[];
};

const W = 760;
const H = 1075; // A4 at 1:1.414

/** The face names are next/font's generated families, so they are read from
 *  the document rather than named here — otherwise the canvas bakes a
 *  fallback and the sheet is set in a different face from the page. */
function faces() {
  const s = getComputedStyle(document.documentElement);
  return {
    body: `${s.getPropertyValue("--font-body").trim() || "ui-serif"}, ui-serif, Georgia, serif`,
    mono: `${s.getPropertyValue("--font-mono").trim() || "ui-monospace"}, ui-monospace, monospace`,
  };
}

export function makeSheetTexture(spec: SheetSpec): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d")!;
  const face = faces();

  // Warm off-white and never pure white: paper in a room lit by one lamp is
  // the colour of the lamp. Values are the --paper ramp from tokens.css.
  const g = x.createLinearGradient(0, 0, W * 0.4, H);
  g.addColorStop(0, "#e8ddc9");
  g.addColorStop(0.62, "#d9cbb2");
  g.addColorStop(1, "#cabb9f");
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);

  // Tooth. A flat fill reads as a decal once it is lit by a directional key.
  for (let i = 0; i < 2400; i++) {
    x.fillStyle = `rgba(${150 + Math.random() * 60},${140 + Math.random() * 50},${118 + Math.random() * 40},0.05)`;
    x.fillRect(Math.random() * W, Math.random() * H, 1.6, 1.6);
  }

  x.fillStyle = "#3a2e1d";
  x.font = `46px ${face.body}`;
  x.fillText(spec.name, 64, 118);

  x.fillStyle = "rgba(58,46,29,0.62)";
  x.font = `18px ${face.mono}`;
  x.fillText(spec.role.toUpperCase(), 64, 152);

  x.fillStyle = "rgba(127,90,47,0.85)";
  x.fillRect(64, 178, 92, 2);

  // Leading is solved for the enabled runs (a fixed step truncates or leaves
  // half a page blank), capped so dropping a section still shortens the page.
  const TOP = 214;
  const BOTTOM = H - 96;
  const HEAD = 52; // label, its hairline, and the gap after the run
  const totalEntries = spec.runs.reduce((n, r) => n + r.entries, 0) || 1;
  const step = Math.min(
    18,
    Math.max(7, (BOTTOM - TOP - spec.runs.length * HEAD) / totalEntries),
  );
  const bar = Math.max(3, Math.min(7, step * 0.42));

  let y = TOP;
  for (const run of spec.runs) {
    x.fillStyle = "rgba(58,46,29,0.75)";
    x.font = `15px ${face.mono}`;
    x.fillText(run.label.toUpperCase(), 64, y);
    x.fillStyle = "rgba(127,90,47,0.5)";
    x.fillRect(64, y + 10, 632, 1);
    y += 32;

    for (let i = 0; i < run.entries; i++) {
      x.fillStyle = `rgba(58,46,29,${0.34 - (i % 3) * 0.05})`;
      // Deterministic ragging: a random right edge re-rags on every redraw and
      // the sheet appears to reflow when only a toggle changed.
      x.fillRect(64, y, 470 + ((i * 97) % 170), bar);
      y += step;
    }
    y += HEAD - 32;
  }

  x.fillStyle = "rgba(58,46,29,0.5)";
  x.font = `14px ${face.mono}`;
  x.fillText(spec.footer, 64, H - 44);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
