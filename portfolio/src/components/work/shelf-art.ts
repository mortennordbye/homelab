import * as THREE from "three";
import type { Architecture, ArchNode } from "@/content/schemas";

/**
 * Spine and cover artwork for the portfolio shelf.
 *
 * Every volume is stamped from its own case study: the title from the
 * frontmatter, the mark from the `nodes` and `edges` in its `*.arch.ts` — the
 * same source the case study's own diagram renders from, so a cover cannot
 * drift. The `cover` frontmatter field is deliberately unread (see
 * DECISIONS.md §8: landscape images lose their topology cropped to a board).
 *
 * The artwork is drawn white on transparent and then turned into brass foil
 * pressed into linen by `foilMaterial`, which needs four maps rather than one:
 * colour, a metalness mask so only the foil is metal, a roughness mask so the
 * foil is polished against matte cloth, and a normal map built from the
 * gradient of the stamp so the lines sit in a depression.
 */

export type Volume = {
  slug: string;
  title: string;
  kind: string;
  client?: string;
  period?: string;
  arch?: Architecture;
};

const BRASS = [201, 158, 88] as const;
const NODE_H = 54;

function canvasOf(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function wrap(x: CanvasRenderingContext2D, text: string, maxW: number) {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let ln = "";
  for (const w of words) {
    const t = ln ? `${ln} ${w}` : w;
    if (x.measureText(t).width > maxW && ln) {
      out.push(ln);
      ln = w;
    } else ln = t;
  }
  if (ln) out.push(ln);
  return out;
}

/**
 * Narrow and tall. The canvas top is the head of the book and the title reads
 * downward, which is the English convention rather than the continental one.
 */
export function spineStamp(v: Volume, arcLen: number, height: number) {
  const w = Math.max(96, Math.round((280 * arcLen) / 0.26));
  const h = Math.min(1280, Math.round(w * (height / arcLen)));
  const c = canvasOf(w, h);
  const x = c.getContext("2d")!;
  x.strokeStyle = "#fff";
  x.fillStyle = "#fff";
  x.lineCap = "round";

  x.lineWidth = Math.max(1.5, w * 0.03);
  [h * 0.055, h * 0.075, h * 0.925, h * 0.945].forEach((y) => {
    x.beginPath();
    x.moveTo(w * 0.17, y);
    x.lineTo(w * 0.83, y);
    x.stroke();
  });

  x.save();
  x.translate(w / 2, h * 0.145);
  x.rotate(Math.PI / 2);
  x.textAlign = "left";
  x.textBaseline = "middle";
  const avail = h * 0.7;
  let size = w * 0.4;
  let t = v.title.replace(/\s*[-–—]\s*/g, " · ");
  const width = () => {
    x.font = `${size}px "Source Serif 4", Georgia, serif`;
    return x.measureText(t).width;
  };
  while (width() > avail && size > w * 0.19) size *= 0.94;
  if (width() > avail) {
    t = t.split(/[:·]/)[0].trim();
    while (width() > avail && size > w * 0.15) size *= 0.94;
  }
  x.font = `${size}px "Source Serif 4", Georgia, serif`;
  x.fillText(t, 0, 0);
  x.restore();

  x.save();
  x.globalAlpha = 0.9;
  x.lineWidth = Math.max(1, w * 0.018);
  x.strokeRect(w * 0.3, h * 0.845, w * 0.4, h * 0.045);
  x.restore();
  return c;
}

/** The title, a rule, the architecture as a mark, and the client at the foot. */
export function coverStamp(v: Volume) {
  const W = 768;
  const H = Math.round(768 * 1.508);
  const c = canvasOf(W, H);
  const x = c.getContext("2d")!;
  const m = W * 0.072;
  x.strokeStyle = "#fff";
  x.fillStyle = "#fff";
  x.lineJoin = "round";
  x.lineCap = "round";

  x.lineWidth = W * 0.0075;
  x.strokeRect(m, m, W - 2 * m, H - 2 * m);
  x.lineWidth = W * 0.0022;
  x.strokeRect(m + W * 0.021, m + W * 0.021, W - 2 * m - W * 0.042, H - 2 * m - W * 0.042);

  const tm = m + W * 0.085;
  x.textAlign = "center";
  x.textBaseline = "alphabetic";
  let size = W * 0.07;
  const fit = () => {
    x.font = `${size}px "Source Serif 4", Georgia, serif`;
    return wrap(x, v.title.replace(/\s*[-–—]\s*/g, " — "), W - 2 * tm);
  };
  let lines = fit();
  while (lines.length > 3 && size > W * 0.044) {
    size *= 0.9;
    lines = fit();
  }
  let ty = m + W * 0.2;
  lines.slice(0, 3).forEach((ln) => {
    x.fillText(ln, W / 2, ty);
    ty += size * 1.19;
  });

  const ry = ty + W * 0.028;
  x.lineWidth = W * 0.004;
  x.beginPath();
  x.moveTo(W / 2 - W * 0.11, ry);
  x.lineTo(W / 2 + W * 0.11, ry);
  x.stroke();

  const footY = H - m - W * 0.115;
  const arch = v.arch;
  if (arch) {
    const bx = m + W * 0.04;
    const by = ry + W * 0.055;
    const bw = W - 2 * (m + W * 0.04);
    const bh = footY - by - W * 0.035;
    const s = Math.min(bw / arch.viewBox.w, bh / arch.viewBox.h);
    const ox = bx + (bw - arch.viewBox.w * s) / 2;
    const oy = by + (bh - arch.viewBox.h * s) / 2;
    const at = (n: ArchNode) => ({
      cx: ox + (n.x + (n.width ?? 150) / 2) * s,
      cy: oy + (n.y + NODE_H / 2) * s,
    });
    const byId = new Map(arch.nodes.map((n) => [n.id, n]));

    (arch.groups ?? []).forEach((g) => {
      x.save();
      x.globalAlpha = 0.42;
      x.lineWidth = Math.max(1, W * 0.0022);
      x.setLineDash([W * 0.011, W * 0.009]);
      x.strokeRect(ox + g.bounds.x * s, oy + g.bounds.y * s, g.bounds.w * s, g.bounds.h * s);
      x.restore();
    });

    x.save();
    x.globalAlpha = 0.72;
    x.lineWidth = Math.max(1, W * 0.0026);
    arch.edges.forEach((e) => {
      const a = byId.get(e.from);
      const b = byId.get(e.to);
      if (!a || !b) return;
      const p = at(a);
      const q = at(b);
      x.setLineDash(e.style === "supply" ? [W * 0.01, W * 0.008] : []);
      x.beginPath();
      x.moveTo(p.cx, p.cy);
      x.lineTo(q.cx, q.cy);
      x.stroke();
    });
    x.restore();

    x.setLineDash([]);
    x.lineWidth = Math.max(1, W * 0.0034);
    arch.nodes.forEach((n) => {
      const w = (n.width ?? 150) * s;
      const h = NODE_H * s;
      const px = ox + n.x * s;
      const py = oy + n.y * s;
      const r = Math.min(h * 0.28, W * 0.012);
      x.beginPath();
      x.moveTo(px + r, py);
      x.arcTo(px + w, py, px + w, py + h, r);
      x.arcTo(px + w, py + h, px, py + h, r);
      x.arcTo(px, py + h, px, py, r);
      x.arcTo(px, py, px + w, py, r);
      x.closePath();
      x.save();
      x.globalAlpha = n.kind === "external" ? 0.16 : 0.3;
      x.fill();
      x.restore();
      x.stroke();
    });
  }

  x.save();
  x.globalAlpha = 0.82;
  const foot = [v.client, v.period].filter(Boolean).join("   ·   ").toUpperCase();
  let fs = W * 0.03;
  do {
    x.font = `${fs}px "Fragment Mono", ui-monospace, monospace`;
    fs *= 0.94;
  } while (x.measureText(foot).width > W - 2 * tm && fs > W * 0.013);
  x.fillText(foot, W / 2, footY + W * 0.055);
  x.restore();
  return c;
}

function texFrom(c: HTMLCanvasElement, colour: boolean) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = colour ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  return t;
}

