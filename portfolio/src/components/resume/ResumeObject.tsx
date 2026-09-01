"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_FLAGS, type ToggleFlags } from "@/content/cv-variants";
import { pdfFilename } from "@/lib/download-name";
import { warmImages, warmOnIdle } from "@/lib/warm";
import { site } from "@/content/site";
import type { SheetSpec } from "./sheet-art";

const ResumeObjectScene = dynamic(() => import("./ResumeObjectScene"), { ssr: false });

const POSTER = "/images/resume-poster.webp";

type ManifestEntry = { id: string; flags: ToggleFlags; url: string };
type Manifest = { resume: string; variants: ManifestEntry[] };

/** How many entries each run of the sheet prints. Measured from the real
 *  content on the server, so a toggle visibly shortens the page. */
export type SheetCounts = {
  skills: number;
  experience: number;
  clientProjects: number;
  homelab: number;
  education: number;
  certifications: number;
};

type Mode = "loading" | "skip" | "static" | "webgl";

const TOGGLES: ReadonlyArray<{ key: keyof ToggleFlags; label: string }> = [
  { key: "skills", label: "Skills" },
  { key: "clientProjects", label: "Client projects" },
  { key: "homeLab", label: "Home lab" },
  { key: "photo", label: "Photo" },
];

/** The gesture is the acknowledgement, not the action, so it is short. */
const TAKE_MS = 460;

/**
 * The resume section's object, and the controls that drive it. The four
 * toggles map to the seventeen pre-built PDFs, and the sheet in the clip is
 * drawn from the same counts the LaTeX build uses, so toggling a section
 * visibly shortens the page.
 *
 * The controls are real markup and always render, on every viewport and under
 * reduced motion. The object is pure enhancement above them: nothing is only
 * reachable by pointing at a canvas, and the resume itself is already open on
 * the sheet below regardless.
 */
