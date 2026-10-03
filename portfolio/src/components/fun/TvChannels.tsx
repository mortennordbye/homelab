"use client";

import { useEffect, useRef, useState } from "react";
import { certDaysLeft } from "./feed";
import type { PanelProps } from "./Panels";

/** The TV's channels after the observability panels, in remote order. */
export const EXTRA_CHANNELS = [
  { id: "news", title: "GENESIS NEWS" },
  { id: "slowtv", title: "SAKTE-TV" },
  { id: "dvd", title: "SCREENSAVER" },
  { id: "snake", title: "SNAKE" },
] as const;

export type ExtraId = (typeof EXTRA_CHANNELS)[number]["id"];

/** Every channel here is drawn to the size of the area under the TV's header. */
type Area = { w: number; h: number };

/* -------------------------------------------------------------------------
   News: a rotating headline over a ticker, half jokes and half the real feed.
   ------------------------------------------------------------------------- */

const JOKE_HEADLINES = [
  "Pod restarts, nobody knows why",
  "DNS blamed. DNS innocent. DNS blamed again",
  "Local man runs Kubernetes at home, insists it is cheaper",
  "Terraform plan shows no changes; engineer suspicious",
  "Homelab reaches 99.9% uptime, 0.1% was a Friday deploy",
  "YAML indentation dispute enters third week",
  "Backup restored successfully for the first time; champagne",
];

