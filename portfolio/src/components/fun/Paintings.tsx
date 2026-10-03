"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Interactive, useSay } from "./interaction";

/**
 * The flat's paintings: quiet Norwegian nature, each with something hidden in
 * it that only reads up close. E gives a hint, never the answer. All drawn on a
 * canvas, so they cost no download and two of them can read live state.
 */

export type UptimeDay = { d: string; ok: number; total: number };

export type Art =
  | { kind: "fjord"; history?: UptimeDay[] }
  | { kind: "aurora" }
  | { kind: "hytte" }
  | { kind: "birch" };

const TITLES: Record<Art["kind"], string> = {
  fjord: "fjord at dusk",
  aurora: "northern lights",
  hytte: "hytte by the lake",
  birch: "birch forest",
};

const HINTS: Record<Art["kind"], string> = {
  fjord: "every notch in that ridge is a bad day for the cluster",
  aurora: "count the bright stars",
  hytte: "someone's on holiday",
  birch: "you're being watched",
};

/** Canvas size for a painting's face; detail has to survive a close look. */
const PX_W = 600;
const PX_H = 800;

function canvas() {
  const c = document.createElement("canvas");
  c.width = PX_W;
  c.height = PX_H;
  return { c, x: c.getContext("2d")! };
}

function finish(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** The pale mount every painting sits in, and the area inside it. */
function mount(x: CanvasRenderingContext2D, colour = "#e6dfd2") {
  x.fillStyle = colour;
  x.fillRect(0, 0, PX_W, PX_H);
  return { m: 46, w: PX_W - 92, h: PX_H - 92 };
}

function caption(x: CanvasRenderingContext2D, text: string) {
  x.fillStyle = "#3a3832";
  x.font = "600 20px Georgia, serif";
  x.textAlign = "center";
  x.fillText(text.toUpperCase(), PX_W / 2, PX_H - 14);
}

/** A soft-edged blob, the closest a canvas gets to a watercolour wash. */
function wash(x: CanvasRenderingContext2D, cx: number, cy: number, r: number, colour: string) {
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, colour);
  g.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = g;
  x.fillRect(cx - r, cy - r, r * 2, r * 2);
}

/* --- fjord at dusk: the ridge is notched by the cluster's bad days ------- */

function fjord(history: UptimeDay[] | undefined) {
  const { c, x } = canvas();
  const { m, w, h } = mount(x);
  const horizon = m + h * 0.56;
  const sky = x.createLinearGradient(0, m, 0, horizon);
  sky.addColorStop(0, "#34445a");
  sky.addColorStop(0.7, "#9a7f78");
  sky.addColorStop(1, "#d3a37a");
  x.fillStyle = sky;
  x.fillRect(m, m, w, horizon - m);
  wash(x, m + w * 0.72, m + h * 0.2, 60, "rgba(240,226,196,0.35)");
  x.fillStyle = "#efe2c4";
  x.beginPath();
  x.arc(m + w * 0.72, m + h * 0.2, 22, 0, Math.PI * 2);
  x.fill();

  /* The far ridge, one peak per day of history. A day below full uptime
     cuts a notch as deep as the share of checks that failed, so a clean
     month is a smooth skyline. */
  const days = history?.length ? history.slice(-30) : [];
  const n = Math.max(days.length, 18);
  const pts: [number, number][] = [];
  for (let k = 0; k <= n; k++) {
    const px = m + (w * k) / n;
    const base = horizon - 120 - 70 * Math.abs(Math.sin(k * 0.55 + 0.8)) - 30 * Math.sin(k * 0.21);
    const day = days[k - (n + 1 - days.length)];
    const bad = day && day.total > 0 ? 1 - day.ok / day.total : 0;
    pts.push([px, base + Math.min(90, bad * 900)]);
  }
  const ridge = (lift: number, colour: string, scale = 1) => {
    x.fillStyle = colour;
    x.beginPath();
    x.moveTo(m, horizon);
    for (const [px, py] of pts) x.lineTo(px, horizon - (horizon - py) * scale + lift);
    x.lineTo(m + w, horizon);
    x.closePath();
    x.fill();
  };
  ridge(0, "#56636b");
  ridge(40, "#3c474e", 0.75);

  // The water, and the ridge in it upside down and fainter.
  const water = x.createLinearGradient(0, horizon, 0, m + h);
  water.addColorStop(0, "#5f6765");
  water.addColorStop(1, "#262e32");
  x.fillStyle = water;
  x.fillRect(m, horizon, w, m + h - horizon);
  x.save();
  x.globalAlpha = 0.3;
  x.translate(0, horizon * 2);
  x.scale(1, -1);
  ridge(0, "#56636b");
  x.restore();
  x.fillStyle = "rgba(239,226,196,0.35)";
  x.fillRect(m + w * 0.72 - 3, horizon + 8, 6, h * 0.3);

  // In the reflection, mirrored as water would show it.
  x.save();
  x.globalAlpha = 0.12;
  x.translate(m + w * 0.3, horizon + 70);
  x.scale(1, -1);
  x.fillStyle = "#e6dfd2";
  x.font = "italic 34px Georgia, serif";
  x.textAlign = "center";
  x.fillText("genesis", 0, 0);
  x.restore();

  caption(x, TITLES.fjord);
  return finish(c);
}

