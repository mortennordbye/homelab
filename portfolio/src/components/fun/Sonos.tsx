"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { InfoCard } from "./Hud";
import { Interactive } from "./interaction";

/**
 * The Sonos Era 100 on the TV bench, which plays the obvious thing when you
 * press E on it.
 *
 * The melody is synthesised from oscillators rather than played from a file.
 * Two reasons, and the second is the one that decided it: shipping the actual
 * recording means committing someone else's master to the repo, and the room
 * is already 6.5MB of assets served off a home uplink with no CDN in front of
 * it. A chiptune rendition costs zero bytes and is arguably the funnier joke.
 *
 * The underlying composition is of course still Stock/Aitken/Waterman's. This
 * is a fourteen-second monophonic beep rendition behind a link to the real
 * thing, which is the same footing every rickroll has ever operated on.
 */

/**
 * MIDI note numbers, 0 = rest, paired with a length in sixteenth notes.
 *
 * Written on a sixteenth grid rather than an eighth one. The pitches were
 * always right; the rhythm was the problem. "Ne-ver gon-na" is a fast pickup
 * running into a held "give", and on an eighth grid the shortest note
 * available *is* the pickup note, so the four syllables came out evenly spaced
 * and the same length as the words they lead into. It dragged, and a dragged
 * hook is an unrecognisable hook.
 */
const MELODY: [number, number][] = [
  // "Never gonna give you up"
  [72, 2], [74, 2], [77, 2], [74, 2],
  [81, 6], [81, 6], [79, 12],
  // "Never gonna let you down"
  [72, 2], [74, 2], [77, 2], [74, 2],
  [79, 6], [79, 6], [77, 3], [76, 1], [74, 8], [0, 4],
  // "Never gonna run around and desert you"
  [72, 2], [74, 2], [77, 2], [74, 2],
  [77, 6], [79, 4], [76, 6], [74, 2],
  [72, 4], [0, 2], [72, 2], [79, 4], [77, 12],
];

/** Sixteenth note. Slightly ahead of the record's 113bpm — the synth rendition
 *  has no groove to carry it, so it wants to be brisk. */
const SIXTEENTH = 0.108;
const BAR = 16 * SIXTEENTH;

/** Bars of drums before the vocal comes in, as on the record. */
const INTRO_BARS = 2;

const midiToHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

/* -----------------------------------------------------------------------------
   Drum machine.

   The melody on its own was the problem: the hook is carried as much by that
   four-on-the-floor pattern as by the notes, and a bare monophonic tune has no
   groove under it to be recognised against. All three voices are synthesised
   from an oscillator or a noise burst — a drum sample is still a sample, and
   the whole point of doing this in code was to add no bytes.
----------------------------------------------------------------------------- */

/** A short block of white noise, the raw material for snare and hat. */
function makeNoise(ctx: BaseAudioContext): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * 0.4);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

/** Kick: a sine pitched sharply downward. The drop is the beater. */
function kick(ctx: BaseAudioContext, dest: AudioNode, t: number) {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(48, t + 0.11);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(1, t + 0.005);
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.19);
  osc.connect(env);
  env.connect(dest);
  osc.start(t);
  osc.stop(t + 0.2);
  return osc;
}

/** Snare: filtered noise with a fast decay. */
function snare(
  ctx: BaseAudioContext,
  dest: AudioNode,
  noise: AudioBuffer,
  t: number,
  level = 0.7,
) {
  const src = ctx.createBufferSource();
  const hp = ctx.createBiquadFilter();
  const env = ctx.createGain();
  src.buffer = noise;
  hp.type = "highpass";
  hp.frequency.value = 1400;
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(level, t + 0.004);
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
  src.connect(hp);
  hp.connect(env);
  env.connect(dest);
  src.start(t);
  src.stop(t + 0.15);
  return src;
}

/** Hat: the same noise, higher and much shorter. */
function hat(
  ctx: BaseAudioContext,
  dest: AudioNode,
  noise: AudioBuffer,
  t: number,
  level: number,
) {
  const src = ctx.createBufferSource();
  const hp = ctx.createBiquadFilter();
  const env = ctx.createGain();
  src.buffer = noise;
  hp.type = "highpass";
  hp.frequency.value = 7000;
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(level, t + 0.002);
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
  src.connect(hp);
  hp.connect(env);
  env.connect(dest);
  src.start(t);
  src.stop(t + 0.05);
  return src;
}

