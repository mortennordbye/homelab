"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LeaderLabel } from "./LeaderLabel";
import { makeNoise } from "./Sonos";

/**
 * Lying down on the bed. You meant to rest your eyes, you are gone in seconds,
 * and the dream is sheep and wishful thinking until the alarm arrives the way films
 * shoot a soldier coming round after a shell: the blast, then hearing first and
 * wrong, a ring over everything, the picture blown out and soft until a few
 * slow blinks pull it back.
 */

type Lid = { closed: number; ms: number };
type Step = [at: number, closed: number, ms: number];

/** Milliseconds after lying down. The camera takes about a second and a half
 *  to get there, so the ceiling is seen before the first blink. */
const DRIFT: Step[] = [
  [1600, 1, 600],
  [2300, 0.5, 500],
  [3000, 1, 900],
];
const ASLEEP_AT = 4000;
const ALARM_AT = 12000;
/** The blast comes first; the eyes open once it has rung out. */
const EYES_AT = ALARM_AT + 1500;
const COME_ROUND: Step[] = [
  [EYES_AT, 0.5, 1200],
  [EYES_AT + 1400, 1, 500],
  [EYES_AT + 2100, 0.3, 900],
  [EYES_AT + 3300, 0.8, 400],
  [EYES_AT + 3800, 0, 1100],
];
/** Reduced motion: one fade down and one fade up. No blinks, dream or daze. */
const FADES: Step[] = [
  [1600, 1, 1500],
  [EYES_AT, 0, 800],
];

/** How long hearing and sight take to come back. */
const CLEAR_MS = 6000;
const ALARM_S = 30;
/** Still in bed two seconds after the eyes first open, and someone comes to
 *  fetch you. */
const VISIT_AT = EYES_AT + 2000;
/** He speaks once he is at the bedside; Visitor.tsx takes 1.3s to walk him in. */
const VOICE_AT = VISIT_AT + 1300;
/** The order to get up: a stock synthetic voice, not a clone of anyone.
 *  Provenance in branding/ASSETS.md. */
const ORDER = "/fun/order.mp3";
/** Seconds into ORDER at which each line starts, read off its silences. Any
 *  re-cut of the file has to re-time these. */
const CUES: [at: number, text: string | null][] = [
  [0.25, "GET THE FUCK OUT OF BED, MOTHERFUCKER."],
  [2.19, "IT IS TIME TO MAKE SHAREHOLDER VALUE AND BURN SOME AI TOKENS."],
  [4.9, null],
  [5.71, "YOU ARE TIRED."],
  [7.02, "THE COMPETITION IS ALREADY GRINDING WHILE YOU SLEEP."],
  [9.3, null],
  [10.04, "WALL STREET DOES NOT CARE."],
  [11.55, null],
  [12.38, "FEET ON THE FLOOR!"],
  [14.0, "HANDS ON THE KEYBOARD."],
  [15.33, "TIME TO BUILD THE FUTURE."],
  [16.8, "LET'S GET TO FUCKING WORK."],
];

const CLOCK_FROM = 23 * 60 + 48;
const CLOCK_TO = CLOCK_FROM + 6 * 60 + 42;
const DREAM_MS = ALARM_AT - ASLEEP_AT - 800;

const DARK = "#050403";
const WOOL = "#d6cfc0";
const HIDE = "#6b6156";
const BRASS = "#b98f4e";
const CLAUDE = "#d97757";
/** Uneven on purpose: the spark is hand-drawn, not a regular star. */
const RAYS = [24, 18, 23, 19, 24, 17, 22, 24, 18, 23, 19, 21];

/**
 * The blast, then every alarm in the building at once, heard from under water:
 * the alarms run through a lowpass that opens over CLEAR_MS, under a tinnitus
 * tone that fades as it does. The blast is not muffled. It is what did it.
 */