/**
 * Turns a white-on-transparent stamp into brass foil debossed into tinted
 * bookcloth. The cloth is tiled underneath so the panel reads as the same
 * material as the board around it rather than as a pasted label.
 */
export function foilMaterial(
  stamp: HTMLCanvasElement,
  tint: string,
  cloth: HTMLImageElement,
  clothNormal: HTMLImageElement,
  tilePx: number,
): THREE.MeshStandardMaterial {
  const W = stamp.width;
  const H = stamp.height;
  const alpha = stamp.getContext("2d")!.getImageData(0, 0, W, H).data;

  const col = canvasOf(W, H);
  const cx = col.getContext("2d", { willReadFrequently: true })!;
  for (let y = 0; y < H; y += tilePx)
    for (let x = 0; x < W; x += tilePx) cx.drawImage(cloth, x, y, tilePx, tilePx);
  cx.globalCompositeOperation = "multiply";
  cx.fillStyle = tint;
  cx.fillRect(0, 0, W, H);
  cx.globalCompositeOperation = "source-over";
  const cd = cx.getImageData(0, 0, W, H);
  const cp = cd.data;
  for (let i = 0; i < cp.length; i += 4) {
    const a = alpha[i + 3] / 255;
    if (a < 0.02) continue;
    cp[i] = cp[i] * (1 - a) + BRASS[0] * a;
    cp[i + 1] = cp[i + 1] * (1 - a) + BRASS[1] * a;
    cp[i + 2] = cp[i + 2] * (1 - a) + BRASS[2] * a;
  }
  cx.putImageData(cd, 0, 0);

  // ARM: green is roughness, blue is metalness.
  const arm = canvasOf(W, H);
  const ax = arm.getContext("2d")!;
  const ad = ax.createImageData(W, H);
  const ap = ad.data;
  for (let i = 0; i < ap.length; i += 4) {
    const a = alpha[i + 3] / 255;
    ap[i] = 255;
    ap[i + 1] = (0.92 * (1 - a) + 0.3 * a) * 255;
    ap[i + 2] = a * 255;
    ap[i + 3] = 255;
  }
  ax.putImageData(ad, 0, 0);

  const nrm = canvasOf(W, H);
  const nx = nrm.getContext("2d", { willReadFrequently: true })!;
  for (let y = 0; y < H; y += tilePx)
    for (let x = 0; x < W; x += tilePx) nx.drawImage(clothNormal, x, y, tilePx, tilePx);
  const nd = nx.getImageData(0, 0, W, H);
  const np = nd.data;
  const at = (px: number, py: number) => {
    const qx = Math.max(0, Math.min(W - 1, px));
    const qy = Math.max(0, Math.min(H - 1, py));
    return alpha[(qy * W + qx) * 4 + 3] / 255;
  };
  const K = 70; // how deep the foil is pressed
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const gx = at(x + 1, y) - at(x - 1, y);
      const gy = at(x, y + 1) - at(x, y - 1);
      if (gx === 0 && gy === 0) continue;
      const i = (y * W + x) * 4;
      np[i] = Math.max(0, Math.min(255, np[i] + gx * K));
      np[i + 1] = Math.max(0, Math.min(255, np[i + 1] - gy * K));
    }
  nx.putImageData(nd, 0, 0);

  return new THREE.MeshStandardMaterial({
    map: texFrom(col, true),
    normalMap: texFrom(nrm, false),
    roughnessMap: texFrom(arm, false),
    metalnessMap: texFrom(arm, false),
    normalScale: new THREE.Vector2(1.4, 1.4),
    roughness: 1,
    metalness: 1,
    envMapIntensity: 0.8,
  });
}

