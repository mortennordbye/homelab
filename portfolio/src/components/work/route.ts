/**
 * Orthogonal edge routing that never passes through a box.
 *
 * Builds a sparse grid from every box's edges pushed out by `PAD`, the box
 * centres (where the ports sit) and the lanes halfway between them, then runs
 * A* over it with a cost for each bend and for running along a segment an
 * earlier edge already uses. A grid point may sit on a padded box's border but
 * never inside it, so a route can graze the clearance and never touch a box.
 *
 * Pure and deterministic: the server and client draw the same diagram.
 */

export type Rect = { x: number; y: number; w: number; h: number };

/** Every diagram box is this tall; width is per node, this when unset. */
export const NODE_HEIGHT = 56;
export const NODE_DEFAULT_WIDTH = 150;

export type Route = {
  /** SVG path data. */
  d: string;
  length: number;
  label: { x: number; y: number; anchor: "middle" | "start" | "end" };
  points: [number, number][];
};

/** Clearance kept between a line and any box. */
const PAD = 14;
/** What one extra corner is worth in units of length. */
const BEND = 36;
/** Extra cost per unit of length already used by an earlier edge. */
const SHARED = 0.6;
/** Extra cost per unit of length run along a group's dashed border. */
const BORDER = 2;
/** How close to a group border a run counts as running along it. */
const NEAR = 10;

type Side = "top" | "bottom" | "left" | "right";
const SIDES: Side[] = ["top", "bottom", "left", "right"];

const inflate = (r: Rect, p: number): Rect => ({ x: r.x - p, y: r.y - p, w: r.w + 2 * p, h: r.h + 2 * p });

/**
 * Where an edge leaves a box: on its border, and the padded point outside it.
 * `along` moves the port off the centre of its side, so two boxes that share a
 * span can be joined by a straight line instead of a jog.
 */
function port(r: Rect, side: Side, along?: number): { at: [number, number]; out: [number, number] } {
  const cx = side === "top" || side === "bottom" ? (along ?? r.x + r.w / 2) : r.x + r.w / 2;
  const cy = side === "left" || side === "right" ? (along ?? r.y + r.h / 2) : r.y + r.h / 2;
  switch (side) {
    case "top":
      return { at: [cx, r.y], out: [cx, r.y - PAD] };
    case "bottom":
      return { at: [cx, r.y + r.h], out: [cx, r.y + r.h + PAD] };
    case "left":
      return { at: [r.x, cy], out: [r.x - PAD, cy] };
    case "right":
      return { at: [r.x + r.w, cy], out: [r.x + r.w + PAD, cy] };
  }
}

const strictlyInside = (x: number, y: number, r: Rect) => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h;

/** Does an axis-aligned segment pass through the interior of any rect? */
function crosses(x1: number, y1: number, x2: number, y2: number, rects: Rect[]): boolean {
  if (y1 === y2) {
    const [a, b] = x1 < x2 ? [x1, x2] : [x2, x1];
    return rects.some((r) => y1 > r.y && y1 < r.y + r.h && a < r.x + r.w && b > r.x);
  }
  const [a, b] = y1 < y2 ? [y1, y2] : [y2, y1];
  return rects.some((r) => x1 > r.x && x1 < r.x + r.w && a < r.y + r.h && b > r.y);
}

const uniqSorted = (v: number[]) => [...new Set(v.map((n) => Math.round(n * 2) / 2))].sort((a, b) => a - b);

/** The middle of the span two boxes share along one axis, if they share enough of it. */
function shared(a0: number, a1: number, b0: number, b1: number): number | undefined {
  const lo = Math.max(a0, b0);
  const hi = Math.min(a1, b1);
  return hi - lo >= 24 ? (lo + hi) / 2 : undefined;
}