function ring(ctx: AudioContext) {
  const t0 = ctx.currentTime + 0.05;
  const a = t0 + 0.9;
  const clear = CLEAR_MS / 1000;
  const voices: AudioScheduledSourceNode[] = [];

  const master = ctx.createGain();
  master.gain.value = 0.2;
  master.connect(ctx.destination);

  // Exponential ramps cannot touch zero, hence the small floor values.
  const fade = (from: number, to: number, start: number, end: number) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(from, start);
    g.gain.exponentialRampToValueAtTime(to, end);
    return g;
  };
  const play = (src: AudioScheduledSourceNode, start: number, end: number) => {
    src.start(start);
    src.stop(end);
    voices.push(src);
  };

  const rumble = ctx.createBufferSource();
  rumble.buffer = makeNoise(ctx);
  rumble.loop = true;
  const rumbleLp = ctx.createBiquadFilter();
  rumbleLp.type = "lowpass";
  rumbleLp.frequency.setValueAtTime(1200, t0);
  rumbleLp.frequency.exponentialRampToValueAtTime(50, t0 + 1.4);
  rumble.connect(rumbleLp).connect(fade(1, 0.0001, t0, t0 + 1.5)).connect(master);
  play(rumble, t0, t0 + 1.6);

  const thump = ctx.createOscillator();
  thump.frequency.setValueAtTime(110, t0);
  thump.frequency.exponentialRampToValueAtTime(28, t0 + 0.9);
  thump.connect(fade(1, 0.0001, t0, t0 + 1.1)).connect(master);
  play(thump, t0, t0 + 1.2);

  const ear = ctx.createOscillator();
  ear.frequency.value = 4100;
  const earGain = fade(0.0001, 0.3, t0 + 0.2, t0 + 0.7);
  earGain.gain.exponentialRampToValueAtTime(0.0001, a + clear);
  ear.connect(earGain).connect(master);
  play(ear, t0 + 0.2, a + clear);

  const muffle = ctx.createBiquadFilter();
  muffle.type = "lowpass";
  muffle.frequency.setValueAtTime(380, a);
  muffle.frequency.exponentialRampToValueAtTime(9000, a + clear);
  muffle.connect(master);

  const klaxon = ctx.createOscillator();
  klaxon.type = "sawtooth";
  for (let i = 0; i * 0.3 < ALARM_S; i++) {
    klaxon.frequency.setValueAtTime(i % 2 ? 466 : 622, a + i * 0.3);
  }
  const klaxonGain = ctx.createGain();
  klaxonGain.gain.value = 0.3;
  klaxon.connect(klaxonGain).connect(muffle);
  play(klaxon, a, a + ALARM_S);

  const siren = ctx.createOscillator();
  siren.frequency.value = 900;
  const sweep = ctx.createOscillator();
  sweep.frequency.value = 0.7;
  const sweepDepth = ctx.createGain();
  sweepDepth.gain.value = 500;
  sweep.connect(sweepDepth).connect(siren.frequency);
  const sirenGain = ctx.createGain();
  sirenGain.gain.value = 0.3;
  siren.connect(sirenGain).connect(muffle);
  play(sweep, a, a + ALARM_S);
  play(siren, a, a + ALARM_S);

  // The bedside clock, panicking: bursts of six, alternating pitch.
  for (let burst = 0; burst * 0.75 < ALARM_S; burst++) {
    for (let i = 0; i < 6; i++) {
      const t = a + burst * 0.75 + i * 0.09;
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = burst % 2 ? 2637 : 1976;
      const env = fade(0.0001, 0.6, t, t + 0.006);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      osc.connect(env).connect(muffle);
      play(osc, t, t + 0.07);
    }
  }

  return {
    /** Drops the alarm under a voice without stopping it. */
    duck: () => master.gain.setTargetAtTime(0.04, ctx.currentTime, 0.25),
    stop: () => {
      for (const v of voices) {
        try {
          v.stop();
        } catch {
          // already stopped
        }
      }
      master.disconnect();
    },
  };
}

/**
 * The order to get up, once, with its captions cued off the same start. When it
 * has been said and ignored, `onDone` is where the talking stops.
 * Played through the context the lie-down gesture unlocked: an <audio> element
 * started from a timer is refused by Safari.
 */
function speak(
  ctx: AudioContext,
  onCue: (text: string | null) => void,
  onDone: () => void,
): () => void {
  let stopped = false;
  let src: AudioBufferSourceNode | null = null;
  let timers: ReturnType<typeof setTimeout>[] = [];

  const say = (buf: AudioBuffer) => {
    if (stopped) return;
    src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    timers = CUES.map(([at, text]) => setTimeout(() => onCue(text), at * 1000));
    src.onended = () => {
      onCue(null);
      if (!stopped) onDone();
    };
    src.start();
  };
  void fetch(ORDER)
    .then((r) => r.arrayBuffer())
    .then((b) => ctx.decodeAudioData(b))
    // No audio is no reason to be left in bed.
    .then(say, onDone);

  return () => {
    stopped = true;
    timers.forEach(clearTimeout);
    try {
      src?.stop();
    } catch {
      // already ended
    }
  };
}