export function ResumeObject({ counts }: { counts: SheetCounts }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>("loading");
  const [near, setNear] = useState(false);
  const [touched, setTouched] = useState(false);

  const [asResume, setAsResume] = useState(false);
  const [flags, setFlags] = useState<ToggleFlags>(DEFAULT_FLAGS);
  // null = not fetched yet; [] = no manifest (local dev without a CV bake).
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [failed, setFailed] = useState(false);
  const [taking, setTaking] = useState(false);
  // Set by the scene once it has a frame on screen; until then the poster is
  // what the section shows.
  const [painted, setPainted] = useState(false);
  const onPainted = useCallback(() => setPainted(true), []);

  // Same facade rules as the portfolio shelf: three.js is ~600 KB and this
  // sits well below the fold, so it loads only on a wide viewport, only with
  // full motion, only once the section is near, and only after a real input.
  useEffect(() => {
    if (window.matchMedia("(max-width: 1023px)").matches) return setMode("skip");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setMode("skip");
    setMode("static");
  }, []);

  // Runs for every mode, not just "static": the manifest fetch hangs off
  // `near` too, and on a phone the scene never mounts to set it. A screenful
  // and a half of lead, so the scene build and the shader compile happen
  // before the section is on screen rather than while it is.
  useEffect(() => {
    const el = hostRef.current;
    if (!el || mode === "loading") return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), {
      rootMargin: "1200px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [mode]);

  useEffect(() => {
    if (mode !== "static" || touched) return;
    const up = () => setTouched(true);
    const evs = ["pointermove", "pointerdown", "keydown", "touchstart"] as const;
    evs.forEach((e) => window.addEventListener(e, up, { once: true, passive: true }));
    return () => evs.forEach((e) => window.removeEventListener(e, up));
  }, [mode, touched]);

  // The sheet's own surfaces are drawn in a canvas rather than downloaded, so
  // the only things to warm are the chunk and the picture standing in for it —
  // the picture first, because on a slow link it has to be in the cache before
  // the section arrives.
  useEffect(() => {
    if (mode !== "static" || !touched || near) return;
    return warmOnIdle(() => {
      warmImages([POSTER]);
      void import("./ResumeObjectScene");
    });
  }, [mode, touched, near]);

  useEffect(() => {
    if (mode === "static" && near && touched) setMode("webgl");
  }, [mode, near, touched]);

  // The manifest is ~3 KB and the controls are visible from the start, so it
  // is fetched once the section is anywhere near rather than on a click.
  // Default cache behaviour, so a fresh bake replaces a previously-404'd file.
  useEffect(() => {
    if (!near || manifest !== null || failed) return;
    let cancelled = false;
    fetch("/cv-manifest.json")
      .then((r) => (r.ok ? (r.json() as Promise<Manifest>) : null))
      .then((m) => {
        if (cancelled) return;
        if (m) setManifest(m);
        else setFailed(true);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [near, manifest, failed]);

  const url = useMemo(() => {
    if (!manifest) return null;
    if (asResume) return manifest.resume;
    return (
      manifest.variants.find(
        (v) =>
          v.flags.skills === flags.skills &&
          v.flags.clientProjects === flags.clientProjects &&
          v.flags.homeLab === flags.homeLab &&
          v.flags.photo === flags.photo,
      )?.url ?? null
    );
  }, [manifest, asResume, flags]);

  const spec: SheetSpec = useMemo(() => {
    const runs = asResume
      ? [
          { label: "Summary", entries: 3 },
          { label: "Experience", entries: counts.experience },
          { label: "Education", entries: counts.education },
          { label: "Certifications", entries: counts.certifications },
        ]
      : [
          { label: "Summary", entries: 3 },
          ...(flags.skills ? [{ label: "Skills", entries: counts.skills }] : []),
          { label: "Experience", entries: counts.experience },
          ...(flags.clientProjects
            ? [{ label: "Projects", entries: counts.clientProjects }]
            : []),
          ...(flags.homeLab ? [{ label: "Homelab", entries: counts.homelab }] : []),
          { label: "Education", entries: counts.education },
          { label: "Certifications", entries: counts.certifications },
        ];
    return {
      name: `${site.firstName} ${site.lastName}`,
      role: site.role,
      footer: `Oslo  ·  ${asResume ? "Résumé" : "CV"}`,
      runs,
    };
  }, [asResume, flags, counts]);

  const take = useCallback(() => {
    if (taking) return;
    setTaking(true);
    window.setTimeout(() => setTaking(false), TAKE_MS);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = pdfFilename(asResume);
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [taking, url, asResume]);

  return (
    <div ref={hostRef} data-pdf-download>
      <div className="mx-auto flex max-w-[var(--container-wide)] flex-wrap items-center gap-x-3 gap-y-4">
        <span className="section-label mr-2">Take a copy</span>

        <Chip pressed={asResume} onClick={() => setAsResume(true)}>
          Résumé
        </Chip>
        <Chip pressed={!asResume} onClick={() => setAsResume(false)}>
          Full CV
        </Chip>

        {!asResume && (
          <>
            <span aria-hidden className="mx-1 h-5 w-px bg-line" />
            {TOGGLES.map(({ key, label }) => (
              <Chip
                key={key}
                pressed={flags[key]}
                onClick={() => setFlags((p) => ({ ...p, [key]: !p[key] }))}
              >
                {label}
              </Chip>
            ))}
          </>
        )}

        {/* The one lit point on this screen, per §2. Everything else here is
            brass, which is what stopped the section carrying three greens. */}
        <button
          type="button"
          onClick={take}
          disabled={!url}
          className="focus-ring ml-auto rounded-sm border border-accent px-4 py-2 font-mono text-[0.62rem] tracking-[0.16em] text-accent uppercase transition-colors hover:bg-accent hover:text-accent-ink disabled:cursor-not-allowed disabled:border-line-2 disabled:text-fg-3 disabled:hover:bg-transparent"
        >
          {failed ? "Not built in dev" : url ? "Take the sheet" : "Loading…"}
        </button>
      </div>

      {/* Nothing at all where the object is skipped. A phone would otherwise
          get a 145px strip of empty desk under the controls, which is worse
          than the controls standing on their own. */}
      {mode !== "skip" && (
        <div className="scene-bleed relative mt-8 aspect-[16/7] max-h-[56vh] w-full overflow-hidden">
          {/* A frame of the sheet on the desk, so the section holds a picture
              rather than a black band while three.js is on its way. The
              gradient that was here before was the ground and nothing else.

              It comes off on the scene's first painted frame: the canvas is
              transparent, so a still left underneath a live render shows the
              same desk twice. Contained rather than covered for the same
              reason — the render fits the desk to the window's own aspect, and
              a cropped still sits at a different scale from it. The sheet in
              the picture prints the default set of sections; the live one
              answers the toggles. */}
          <img
            src={POSTER}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-contain transition-opacity duration-300"
            style={{ opacity: painted ? 0 : 1 }}
          />
          {mode === "webgl" && (
            <div className="absolute inset-0">
              <ResumeObjectScene
                spec={spec}
                taking={taking}
                onTake={take}
                onReady={onPainted}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={
        "focus-ring rounded-sm border px-3.5 py-1.5 font-mono text-[0.62rem] tracking-[0.14em] uppercase transition-colors " +
        (pressed
          ? "border-brass bg-[linear-gradient(160deg,rgba(127,90,47,0.55),rgba(74,53,32,0.4))] text-fg"
          : "border-line-2 text-fg-3 hover:border-brass hover:text-copper")
      }
    >
      {children}
    </button>
  );
}