/**
 * One bar of the groove: kick on all four, snare on two and four, hats on the
 * eighths with the offbeats dropped back so the bar has a pulse rather than a
 * flat tick. `fill` turns the last beat into a run of sixteenths, which is what
 * hands the bar over to the vocal.
 */
function scheduleBar(
  ctx: BaseAudioContext,
  dest: AudioNode,
  noise: AudioBuffer,
  t0: number,
  fill: boolean,
): AudioScheduledSourceNode[] {
  const out: AudioScheduledSourceNode[] = [];
  const at = (step: number) => t0 + step * SIXTEENTH;

  for (const step of [0, 4, 8, 12]) out.push(kick(ctx, dest, at(step)));
  for (let step = 0; step < 16; step += 2) {
    out.push(hat(ctx, dest, noise, at(step), step % 4 === 0 ? 0.28 : 0.16));
  }
  if (fill) {
    out.push(snare(ctx, dest, noise, at(4)));
    for (const step of [12, 13, 14, 15]) {
      out.push(snare(ctx, dest, noise, at(step), 0.5 + (step - 12) * 0.12));
    }
  } else {
    for (const step of [4, 12]) out.push(snare(ctx, dest, noise, at(step)));
  }
  return out;
}

/**
 * Schedules the whole melody up front and hands back a stop function.
 *
 * Everything is scheduled in one go against the context clock rather than
 * driven by a timer per note. Timers drift, and a melody whose notes arrive
 * late by a few milliseconds each is exactly as recognisable as a wrong one.
 */
function useRickroll() {
  const ctxRef = useRef<AudioContext | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = useCallback(() => {
    // Second press stops it, so nobody is trapped in the room with it.
    if (stopRef.current) {
      stopRef.current();
      return;
    }

    // The context is created inside the keypress handler on purpose: browsers
    // only allow audio to start from a user gesture, and E is one.
    const ctx = ctxRef.current ?? new AudioContext();
    ctxRef.current = ctx;
    void ctx.resume();

    const master = ctx.createGain();
    master.gain.value = 0.14;
    master.connect(ctx.destination);

    // Separate busses so the kit can sit under the tune rather than on top of
    // it. Mixed as one bus the drums buried the melody completely.
    const drums = ctx.createGain();
    drums.gain.value = 0.5;
    drums.connect(master);
    const lead = ctx.createGain();
    lead.gain.value = 0.9;
    lead.connect(master);

    const voices: AudioScheduledSourceNode[] = [];
    const start = ctx.currentTime + 0.08;
    const noise = makeNoise(ctx);

    // Melody enters after the intro bars; the kit runs underneath to the end.
    const melodyLen = MELODY.reduce((a, [, len]) => a + len * SIXTEENTH, 0);
    const bars = INTRO_BARS + Math.ceil(melodyLen / BAR);
    for (let b = 0; b < bars; b++) {
      voices.push(
        ...scheduleBar(ctx, drums, noise, start + b * BAR, b === INTRO_BARS - 1),
      );
    }

    let t = start + INTRO_BARS * BAR;

    for (const [midi, len] of MELODY) {
      const dur = len * SIXTEENTH;
      if (midi > 0) {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        // Triangle rather than square: a square wave at this volume through
        // laptop speakers is genuinely unpleasant, and the joke should not
        // come with a wince.
        osc.type = "triangle";
        osc.frequency.value = midiToHz(midi);
        // Exponential ramps cannot touch zero, hence the small floor values.
        // The note is cut at 82% of its slot rather than run to the end of it,
        // which puts an audible gap between repeated pitches — without one,
        // the two A's of "give you" run together into a single long note.
        env.gain.setValueAtTime(0.0001, t);
        env.gain.exponentialRampToValueAtTime(0.9, t + 0.008);
        env.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.82);
        osc.connect(env);
        env.connect(lead);
        osc.start(t);
        osc.stop(t + dur * 0.85);
        voices.push(osc);
      }
      t += dur;
    }

    // The kit can outlast the melody by up to a bar, so the run ends on
    // whichever finishes last rather than cutting the drums off mid-bar.
    const endsAt = Math.max(t, start + bars * BAR);
    const endsIn = (endsAt - ctx.currentTime) * 1000 + 150;
    const timer = setTimeout(() => stopRef.current?.(), endsIn);

    stopRef.current = () => {
      clearTimeout(timer);
      for (const v of voices) {
        try {
          v.stop();
        } catch {
          // already stopped; scheduling is fire-and-forget by design
        }
      }
      master.disconnect();
      stopRef.current = null;
      setPlaying(false);
    };
    setPlaying(true);
  }, []);

  // Walking out of the room has to silence it too.
  useEffect(
    () => () => {
      stopRef.current?.();
      void ctxRef.current?.close();
    },
    [],
  );

  return { playing, toggle };
}