/** Coordinates the grid runs along: padded box edges, centres, the lanes between, and shared spans. */
function axes(boxes: Rect[], view: { w: number; h: number }, extraX: number[], extraY: number[]) {
  const xs: number[] = [PAD, view.w - PAD, ...extraX];
  const ys: number[] = [PAD, view.h - PAD, ...extraY];
  for (const b of boxes) {
    xs.push(b.x - PAD, b.x + b.w + PAD, b.x + b.w / 2);
    ys.push(b.y - PAD, b.y + b.h + PAD, b.y + b.h / 2);
  }
  const lanes = (v: number[]) => {
    const s = uniqSorted(v);
    const mids = s.slice(1).map((n, i) => (n + s[i]) / 2);
    return uniqSorted([...s, ...mids]);
  };
  return { xs: lanes(xs), ys: lanes(ys) };
}

type Grid = {
  xs: number[];
  ys: number[];
  ok: boolean[][];
  rects: Rect[];
  borders: Rect[];
};

/** Is an axis-aligned run lying along (not across) a group's border? */
function alongBorder(x1: number, y1: number, x2: number, y2: number, borders: Rect[]): boolean {
  if (y1 === y2) {
    const [a, b] = x1 < x2 ? [x1, x2] : [x2, x1];
    return borders.some(
      (g) => (Math.abs(y1 - g.y) < NEAR || Math.abs(y1 - (g.y + g.h)) < NEAR) && a < g.x + g.w && b > g.x,
    );
  }
  const [a, b] = y1 < y2 ? [y1, y2] : [y2, y1];
  return borders.some(
    (g) => (Math.abs(x1 - g.x) < NEAR || Math.abs(x1 - (g.x + g.w)) < NEAR) && a < g.y + g.h && b > g.y,
  );
}

function buildGrid(
  boxes: Rect[],
  obstacles: Rect[],
  borders: Rect[],
  view: { w: number; h: number },
  extraX: number[],
  extraY: number[],
): Grid {
  const rects = [...boxes, ...obstacles].map((b) => inflate(b, PAD));
  const { xs, ys } = axes([...boxes, ...obstacles], view, extraX, extraY);
  const ok = xs.map((x) => ys.map((y) => !rects.some((r) => strictlyInside(x, y, r))));
  return { xs, ys, ok, rects, borders };
}

const segKey = (x1: number, y1: number, x2: number, y2: number) =>
  x1 < x2 || (x1 === x2 && y1 < y2) ? `${x1},${y1},${x2},${y2}` : `${x2},${y2},${x1},${y1}`;

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/** A* over the grid from one grid point to another; null when walled off. */
function search(
  g: Grid,
  from: [number, number],
  to: [number, number],
  startDir: number,
  endDir: number,
  used: Set<string>,
): { cost: number; cells: [number, number][] } | null {
  const fi = g.xs.indexOf(from[0]);
  const fj = g.ys.indexOf(from[1]);
  const ti = g.xs.indexOf(to[0]);
  const tj = g.ys.indexOf(to[1]);
  if (fi < 0 || fj < 0 || ti < 0 || tj < 0 || !g.ok[fi][fj] || !g.ok[ti][tj]) return null;

  const W = g.ys.length;
  const key = (i: number, j: number, d: number) => (i * W + j) * 4 + d;
  const best = new Map<number, number>();
  const prev = new Map<number, number>();
  const h = (i: number, j: number) => Math.abs(g.xs[i] - g.xs[ti]) + Math.abs(g.ys[j] - g.ys[tj]);

  // Small binary heap on f = cost + heuristic.
  const heap: [number, number, number, number, number][] = [];
  const push = (n: [number, number, number, number, number]) => {
    heap.push(n);
    let k = heap.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (heap[p][0] <= heap[k][0]) break;
      [heap[p], heap[k]] = [heap[k], heap[p]];
      k = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let k = 0;
      for (;;) {
        const l = 2 * k + 1;
        const r = l + 1;
        let m = k;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === k) break;
        [heap[m], heap[k]] = [heap[k], heap[m]];
        k = m;
      }
    }
    return top;
  };

  const s = key(fi, fj, startDir);
  best.set(s, 0);
  push([h(fi, fj), 0, fi, fj, startDir]);

  while (heap.length) {
    const [, cost, i, j, d] = pop();
    const k = key(i, j, d);
    if (cost > (best.get(k) ?? Infinity)) continue;
    if (i === ti && j === tj) {
      const total = cost + (d === endDir ? 0 : BEND);
      const cells: [number, number][] = [];
      let c: number | undefined = k;
      while (c !== undefined) {
        const cell = Math.floor(c / 4);
        cells.push([g.xs[Math.floor(cell / W)], g.ys[cell % W]]);
        c = prev.get(c);
      }
      return { cost: total, cells: cells.reverse() };
    }
    DIRS.forEach(([dx, dy], nd) => {
      // No reversing on the spot.
      if (DIRS[d][0] === -dx && DIRS[d][1] === -dy) return;
      const ni = i + dx;
      const nj = j + dy;
      if (ni < 0 || nj < 0 || ni >= g.xs.length || nj >= W || !g.ok[ni][nj]) return;
      const x1 = g.xs[i];
      const y1 = g.ys[j];
      const x2 = g.xs[ni];
      const y2 = g.ys[nj];
      if (crosses(x1, y1, x2, y2, g.rects)) return;
      const len = Math.abs(x2 - x1) + Math.abs(y2 - y1);
      const extra =
        (used.has(segKey(x1, y1, x2, y2)) ? SHARED : 0) + (alongBorder(x1, y1, x2, y2, g.borders) ? BORDER : 0);
      const step = len * (1 + extra) + (nd === d ? 0 : BEND);
      const nc = cost + step;
      const nk = key(ni, nj, nd);
      if (nc < (best.get(nk) ?? Infinity)) {
        best.set(nk, nc);
        prev.set(nk, k);
        push([nc + h(ni, nj), nc, ni, nj, nd]);
      }
    });
  }
  return null;
}