/* --- northern lights: the helm in the stars, tonight's moon -------------- */

/** 0 new, 0.5 full, from the mean synodic month off a known new moon. */
function moonPhase(now = new Date()) {
  const known = Date.UTC(2000, 0, 6, 18, 14);
  const days = (now.getTime() - known) / 86_400_000;
  return ((days / 29.530588853) % 1 + 1) % 1;
}

function aurora() {
  const { c, x } = canvas();
  const { m, w, h } = mount(x);
  const sky = x.createLinearGradient(0, m, 0, m + h);
  sky.addColorStop(0, "#0b1420");
  sky.addColorStop(0.75, "#16263a");
  sky.addColorStop(1, "#1b2d3e");
  x.fillStyle = sky;
  x.fillRect(m, m, w, h);

  // the ribbons of light
  x.globalCompositeOperation = "lighter";
  for (let band = 0; band < 3; band++) {
    x.strokeStyle = band === 1 ? "rgba(140,200,150,0.22)" : "rgba(101,161,110,0.2)";
    x.lineWidth = 46 - band * 10;
    x.beginPath();
    for (let k = 0; k <= 40; k++) {
      const px = m + (w * k) / 40;
      const py = m + h * (0.28 + band * 0.07) + Math.sin(k * 0.35 + band) * 34;
      if (k === 0) x.moveTo(px, py);
      else x.lineTo(px, py);
    }
    x.stroke();
  }
  x.globalCompositeOperation = "source-over";

  // faint stars, then the seven bright ones round a hub: the helm's wheel
  for (let k = 0; k < 90; k++) {
    x.fillStyle = "rgba(220,230,240,0.45)";
    x.fillRect(m + ((k * 97) % w), m + ((k * 61) % (h * 0.5)), 2, 2);
  }
  const hub: [number, number] = [m + w * 0.3, m + h * 0.16];
  x.strokeStyle = "rgba(220,230,240,0.12)";
  x.lineWidth = 1;
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI / 2 + (k * Math.PI * 2) / 7;
    const sx = hub[0] + Math.cos(a) * 46;
    const sy = hub[1] + Math.sin(a) * 46;
    x.beginPath();
    x.moveTo(hub[0], hub[1]);
    x.lineTo(sx, sy);
    x.stroke();
    x.fillStyle = "#f2f5f8";
    x.beginPath();
    x.arc(sx, sy, 3.2, 0, Math.PI * 2);
    x.fill();
  }

  // tonight's moon: the lit disc with the dark side laid over it
  const phase = moonPhase();
  const mx = m + w * 0.78;
  const my = m + h * 0.14;
  const r = 20;
  x.fillStyle = "#efe6cf";
  x.beginPath();
  x.arc(mx, my, r, 0, Math.PI * 2);
  x.fill();
  const lit = Math.cos(phase * Math.PI * 2); // 1 new, -1 full
  x.fillStyle = "#0e1824";
  x.beginPath();
  if (phase < 0.5) {
    x.arc(mx, my, r, Math.PI / 2, -Math.PI / 2);
    x.ellipse(mx, my, Math.abs(lit) * r, r, 0, -Math.PI / 2, Math.PI / 2, lit < 0);
  } else {
    x.arc(mx, my, r, -Math.PI / 2, Math.PI / 2);
    x.ellipse(mx, my, Math.abs(lit) * r, r, 0, Math.PI / 2, -Math.PI / 2, lit < 0);
  }
  x.fill();

  // pines along a frozen lake, the ice dark and catching the lights
  const shore = m + h * 0.72;
  const ice = x.createLinearGradient(0, shore, 0, m + h);
  ice.addColorStop(0, "#3d5160");
  ice.addColorStop(1, "#1e2a35");
  x.fillStyle = ice;
  x.fillRect(m, shore, w, m + h - shore);
  wash(x, m + w * 0.5, shore + 40, 160, "rgba(101,161,110,0.18)");
  x.fillStyle = "#08100c";
  for (let k = 0; k < 16; k++) {
    const tx = m + (w * (k + 0.3)) / 16;
    const th = 70 + ((k * 37) % 60);
    x.beginPath();
    x.moveTo(tx - 16, shore);
    x.lineTo(tx, shore - th);
    x.lineTo(tx + 16, shore);
    x.closePath();
    x.fill();
  }

  caption(x, TITLES.aurora);
  return finish(c);
}