export function useSleep(lying: boolean, reduced: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const [lid, setLid] = useState<Lid>({ closed: 0, ms: 0 });
  const [asleep, setAsleep] = useState(false);
  /** True from the alarm until sight is back. */
  const [dazed, setDazed] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [visitor, setVisitor] = useState(false);
  const [shout, setShout] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  /* Has to be called from the interact handler itself: browsers only let audio
     start from a gesture, and the alarm goes off from a timer long after it. */
  const arm = useCallback(() => {
    ctxRef.current ??= new AudioContext();
    void ctxRef.current.resume();
  }, []);

  useEffect(() => {
    if (!lying) return;
    let alarm: ReturnType<typeof ring> | null = null;
    let hush: (() => void) | null = null;
    const steps = reduced ? FADES : [...DRIFT, ...COME_ROUND];
    const timers = [
      ...steps.map(([at, closed, ms]) => setTimeout(() => setLid({ closed, ms }), at)),
      setTimeout(() => setAsleep(true), ASLEEP_AT),
      setTimeout(() => {
        if (ctxRef.current) alarm = ring(ctxRef.current);
        setAsleep(false);
        setDazed(!reduced);
      }, ALARM_AT),
      setTimeout(() => setClearing(true), EYES_AT),
      setTimeout(() => {
        setDazed(false);
        setClearing(false);
      }, EYES_AT + CLEAR_MS),
      setTimeout(() => setVisitor(!reduced), VISIT_AT),
      setTimeout(() => {
        if (reduced || !ctxRef.current) return;
        alarm?.duck();
        hush = speak(ctxRef.current, setShout, () => setDragging(true));
      }, VOICE_AT),
    ];
    // Standing up at any point ends it, so nobody is held under the alarm.
    return () => {
      timers.forEach(clearTimeout);
      alarm?.stop();
      hush?.();
      setLid({ closed: 0, ms: 300 });
      setAsleep(false);
      setDazed(false);
      setClearing(false);
      setVisitor(false);
      setShout(null);
      setDragging(false);
    };
  }, [lying, reduced]);

  // Dropped as well as closed: the ref outlives a Fast Refresh or a StrictMode
  // remount, and a closed context plays nothing and cannot be resumed.
  useEffect(
    () => () => {
      void ctxRef.current?.close();
      ctxRef.current = null;
    },
    [],
  );

  /* For the canvas wrapper. Set hard while the lids are still shut, then eased
     off once they open. Only ever present during the daze: a filter over a live
     canvas costs a pass per frame. */
  const canvasStyle: React.CSSProperties | undefined = dazed
    ? {
        filter: clearing ? "blur(0px) brightness(1)" : "blur(14px) brightness(1.9)",
        transition: clearing ? `filter ${CLEAR_MS}ms ease-in-out` : "none",
      }
    : undefined;

  return { arm, lid, asleep, blast: dazed && !clearing, visitor, shout, dragging, canvasStyle };
}

