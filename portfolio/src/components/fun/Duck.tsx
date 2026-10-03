"use client";

import { useCallback, useRef } from "react";
import { Interactive, useSay } from "./interaction";

const YELLOW = "#e6bf3a";
const BEAK = "#d98a2b";

const ADVICE = [
  "have you tried reading the error message?",
  "it works on your machine. ship the machine.",
  "explain it to me line by line. slowly.",
  "is it plugged in? the cluster, I mean.",
  "that's not a bug, it's an undocumented feature.",
  "did you check the logs? no, the other logs.",
  "have you tried turning it off and on again?",
  "quack. (check your YAML indentation)",
  "you've stared at this for an hour. it's a typo.",
  "git blame says it was you.",
  "it's not DNS. there's no way it's DNS. it was DNS.",
];

/** Two short nasal bursts: a sawtooth sliding down through a narrow band. */
function quack(ctx: AudioContext) {
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 1100;
  band.Q.value = 4;
  band.connect(ctx.destination);
  for (const at of [0, 0.17]) {
    const t = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(620, t);
    osc.frequency.exponentialRampToValueAtTime(330, t + 0.13);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.35, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    osc.connect(gain).connect(band);
    osc.start(t);
    osc.stop(t + 0.15);
  }
}

/**
 * A rubber duck by the keyboard, for debugging out loud. An easter egg, so no
 * brass Marker: those are for portfolio content only.
 */
export function Duck({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) {
  const ctxRef = useRef<AudioContext | null>(null);
  const last = useRef(-1);
  const say = useSay();

  const ask = useCallback(() => {
    // Activation is always a key press or tap, so the context may start here.
    ctxRef.current ??= new AudioContext();
    quack(ctxRef.current);
    let i = Math.floor(Math.random() * ADVICE.length);
    if (i === last.current) i = (i + 1) % ADVICE.length;
    last.current = i;
    say(`the duck: ${ADVICE[i]}`);
  }, [say]);

  return (
    <Interactive label="the rubber duck" verb="ask" detail="debugging, out loud" onActivate={ask}>
      <group position={position} rotation={[0, rotationY, 0]}>
        {/* body */}
        <mesh position={[0, 0.026, 0]} scale={[1, 0.75, 1.25]} castShadow>
          <sphereGeometry args={[0.034, 20, 14]} />
          <meshStandardMaterial color={YELLOW} roughness={0.35} />
        </mesh>
        {/* tail */}
        <mesh position={[0, 0.042, -0.04]} rotation={[-0.9, 0, 0]}>
          <coneGeometry args={[0.012, 0.03, 12]} />
          <meshStandardMaterial color={YELLOW} roughness={0.35} />
        </mesh>
        {/* head */}
        <mesh position={[0, 0.066, 0.022]} castShadow>
          <sphereGeometry args={[0.022, 20, 14]} />
          <meshStandardMaterial color={YELLOW} roughness={0.35} />
        </mesh>
        {/* beak */}
        <mesh position={[0, 0.062, 0.046]} scale={[1.3, 0.55, 1]}>
          <sphereGeometry args={[0.011, 14, 10]} />
          <meshStandardMaterial color={BEAK} roughness={0.4} />
        </mesh>
        {/* eyes */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.011, 0.073, 0.039]}>
            <sphereGeometry args={[0.0032, 8, 6]} />
            <meshStandardMaterial color="#111" roughness={0.2} />
          </mesh>
        ))}
      </group>
    </Interactive>
  );
}