/* --- hytte by the lake: a duck on holiday, smoke that blames DNS ---------- */

function hytte() {
  const { c, x } = canvas();
  const { m, w, h } = mount(x);
  const horizon = m + h * 0.52;
  const sky = x.createLinearGradient(0, m, 0, horizon);
  sky.addColorStop(0, "#9fb4c4");
  sky.addColorStop(1, "#e3dccb");
  x.fillStyle = sky;
  x.fillRect(m, m, w, horizon - m);
  // mountains across the lake
  x.fillStyle = "#7d8b90";
  x.beginPath();
  x.moveTo(m, horizon);
  x.lineTo(m + w * 0.25, horizon - 130);
  x.lineTo(m + w * 0.45, horizon - 60);
  x.lineTo(m + w * 0.7, horizon - 150);
  x.lineTo(m + w, horizon - 40);
  x.lineTo(m + w, horizon);
  x.closePath();
  x.fill();
  // the lake
  x.fillStyle = "#8ea3ae";
  x.fillRect(m, horizon, w, h * 0.18);
  // the near bank
  const bank = horizon + h * 0.18;
  x.fillStyle = "#5c6b45";
  x.fillRect(m, bank, w, m + h - bank);

  // the cabin: red walls, white trim, a turf roof and a chimney
  const cx = m + w * 0.32;
  const cy = bank + 30;
  x.fillStyle = "#8f2f24";
  x.fillRect(cx, cy, 130, 80);
  x.fillStyle = "#4f5a32";
  x.beginPath();
  x.moveTo(cx - 14, cy);
  x.lineTo(cx + 65, cy - 46);
  x.lineTo(cx + 144, cy);
  x.closePath();
  x.fill();
  x.fillStyle = "#efe9de";
  x.fillRect(cx + 22, cy + 22, 26, 24);
  x.fillRect(cx + 82, cy + 22, 26, 24);
  x.fillStyle = "#3c3a35";
  x.fillRect(cx + 96, cy - 50, 12, 30);

  // smoke that drifts into a sentence
  x.save();
  x.fillStyle = "rgba(90,90,90,0.55)";
  x.font = "italic 15px Georgia, serif";
  const words = "it's always DNS";
  let sx = cx + 104;
  let sy = cy - 58;
  for (let k = 0; k < words.length; k++) {
    x.fillText(words[k], sx, sy);
    sx += 8 + k * 0.2;
    sy -= 4 + Math.sin(k * 0.7) * 3;
  }
  x.restore();

  // birches by the cabin
  for (const bx of [m + w * 0.12, m + w * 0.82, m + w * 0.9]) {
    x.fillStyle = "#e8e4da";
    x.fillRect(bx, bank - 150, 9, 190);
    x.fillStyle = "#2c2c28";
    for (let k = 0; k < 6; k++) x.fillRect(bx, bank - 140 + k * 28, 9, 3);
    wash(x, bx + 4, bank - 160, 46, "rgba(120,150,80,0.55)");
  }

  // a very small yellow duck, out on the lake
  const dx = m + w * 0.66;
  const dy = horizon + h * 0.11;
  x.fillStyle = "#e6bf3a";
  x.beginPath();
  x.ellipse(dx, dy, 7, 4, 0, 0, Math.PI * 2);
  x.fill();
  x.beginPath();
  x.arc(dx + 5, dy - 5, 3.2, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = "#d98a2b";
  x.fillRect(dx + 8, dy - 5.5, 3, 1.6);

  caption(x, TITLES.hytte);
  return finish(c);
}

/* --- birch forest: an elk among the trunks, Morse on the bark ----------- */

function birch() {
  const { c, x } = canvas();
  const { m, w, h } = mount(x, "#e9e3d7");
  wash(x, m + w * 0.5, m + h * 0.3, 320, "rgba(173,186,140,0.55)");
  wash(x, m + w * 0.3, m + h * 0.75, 260, "rgba(150,160,110,0.45)");

  // the elk, standing behind the trunks, so only parts of it show
  const ex = m + w * 0.52;
  const ey = m + h * 0.62;
  x.fillStyle = "#4a3a2c";
  x.beginPath();
  x.ellipse(ex, ey, 64, 34, 0, 0, Math.PI * 2);
  x.fill();
  x.fillRect(ex - 48, ey + 20, 9, 70);
  x.fillRect(ex + 38, ey + 20, 9, 70);
  x.beginPath();
  x.ellipse(ex + 74, ey - 26, 22, 14, -0.5, 0, Math.PI * 2);
  x.fill();
  x.strokeStyle = "#4a3a2c";
  x.lineWidth = 5;
  x.beginPath();
  x.moveTo(ex + 66, ey - 40);
  x.lineTo(ex + 58, ey - 70);
  x.moveTo(ex + 62, ey - 56);
  x.lineTo(ex + 44, ey - 64);
  x.moveTo(ex + 80, ey - 40);
  x.lineTo(ex + 92, ey - 70);
  x.stroke();

  // the trunks, in front of everything
  const trunks = [0.08, 0.22, 0.4, 0.58, 0.74, 0.9];
  trunks.forEach((t, i) => {
    const tx = m + w * t;
    const tw = 22 + (i % 3) * 6;
    x.fillStyle = "#efece4";
    x.fillRect(tx - tw / 2, m, tw, h);
    x.fillStyle = "#2d2b27";
    if (i === 3) {
      // H I in Morse, down the bark: four dots, a gap, two dots
      const marks = [0, 1, 2, 3, 6, 7];
      marks.forEach((k) => x.fillRect(tx - 5, m + 120 + k * 34, 10, 6));
    } else {
      for (let k = 0; k < 9; k++) {
        const len = 6 + ((k * 7 + i * 3) % 12);
        x.fillRect(tx - tw / 2 + ((k * 5) % (tw - len)), m + 40 + k * 70 + i * 9, len, 4);
      }
    }
  });

  caption(x, TITLES.birch);
  return finish(c);
}

function draw(art: Art) {
  switch (art.kind) {
    case "fjord":
      return fjord(art.history);
    case "aurora":
      return aurora();
    case "hytte":
      return hytte();
    case "birch":
      return birch();
  }
}

/**
 * A framed painting with a mount, its face drawn from `art`. Looking at it
 * offers a closer look, which is a hint in the caption slot.
 *
 * Origin at the wall face, local +z into the room.
 */
export function Painting({
  position,
  rotation = [0, 0, 0],
  art,
  width = 0.44,
  height = 0.58,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  art: Art;
  width?: number;
  height?: number;
}) {
  const say = useSay();
  // The fjord redraws when the history changes; the rest draw once.
  const key = art.kind === "fjord" ? JSON.stringify(art.history?.slice(-30) ?? []) : art.kind;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` stands in for `art`
  const map = useMemo(() => draw(art), [key]);
  useEffect(() => () => map.dispose(), [map]);
  const inset = Math.min(width, height) * 0.06;

  return (
    <Interactive
      label="the painting"
      verb="look closer"
      detail={TITLES[art.kind]}
      onActivate={() => say(HINTS[art.kind])}
    >
      <group position={position} rotation={rotation}>
        <mesh position={[0, 0, 0.012]} castShadow>
          <boxGeometry args={[width, height, 0.024]} />
          <meshStandardMaterial color="#4a3323" roughness={0.5} metalness={0} />
        </mesh>
        <mesh position={[0, 0, 0.025]}>
          <planeGeometry args={[width - inset * 2, height - inset * 2]} />
          <meshStandardMaterial map={map} roughness={0.88} metalness={0} />
        </mesh>
      </group>
    </Interactive>
  );
}
