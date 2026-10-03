"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/** The drifting poster behind both RoomLoading and RoomIntro, which have to
 *  match or the handover between them is a visible cut. */
export function RoomBackdrop() {
  return (
    <>
      <Image
        src="/images/room-poster.jpg"
        alt=""
        aria-hidden
        fill
        priority
        sizes="100vw"
        className="room-enter__poster object-cover brightness-[0.42] saturate-[0.85]"
        style={{ objectPosition: "50% 58%" }}
      />
      <span
        aria-hidden
        className="absolute inset-0 bg-[repeating-linear-gradient(180deg,rgba(0,0,0,0.26)_0_1px,transparent_1px_3px)]"
      />
      <span
        aria-hidden
        className="absolute inset-0 shadow-[inset_0_0_200px_70px_rgba(0,0,0,0.85)]"
      />
    </>
  );
}

const JOKES = [
  "it's always DNS",
  "terraform plan: 1 room to add, 0 to change, 0 to destroy",
  "asking etcd for quorum on where the sofa goes",
  "restarting the pod that was fine all along",
  "hanging the certificates slightly crooked, for realism",
  "convincing the GPU this was a good idea",
  "untangling the cables behind the TV bench",
  "lighting the stove. cold starts take a while",
  "rolling the wallpaper back to the last known good version",
  "teaching the printer to print instead of jam",
  "the cache is cold, and so is the flat",
  "kubectl apply -f furniture.yaml",
  "vacuuming under the sofa. it is a stateful workload",
  "renewing the doormat's TLS certificate",
  "the coffee machine is in CrashLoopBackOff",
  "hiding the laundry in a namespace you can't list",
  "giving the houseplants a liveness probe",
  "scaling the bookshelf to three replicas",
  "fixing a typo in production. the front door is production",
  "waiting for the ArgoCD sync. it says Progressing, it means vibes",
  "explaining to the cat that this is not a load balancer",
  "pinning the furniture to a specific version, never latest",
  "running terraform apply on a Friday. what could go wrong",
  "taking out the trash. garbage collection is manual here",
  "tightening the network policy on the fridge",
  "rebasing the rug onto the new floor",
  "checking if the stove passed its security scan",
  "this loading screen has a 99.9% uptime SLA",
  "drawing the curtains. the neighbours can see the dashboards",
];

/* Module-level so the fallback screen and the intro that replaces it carry on
   from the same joke instead of both starting at the first. */
let jokeAt = -1;

/** One joke at a time while the room loads, swapped every few seconds. */
export function LoadingJoke() {
  const [i, setI] = useState(jokeAt);
  useEffect(() => {
    /* The random start waits for the client: picked during render, the server
       HTML and the first client render would disagree. */
    const start = setTimeout(() => {
      if (jokeAt < 0) jokeAt = Math.floor(Math.random() * JOKES.length);
      setI(jokeAt);
    }, 0);
    const t = setInterval(() => {
      jokeAt = (jokeAt + 1) % JOKES.length;
      setI(jokeAt);
    }, 3800);
    return () => {
      clearTimeout(start);
      clearInterval(t);
    };
  }, []);
  if (i < 0) return null;
  return (
    <p
      key={i}
      aria-live="polite"
      className="room-joke mt-5 max-w-[40ch] text-center font-mono text-[12px] text-snow/55"
    >
      {JOKES[i]}
    </p>
  );
}

/** How far the room has really got: its code has arrived, its textures and
 *  model are in, or it is building the scene. Each lights one fitting. */
export type LoadStage = "code" | "assets" | "building";

const STAGES: LoadStage[] = ["code", "assets", "building"];

/** Pixel positions in room-poster.jpg. The phone crop shows the stove whole
 *  and catches the lantern and desk lamp spilling in from the edges. */
const LIGHTS: { stage: LoadStage; x: number; y: number; r: number; fire?: boolean }[] = [
  { stage: "code", x: 446, y: 272, r: 82 },
  { stage: "assets", x: 217, y: 279, r: 56 },
  { stage: "building", x: 390, y: 313, r: 60, fire: true },
];

function RoomLights({ stage }: { stage: LoadStage }) {
  const reached = STAGES.indexOf(stage);
  return (
    <div aria-hidden className="room-enter__poster room-lights pointer-events-none absolute inset-0">
      {LIGHTS.map((l) => (
        <span
          key={l.stage}
          data-on={STAGES.indexOf(l.stage) <= reached}
          className={l.fire ? "room-light room-light--fire" : "room-light"}
          style={{ "--x": l.x, "--y": l.y, "--r": l.r } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

/**
 * The screen between the hero and the room: the hero's poster, drifting
 * inward until the scene resolves behind it. Only works while the poster's
 * framing and the room's opening camera pose agree — see docs/backlog/README.md on
 * regenerating it. Two callers: the dynamic-import fallback has no progress
 * yet and gets an indeterminate bar; the mounted room takes over with real
 * byte progress on the identical screen.
 */
export function RoomLoading({
  progress,
  done = false,
  stage,
}: {
  progress?: number;
  done?: boolean;
  /** Lights the poster stage by stage. Building the scene reports no
   *  progress, so that stage gets the indeterminate bar rather than a bar
   *  sitting at 100%. */
  stage?: LoadStage;
}) {
  const building = stage === "building" && !done;
  const indeterminate = progress === undefined || building;

  /* Unmount once the fade has run. A full-viewport image left sitting at
     opacity 0 over the canvas is an extra compositing layer for the rest of
     the session, and the room needs the GPU more than this does. */
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setGone(true), 760);
    return () => clearTimeout(t);
  }, [done]);

  if (gone) return null;

  return (
    <div
      aria-hidden={done}
      className="pointer-events-none fixed inset-0 z-[120] overflow-hidden bg-bg transition-opacity duration-700"
      style={{ opacity: done ? 0 : 1 }}
    >
      <RoomBackdrop />
      {stage && <RoomLights stage={stage} />}

      <div className="absolute inset-0 grid place-content-center">
        <p className="eyebrow mb-6 text-center text-[0.65rem] text-fg-3">
          nordbye.it · the room
        </p>
        <div className="h-[3px] w-[260px] overflow-hidden rounded-full bg-fg/10">
          <div
            className={
              indeterminate
                ? "room-enter__bar h-full w-1/3 rounded-full bg-accent"
                : "h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
            }
            style={indeterminate ? undefined : { width: `${Math.max(4, Math.round(progress))}%` }}
          />
        </div>
        <p className="mt-4 text-center font-mono text-[11px] tabular-nums text-fg-3">
          {building
            ? "building the room"
            : indeterminate
            ? "warming up the room…"
            : done
              ? "ready"
              : `loading the room · ${Math.round(progress)}%`}
        </p>
        {!done && <LoadingJoke />}
      </div>
    </div>
  );
}