/** 0 to 1 across the dream. */
function useDreamProgress(run: boolean, reduced: boolean) {
  const [k, setK] = useState(0);
  useEffect(() => {
    if (!run) return;
    const t0 = performance.now();
    let raf = requestAnimationFrame(function tick(now) {
      const next = reduced ? 1 : Math.min(1, (now - t0) / DREAM_MS);
      setK(next);
      if (next < 1) raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [run, reduced]);
  return k;
}

function clockText(k: number) {
  const min = Math.round(CLOCK_FROM + (CLOCK_TO - CLOCK_FROM) * k);
  const h = String(Math.floor(min / 60) % 24).padStart(2, "0");
  const m = String(min % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function Sheep() {
  return (
    <svg viewBox="0 0 132 90" className="block h-auto w-[clamp(96px,13vw,180px)]">
      <g fill={HIDE}>
        {[34, 47, 68, 81].map((x) => (
          <rect key={x} x={x} y={58} width={7} height={28} rx={3} />
        ))}
      </g>
      <g fill={WOOL}>
        <circle cx={26} cy={48} r={9} />
        <circle cx={38} cy={44} r={18} />
        <circle cx={58} cy={36} r={20} />
        <circle cx={78} cy={42} r={18} />
        <circle cx={50} cy={54} r={16} />
        <circle cx={70} cy={56} r={16} />
      </g>
      {/* The head is the Claude spark, with eyes. Rays this wide merge into a
          solid middle, which is the face. */}
      <g stroke={CLAUDE} strokeWidth={6} strokeLinecap="round">
        {RAYS.map((len, i) => {
          const th = (i / RAYS.length) * Math.PI * 2 + 0.2;
          return (
            <line key={i} x1={104} y1={40} x2={104 + Math.cos(th) * len} y2={40 + Math.sin(th) * len} />
          );
        })}
      </g>
      <circle cx={99.5} cy={38.5} r={2.2} fill={DARK} />
      <circle cx={108.5} cy={38.5} r={2.2} fill={DARK} />
    </svg>
  );
}

const SHEEP_S = 2.6;
const SHEEP = Array.from({ length: 6 }, (_, i) => 0.2 + i * 1.3);

/** What drifts past while you are out: [x, y] is where it ends up, in vw/vh
 *  from a point under the caption. Fanned out so none crosses the way out. */
const DREAMS: [text: string, dx: number, dy: number][] = [
  ["infinite tokens", -38, 6],
  ["rate limit: none", 36, 14],
  ["context window: unlimited", -30, 26],
  ["all checks passed, first try", 34, 2],
  ["terraform plan: no changes", -40, 18],
  ["zero pages tonight", 30, 28],
];

const SHADOW = "0 1px 1px rgba(0,0,0,0.95), 0 0 3px rgba(0,0,0,0.9)";

/** Mounted only while asleep, so every nap replays it from the first sheep.
 *  The last sheep is timed to still be in the air when the blast lands. */
function Dream() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[16] overflow-hidden">
      {/* The upper third, clear of the caption and the way out under it. */}
      <div className="absolute inset-x-0 top-[35vh] h-0">
        <span
          className="absolute inset-x-[8%] top-0 h-px"
          style={{
            background:
              "linear-gradient(to right, rgba(127,90,47,0), rgba(185,143,78,0.5), rgba(127,90,47,0))",
          }}
        />
        <svg
          viewBox="0 0 80 60"
          className="absolute bottom-0 left-1/2 h-[12vh] w-auto -translate-x-1/2"
          fill="#7f5a2f"
        >
          <rect x={8} y={0} width={7} height={60} />
          <rect x={65} y={0} width={7} height={60} />
          <rect x={0} y={12} width={80} height={6} />
          <rect x={0} y={34} width={80} height={6} />
        </svg>
        {SHEEP.map((delay, i) => (
          <div
            key={delay}
            className="absolute bottom-0 left-0"
            style={{ animation: `room-sheep-run ${SHEEP_S}s linear ${delay}s both` }}
          >
            <div style={{ animation: `room-sheep-hop ${SHEEP_S}s ease-in-out ${delay}s both` }}>
              <p
                className="mb-1 text-center font-mono text-[11px] text-fg-3"
                style={{ textShadow: SHADOW }}
              >
                {i + 1}
              </p>
              <Sheep />
            </div>
          </div>
        ))}
      </div>

      {DREAMS.map(([text, dx, dy], i) => (
        <p
          key={text}
          className="absolute left-1/2 top-[66vh] whitespace-nowrap font-mono text-[13px] tracking-[0.12em]"
          style={
            {
              color: BRASS,
              textShadow: SHADOW,
              "--dx": `${dx}vw`,
              "--dy": `${dy}vh`,
              animation: `room-dream-pass 3.6s ease-in ${0.3 + i * 1.15}s both`,
            } as React.CSSProperties
          }
        >
          {text}
        </p>
      ))}
    </div>
  );
}

export function SleepOverlay({
  lid,
  asleep,
  blast,
  shout,
  reduced,
}: {
  lid: Lid;
  asleep: boolean;
  blast: boolean;
  shout: string | null;
  reduced: boolean;
}) {
  const k = useDreamProgress(asleep, reduced);

  return (
    <>
      {/* Under the HUD on purpose: the way out of the bed stays readable over
          shut eyes. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[15] overflow-hidden">
        {reduced ? (
          <div
            className="absolute inset-0"
            style={{
              background: DARK,
              opacity: lid.closed,
              transition: `opacity ${lid.ms}ms ease-in-out`,
            }}
          />
        ) : (
          [-1, 1].map((side) => (
            <div
              key={side}
              className="absolute -inset-x-[10%] h-[75%]"
              style={{
                [side < 0 ? "top" : "bottom"]: 0,
                background: DARK,
                borderRadius: side < 0 ? "0 0 50% 50% / 0 0 16% 16%" : "50% 50% 0 0 / 16% 16% 0 0",
                // Sized in vh so the open lid's 22vh of travel always hides it.
                boxShadow: `0 0 8vh 5vh ${DARK}`,
                transform: `translateY(${side * (1 - lid.closed) * 130}%)`,
                transition: `transform ${lid.ms}ms ease-in-out`,
              }}
            />
          ))
        )}
      </div>

      {asleep && !reduced && <Dream />}
      {shout && (
        <div className="pointer-events-none absolute left-1/2 top-[70%] z-20 -translate-x-1/2">
          <LeaderLabel caption={shout} />
        </div>
      )}

      {/* The blast, as seen through shut eyelids. */}
      {blast && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[16]"
          style={{
            background: `radial-gradient(ellipse at center, #d9763a 0%, #7a2a10 55%, ${DARK} 100%)`,
            animation: "room-blast 1.3s ease-out both",
          }}
        />
      )}

      <div
        className="pointer-events-none absolute left-1/2 top-[calc(50%-72px)] z-20 -translate-x-1/2"
        // Fades in, cuts out: its scrim would sit on the blast as a dark oval.
        style={{ opacity: asleep ? 1 : 0, transition: asleep ? "opacity 700ms" : "none" }}
      >
        <LeaderLabel caption="you ended up sleeping" detail={clockText(k)} />
      </div>
    </>
  );
}