const outward: Record<Side, number> = { right: 0, left: 1, bottom: 2, top: 3 };
const inward: Record<Side, number> = { right: 1, left: 0, bottom: 3, top: 2 };

/** Collapses runs of collinear points so only the corners remain. */
function corners(pts: [number, number][]): [number, number][] {
  const out: [number, number][] = [];
  for (const p of pts) {
    const n = out.length;
    if (n && out[n - 1][0] === p[0] && out[n - 1][1] === p[1]) continue;
    if (n >= 2) {
      const [a, b] = [out[n - 2], out[n - 1]];
      if ((a[0] === b[0] && b[0] === p[0]) || (a[1] === b[1] && b[1] === p[1])) {
        out[n - 1] = p;
        continue;
      }
    }
    out.push(p);
  }
  return out;
}

const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Edge labels are 10px caps at 0.18em: about 8 units a character, 12 tall. */
const labelBox = (text: string) => ({ w: text.length * 8 + 6, h: 12 });

/**
 * Picks where an edge's label goes: along the longest run it fits on, above a
 * horizontal run or beside a vertical one, on whichever side touches no box.
 * Falls back to above the longest run when nothing is clear.
 */
function placeLabel(pts: [number, number][], text: string | undefined, blocked: Rect[]): Route["label"] {
  const { w, h } = labelBox(text ?? "");
  const runs = pts
    .slice(1)
    .map((b, i) => ({ a: pts[i], b, len: Math.abs(b[0] - pts[i][0]) + Math.abs(b[1] - pts[i][1]) }))
    .sort((p, q) => q.len - p.len);
  for (const { a, b, len } of runs) {
    if (a[1] === b[1]) {
      if (len < w + 8) continue;
      const x = (a[0] + b[0]) / 2;
      for (const y of [a[1] - 6, a[1] + 14]) {
        if (!blocked.some((r) => overlaps({ x: x - w / 2, y: y - h + 2, w, h }, r))) return { x, y, anchor: "middle" };
      }
    } else {
      if (len < h + 12) continue;
      const y = (a[1] + b[1]) / 2 + 4;
      if (!blocked.some((r) => overlaps({ x: a[0] + 6, y: y - h + 2, w, h }, r))) return { x: a[0] + 6, y, anchor: "start" };
      if (!blocked.some((r) => overlaps({ x: a[0] - 6 - w, y: y - h + 2, w, h }, r))) return { x: a[0] - 6, y, anchor: "end" };
    }
  }
  const { a, b } = runs[0];
  return { x: (a[0] + b[0]) / 2, y: Math.min(a[1], b[1]) - 6, anchor: "middle" };
}