export function NewsChannel({ data, area }: { data: PanelProps; area: Area }) {
  const apps = data.status?.gitops?.applications?.list ?? [];
  const synced = apps.filter((a) => a.sync === "Synced").length;
  const cert = certDaysLeft(data.status?.cert?.notAfter);
  const real = [
    `${data.nodes.ready} of ${data.nodes.total} nodes report for duty`,
    apps.length ? `${synced} of ${apps.length} apps in sync with Git` : `ArgoCD says ${data.argocd.sync.toLowerCase()}`,
    cert !== null ? `Certificate renews in ${cert} days, nobody panics` : "Certificates: no news is good news",
  ];
  const headlines = [...JOKE_HEADLINES.slice(0, 3), real[0], ...JOKE_HEADLINES.slice(3, 5), real[1], ...JOKE_HEADLINES.slice(5), real[2]];

  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % headlines.length), 6000);
    return () => clearInterval(t);
  }, [headlines.length]);

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ width: area.w, height: area.h, background: "#0c1712" }}>
      <div className="absolute left-0 top-6 flex items-center gap-4 px-8">
        <span className="px-3 py-1 text-[22px] font-bold tracking-[0.2em]" style={{ background: "#b23a2c", color: "#f4efe6" }}>
          BREAKING
        </span>
        <span className="text-[20px] tracking-[0.25em] text-[#8fb39a]">LIVE FROM THE HOMELAB</span>
      </div>
      <div key={i} className="room-joke absolute inset-x-8 top-[38%] text-[46px] leading-tight" style={{ color: "#eef2ea" }}>
        {headlines[i]}
      </div>
      <div className="absolute inset-x-0 bottom-0 flex h-16 items-center overflow-hidden" style={{ background: "#e3c35a", color: "#141a14" }}>
        <span className="z-10 flex h-full shrink-0 items-center px-6 text-[22px] font-bold tracking-[0.15em]" style={{ background: "#141a14", color: "#e3c35a" }}>
          TICKER
        </span>
        <div className="animate-marquee flex shrink-0 gap-16 whitespace-nowrap pl-16 text-[24px]">
          {[...headlines, ...headlines].map((h, k) => (
            <span key={k}>{h} ·</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Sakte-TV: Bergensbanen at night, from the side, for as long as you like.
   ------------------------------------------------------------------------- */

/** A ridge line as an SVG path, repeated so the strip can loop seamlessly. */
function ridge(width: number, height: number, peaks: number, seed: number) {
  let d = `M0 ${height}`;
  for (let k = 0; k <= peaks * 2; k++) {
    const x = (k / (peaks * 2)) * width;
    const up = k % 2 === 1;
    const jitter = ((Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1;
    const y = up ? height * (0.15 + 0.35 * jitter) : height * (0.6 + 0.25 * jitter);
    d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return `${d} L${width} ${height} Z`;
}

export function SlowTvChannel({ area }: { area: Area }) {
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(start);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.floor((now - start) / 1000);
  const clock = `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const layers = [
    { h: area.h * 0.55, colour: "#1d2a3a", speed: 240, peaks: 5, seed: 1 },
    { h: area.h * 0.42, colour: "#14202c", speed: 120, peaks: 7, seed: 2 },
    { h: area.h * 0.3, colour: "#0b141c", speed: 50, peaks: 9, seed: 3 },
  ];

  return (
    <div className="relative overflow-hidden" style={{ width: area.w, height: area.h, background: "linear-gradient(#0a1424, #1b2b45 70%, #2a3b55)" }}>
      {/* stars */}
      {Array.from({ length: 40 }, (_, k) => (
        <span
          key={k}
          className="absolute rounded-full"
          style={{
            left: `${(k * 97) % 100}%`,
            top: `${(k * 53) % 45}%`,
            width: 2,
            height: 2,
            background: "#dfe7f2",
            opacity: 0.3 + ((k * 7) % 10) / 15,
          }}
        />
      ))}
      {/* the mountains, three strips at three speeds */}
      {layers.map((l) => (
        <div
          key={l.seed}
          className="absolute bottom-[22%] left-0 flex"
          style={{ width: area.w * 2, height: l.h, animation: `slowtv-pan ${l.speed}s linear infinite` }}
        >
          {[0, 1].map((n) => (
            <svg key={n} width={area.w} height={l.h} viewBox={`0 0 ${area.w} ${l.h}`} preserveAspectRatio="none">
              <path d={ridge(area.w, l.h, l.peaks, l.seed)} fill={l.colour} />
            </svg>
          ))}
        </div>
      ))}
      {/* snow on the ground, the line, and the train with its lit windows */}
      <div className="absolute inset-x-0 bottom-0" style={{ height: "22%", background: "#c9d3dc" }} />
      <div className="absolute inset-x-0" style={{ bottom: "21%", height: 4, background: "#3b3f44" }} />
      <div className="absolute flex gap-2" style={{ left: "18%", bottom: "21.5%" }}>
        {Array.from({ length: 5 }, (_, k) => (
          <div key={k} className="flex items-center justify-around rounded-sm px-2" style={{ width: 150, height: 46, background: k === 0 ? "#8a1f1a" : "#a3271f" }}>
            {Array.from({ length: k === 0 ? 2 : 5 }, (_, w) => (
              <span key={w} style={{ width: 16, height: 14, background: "#ffd98a", boxShadow: "0 0 12px #ffb84d" }} />
            ))}
          </div>
        ))}
      </div>
      {/* falling snow */}
      <div className="slowtv-snow absolute inset-0" />
      <div className="absolute right-6 top-5 text-right font-mono" style={{ color: "#dfe7f2" }}>
        <div className="text-[20px] tracking-[0.2em]">BERGENSBANEN</div>
        <div className="text-[16px] text-[#9fb0c4]">sakte-TV · {clock} of 7:14:00</div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   The screensaver: a logo bouncing round the glass, cheered when it corners.
   ------------------------------------------------------------------------- */

const BOUNCE = ["#65a16e", "#8db4f0", "#e0b072", "#d06b9a", "#b98f4e", "#9a7fd1"];
const LOGO_W = 230;
const LOGO_H = 96;

export function ScreensaverChannel({ area }: { area: Area }) {
  const box = useRef<HTMLDivElement>(null);
  const [colour, setColour] = useState(0);
  const [corners, setCorners] = useState(0);
  const [cheer, setCheer] = useState(false);

  useEffect(() => {
    let x = area.w * 0.3;
    let y = area.h * 0.2;
    /* 3:2 against a near 16:9 area, so it does find a corner now and then. */
    let vx = 180;
    let vy = 120;
    let last = performance.now();
    let raf = 0;
    let cheerTimer: number | undefined;
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      x += vx * dt;
      y += vy * dt;
      let hitX = false;
      let hitY = false;
      if (x <= 0 || x >= area.w - LOGO_W) {
        vx = -vx;
        x = Math.max(0, Math.min(area.w - LOGO_W, x));
        hitX = true;
      }
      if (y <= 0 || y >= area.h - LOGO_H) {
        vy = -vy;
        y = Math.max(0, Math.min(area.h - LOGO_H, y));
        hitY = true;
      }
      const nearX = x < 6 || x > area.w - LOGO_W - 6;
      const nearY = y < 6 || y > area.h - LOGO_H - 6;
      if (hitX || hitY) {
        setColour((c) => (c + 1) % BOUNCE.length);
        if (nearX && nearY) {
          setCorners((n) => n + 1);
          setCheer(true);
          window.clearTimeout(cheerTimer);
          cheerTimer = window.setTimeout(() => setCheer(false), 2600);
        }
      }
      if (box.current) box.current.style.transform = `translate(${x}px, ${y}px)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(cheerTimer);
    };
  }, [area.w, area.h]);

  return (
    <div className="relative overflow-hidden" style={{ width: area.w, height: area.h, background: "#05080a" }}>
      <div
        ref={box}
        className="absolute left-0 top-0 flex flex-col items-center justify-center rounded-[50%] font-bold"
        style={{ width: LOGO_W, height: LOGO_H, border: `5px solid ${BOUNCE[colour]}`, color: BOUNCE[colour] }}
      >
        <span className="text-[34px] tracking-[0.2em]">GENESIS</span>
        <span className="text-[13px] tracking-[0.4em]">HOMELAB</span>
      </div>
      {cheer && (
        <div className="absolute inset-0 grid place-content-center text-center">
          <div className="room-joke text-[64px] font-bold tracking-[0.12em]" style={{ color: "#f4efe6", textShadow: "0 0 30px #e0b072" }}>
            IT HIT THE CORNER
          </div>
        </div>
      )}
      <div className="absolute bottom-3 right-5 font-mono text-[16px] text-[#5c6b60]">corners: {corners}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Snake: played with the arrow keys while the remote is in hand.
   ------------------------------------------------------------------------- */

const CELL = 28;
const STEP_MS = 115;
const BEST_KEY = "fun-snake-best";

type Pt = [number, number];

function readBest(): number {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeBest(n: number) {
  try {
    window.localStorage.setItem(BEST_KEY, String(n));
  } catch {
    /* private window or blocked storage: the best simply does not stick */
  }
}

const DIRS: Record<string, Pt> = {
  ArrowUp: [0, -1],
  KeyW: [0, -1],
  ArrowDown: [0, 1],
  KeyS: [0, 1],
  ArrowLeft: [-1, 0],
  KeyA: [-1, 0],
  ArrowRight: [1, 0],
  KeyD: [1, 0],
};

/**
 * The game. Draws to a canvas on a timer while `playing`; otherwise shows the
 * title card. Takes every key while playing (capture, stopped), so walking,
 * jumping and the room's shortcuts all stand still; Esc hands back.
 */
export function SnakeChannel({
  area,
  playing,
  onExit,
}: {
  area: Area;
  playing: boolean;
  onExit: () => void;
}) {
  const cols = Math.floor(area.w / CELL);
  const rows = Math.floor(area.h / CELL);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [best, setBest] = useState(readBest);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    let snake: Pt[] = [
      [Math.floor(cols / 2), Math.floor(rows / 2)],
      [Math.floor(cols / 2) - 1, Math.floor(rows / 2)],
      [Math.floor(cols / 2) - 2, Math.floor(rows / 2)],
    ];
    let dir: Pt = [1, 0];
    let queued: Pt = dir;
    let eaten = 0;
    let dead = false;
    const place = (): Pt => {
      for (;;) {
        const p: Pt = [Math.floor(Math.random() * cols), Math.floor(Math.random() * rows)];
        if (!snake.some(([x, y]) => x === p[0] && y === p[1])) return p;
      }
    };
    let food = place();
    setScore(0);
    setOver(false);

    const draw = () => {
      ctx.fillStyle = "#07100a";
      ctx.fillRect(0, 0, cols * CELL, rows * CELL);
      ctx.fillStyle = "#e0b072";
      ctx.fillRect(food[0] * CELL + 6, food[1] * CELL + 6, CELL - 12, CELL - 12);
      snake.forEach(([x, y], k) => {
        ctx.fillStyle = k === 0 ? "#9fd3a5" : "#65a16e";
        ctx.fillRect(x * CELL + 2, y * CELL + 2, CELL - 4, CELL - 4);
      });
    };

    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.code === "Escape") {
        onExit();
        return;
      }
      if (dead && (e.code === "Space" || e.code === "Enter" || e.code === "KeyP")) {
        setRound((r) => r + 1);
        return;
      }
      const d = DIRS[e.code];
      // No turning back on yourself: that is an instant loss, not a move.
      if (d && !(d[0] === -dir[0] && d[1] === -dir[1])) queued = d;
    };
    window.addEventListener("keydown", onKey, { capture: true });

    draw();
    const t = window.setInterval(() => {
      if (dead) return;
      dir = queued;
      const head: Pt = [snake[0][0] + dir[0], snake[0][1] + dir[1]];
      const hitWall = head[0] < 0 || head[1] < 0 || head[0] >= cols || head[1] >= rows;
      const hitSelf = snake.some(([x, y]) => x === head[0] && y === head[1]);
      if (hitWall || hitSelf) {
        dead = true;
        setOver(true);
        setBest((b) => {
          const n = Math.max(b, eaten);
          if (n > b) writeBest(n);
          return n;
        });
        return;
      }
      snake = [head, ...snake];
      if (head[0] === food[0] && head[1] === food[1]) {
        eaten += 1;
        setScore(eaten);
        food = place();
      } else {
        snake.pop();
      }
      draw();
    }, STEP_MS);

    return () => {
      window.clearInterval(t);
      window.removeEventListener("keydown", onKey, { capture: true });
    };
  }, [playing, round, cols, rows, onExit]);

  return (
    <div className="relative" style={{ width: area.w, height: area.h, background: "#07100a" }}>
      {playing ? (
        <>
          <canvas
            ref={canvas}
            width={cols * CELL}
            height={rows * CELL}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ border: "2px solid #1f3324" }}
          />
          <div className="absolute left-5 top-3 font-mono text-[18px] text-[#9fd3a5]">score {score} · best {best}</div>
          {over && (
            <div className="absolute inset-0 grid place-content-center text-center font-mono" style={{ background: "rgba(7,16,10,0.75)" }}>
              <div className="text-[56px] text-[#eef2ea]">game over</div>
              <div className="mt-3 text-[22px] text-[#9fd3a5]">score {score} · best {best}</div>
              <div className="mt-6 text-[18px] text-[#8a9a8d]">space to play again · esc to leave</div>
            </div>
          )}
        </>
      ) : (
        /* Held in the top half: the crosshair's prompt sits over the middle
           of the screen while you look at it. */
        <div className="flex h-full flex-col items-center pt-6 text-center font-mono">
          <div className="text-[72px] leading-none tracking-[0.3em] text-[#65a16e]">SNAKE</div>
          <div className="mt-6 text-[40px] text-[#eef2ea]">
            hold the remote, press <span className="text-[#e0b072]">P</span> to play
          </div>
          <div className="mt-3 text-[28px] text-[#9fd3a5]">arrows or WASD steer · esc leaves</div>
          <div className="mt-3 text-[24px] text-[#8a9a8d]">best {best}</div>
        </div>
      )}
    </div>
  );
}