/**
 * The spine round. A binder rounds a spine by roughly a quarter of its
 * thickness, not a half circle: a shallow segment of a much larger circle
 * whose chord is the thickness. A true half-round reads as a bolster.
 */
function spineArc(T: number, bt: number, rf = 0.26) {
  const s = rf * T;
  const r = (s * s + (T / 2) * (T / 2)) / (2 * s);
  const cx = r - s;
  return {
    cx,
    cy: T / 2,
    r,
    a: Math.atan2(T / 2, -cx),
    r2: Math.hypot(cx, T / 2 - bt),
    a2: Math.atan2(T / 2 - bt, -cx),
  };
}

/**
 * A cylindrical patch over the spine round with UVs laid out properly, so text
 * maps onto it. ExtrudeGeometry's position-derived UVs cannot do this. The
 * winding must be counter-clockwise seen from outside or the patch is culled.
 */
export function spinePatch(W: number, T: number, bt: number, H: number, span: number, lift: number) {
  const A = spineArc(T, bt);
  const half = (Math.PI - A.a) * span;
  const NS = 26;
  const NL = 2;
  const r = A.r + lift;
  const cx = A.cx - W / 2;
  const pos: number[] = [];
  const uv: number[] = [];
  const nor: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= NL; j++) {
    const v = j / NL;
    const z = -H / 2 + v * H;
    for (let i = 0; i <= NS; i++) {
      const u = i / NS;
      const ph = Math.PI - half + u * 2 * half;
      const nxv = Math.cos(ph);
      const nyv = Math.sin(ph);
      pos.push(cx + r * nxv, nyv * r, z);
      nor.push(nxv, nyv, 0);
      uv.push(u, v);
    }
  }
  for (let j = 0; j < NL; j++)
    for (let i = 0; i < NS; i++) {
      const a = j * (NS + 1) + i;
      const b = a + 1;
      const c = a + NS + 1;
      const d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return { geo: g, arcLen: 2 * half * r };
}

/** The spine shell alone, for a volume whose boards need to hinge separately. */
export function spineShellGeometry(W: number, H: number, T: number, bt: number) {
  const A = spineArc(T, bt);
  const sh = new THREE.Shape();
  sh.absarc(A.cx, A.cy, A.r, -A.a, A.a, true);
  sh.absarc(A.cx, A.cy, A.r2, A.a2, -A.a2, false);
  const g = new THREE.ExtrudeGeometry(sh, { depth: H, curveSegments: 30, bevelEnabled: false });
  g.translate(-W / 2, -T / 2, -H / 2);
  return g;
}

/** Page edges: a few hundred stripes of varying width and lightness. */
export function pageEdgeCanvas() {
  const w = 256;
  const h = 512;
  const c = canvasOf(w, h);
  const x = c.getContext("2d")!;
  x.fillStyle = "#d9cfb4";
  x.fillRect(0, 0, w, h);
  let y = 0;
  while (y < h) {
    const t = 1.4 + Math.random() * 3.2;
    const v = 0.6 + Math.random() * 0.4;
    const warm = 0.94 + Math.random() * 0.06;
    x.fillStyle = `rgb(${(217 * v) | 0},${(207 * v * warm) | 0},${(180 * v * warm) | 0})`;
    x.fillRect(0, y, w, t);
    x.fillStyle = `rgba(60,48,32,${0.1 + Math.random() * 0.16})`;
    x.fillRect(0, y + t - 0.7, w, 0.7);
    y += t;
  }
  return c;
}

export { texFrom };