function finish(pts: [number, number][], text: string | undefined, blocked: Rect[]): Route {
  let length = 0;
  for (let i = 1; i < pts.length; i++) length += Math.abs(pts[i][0] - pts[i - 1][0]) + Math.abs(pts[i][1] - pts[i - 1][1]);
  const d = pts.map((p, i) => `${i ? "L" : "M"} ${p[0]} ${p[1]}`).join(" ");
  return { d, length, label: placeLabel(pts, text, blocked), points: pts };
}

/**
 * Routes every edge in order. Each edge tries every pair of sides (and, where
 * the two boxes share a span, ports lined up on it) and keeps the cheapest;
 * segments it takes make the same run dearer for the edges after it, so
 * parallel edges spread out instead of stacking. `obstacles` are kept clear
 * like boxes but are never endpoints: group titles, so no line runs through one.
 * `borders` are the groups' outlines, which a line may cross but should not follow.
 */
export function routeAll(
  boxes: Map<string, Rect>,
  edges: { from: string; to: string; label?: string }[],
  view: { w: number; h: number },
  obstacles: Rect[] = [],
  borders: Rect[] = [],
): (Route | null)[] {
  const all = [...boxes.values()];
  const spans = edges.map((e) => {
    const A = boxes.get(e.from);
    const B = boxes.get(e.to);
    if (!A || !B) return { x: undefined, y: undefined };
    return {
      x: shared(A.x, A.x + A.w, B.x, B.x + B.w),
      y: shared(A.y, A.y + A.h, B.y, B.y + B.h),
    };
  });
  const grid = buildGrid(
    all,
    obstacles,
    borders,
    view,
    spans.flatMap((s) => (s.x === undefined ? [] : [s.x])),
    spans.flatMap((s) => (s.y === undefined ? [] : [s.y])),
  );
  const used = new Set<string>();

  return edges.map((e, ei) => {
    const A = boxes.get(e.from);
    const B = boxes.get(e.to);
    if (!A || !B) return null;
    let bestRoute: { cost: number; pts: [number, number][] } | null = null;
    const span = spans[ei];
    const tries: [Side, Side, number | undefined][] = [];
    for (const sa of SIDES) for (const sb of SIDES) tries.push([sa, sb, undefined]);
    // Facing sides joined straight across the shared span.
    if (span.x !== undefined) tries.push(["top", "bottom", span.x], ["bottom", "top", span.x]);
    if (span.y !== undefined) tries.push(["left", "right", span.y], ["right", "left", span.y]);
    for (const [sa, sb, along] of tries) {
      const pa = port(A, sa, along);
      const pb = port(B, sb, along);
      const found = search(grid, pa.out, pb.out, outward[sa], inward[sb], used);
      if (!found) continue;
      const cost = found.cost + 2 * PAD;
      if (!bestRoute || cost < bestRoute.cost) {
        bestRoute = { cost, pts: corners([pa.at, ...found.cells, pb.at]) };
      }
    }
    if (!bestRoute) return null;
    const pts = bestRoute.pts;
    for (let i = 1; i < pts.length; i++) {
      // Mark every grid step along each corner-to-corner run as taken.
      const [x1, y1] = pts[i - 1];
      const [x2, y2] = pts[i];
      if (x1 === x2) {
        const run = grid.ys.filter((y) => y >= Math.min(y1, y2) && y <= Math.max(y1, y2));
        run.slice(1).forEach((y, k) => used.add(segKey(x1, run[k], x1, y)));
      } else {
        const run = grid.xs.filter((x) => x >= Math.min(x1, x2) && x <= Math.max(x1, x2));
        run.slice(1).forEach((x, k) => used.add(segKey(run[k], y1, x, y1)));
      }
    }
    return finish(pts, e.label, [...all, ...obstacles]);
  });
}