export const RICKROLL_CARD: InfoCard = {
  kicker: "now playing",
  title: "Never Gonna Give You Up",
  subtitle: "Rick Astley · 1987",
  rows: [
    { k: "Speaker", v: "Sonos Era 100" },
    { k: "Source", v: "A synthesiser, badly" },
  ],
  body: "You have been rickrolled by a portfolio site. Press E again to make it stop.",
  href: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  hrefLabel: "the real thing",
};

/**
 * Sonos Era 100 in white, at its real 182 x 120 x 130mm.
 *
 * The cross-section is an oval rather than a circle, which is most of what
 * makes it read as this speaker and not a paint tin — a scaled cylinder gets
 * it for free. What sells the rest is the two-material split: matte fabric
 * grille against a smooth plastic top. The touch controls are a real recess in
 * that top, not a drawn line, because a 1mm step drawn on a flat surface
 * disappears the moment it is lit from anywhere.
 */
export function Sonos({
  position,
  rotation = [0, 0, 0],
  onOpen,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  onOpen: (card: InfoCard) => void;
}) {
  const { playing, toggle } = useRickroll();
  const led = useRef<THREE.Mesh>(null);

  const H = 0.1825;
  const R = 0.06;
  const OVAL = 1.08; // 130mm deep against 120mm wide

  // The status LED breathes while it is playing and sits steady when it is not,
  // so the speaker carries its own state without needing the HUD to say so.
  useFrame(({ clock }) => {
    if (!led.current) return;
    const m = led.current.material as THREE.MeshBasicMaterial;
    m.opacity = playing
      ? 0.55 + 0.45 * Math.sin(clock.getElapsedTime() * 7)
      : 0.32;
    m.color.set(playing ? "#8fe3b0" : "#c9ced4");
  });

  return (
    <Interactive
      label="Sonos Era 100"
      verb={playing ? "stop" : "play"}
      detail={playing ? "currently ruining the mood" : "there is one song on it"}
      onActivate={() => {
        toggle();
        if (!playing) onOpen(RICKROLL_CARD);
      }}
    >
      {(hovered) => (
        <group position={position} rotation={rotation} scale={[1, 1, OVAL]}>
          {/* fabric grille */}
          <mesh position={[0, H / 2 - 0.008, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[R, R, H - 0.016, 40]} />
            <meshStandardMaterial
              color="#eceae6"
              roughness={0.94}
              metalness={0}
              emissive={hovered ? "#ffd9a6" : "#000000"}
              emissiveIntensity={hovered ? 0.22 : 0}
            />
          </mesh>

          {/* top cap, smooth plastic, very slightly proud of the grille */}
          <mesh position={[0, H - 0.006, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[R + 0.001, R + 0.001, 0.012, 40]} />
            <meshStandardMaterial color="#f7f6f4" roughness={0.36} metalness={0.02} />
          </mesh>

          {/* the volume channel, cut into the cap rather than drawn on it */}
          <mesh position={[0, H - 0.0015, 0]}>
            <boxGeometry args={[0.052, 0.004, 0.011]} />
            <meshStandardMaterial color="#dedcd8" roughness={0.5} />
          </mesh>

          {/* base, tucked under so the speaker does not sit flush on its grille */}
          <mesh position={[0, 0.004, 0]} receiveShadow>
            <cylinderGeometry args={[R - 0.004, R - 0.004, 0.008, 32]} />
            <meshStandardMaterial color="#e2e0dc" roughness={0.6} />
          </mesh>

          {/* status LED on the front edge of the cap */}
          <mesh ref={led} position={[0, H + 0.0005, 0.026]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.0035, 16]} />
            <meshBasicMaterial color="#c9ced4" transparent opacity={0.32} />
          </mesh>
        </group>
      )}
    </Interactive>
  );
}
