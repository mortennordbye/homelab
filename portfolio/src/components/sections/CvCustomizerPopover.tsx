"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Download, FileText } from "lucide-react";
import { DEFAULT_FLAGS, type ToggleFlags } from "@/content/cv-variants";

type ManifestEntry = {
  id: string;
  flags: ToggleFlags;
  url: string;
};

type ManifestShape = {
  resume: string;
  variants: ManifestEntry[];
};

/**
 * Resolve toggle state to a pre-built PDF URL from the runtime-fetched
 * manifest. Returns null when the manifest hasn't loaded yet (or the file
 * doesn't exist — e.g. local dev with no CV pipeline run).
 */
function resolveUrl(
  variants: ManifestEntry[] | null,
  flags: ToggleFlags,
): string | null {
  if (!variants) return null;
  const match = variants.find(
    (v) =>
      v.flags.skills === flags.skills &&
      v.flags.clientProjects === flags.clientProjects &&
      v.flags.homeLab === flags.homeLab &&
      v.flags.photo === flags.photo,
  );
  return match?.url ?? null;
}

const TOGGLES: ReadonlyArray<{ key: keyof ToggleFlags; label: string }> = [
  { key: "skills", label: "Skills" },
  { key: "clientProjects", label: "Client projects" },
  { key: "homeLab", label: "Home lab" },
  { key: "photo", label: "Profile photo" },
];

export function CvCustomizerPopover() {
  const [open, setOpen] = useState(false);
  const [flags, setFlags] = useState<ToggleFlags>(DEFAULT_FLAGS);
  // null = not loaded yet; [] = load failed (e.g. dev without CV pipeline).
  const [variants, setVariants] = useState<ManifestEntry[] | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  // Lazy-load the manifest on first open. The PDFs and this file are baked
  // into the production container; in local dev neither exists and the
  // popover quietly removes itself rather than showing a broken button.
  useEffect(() => {
    if (!open || variants !== null) return;
    let cancelled = false;
    // Default cache behavior: revalidate so a fresh dev bake replaces a
    // previously-404'd manifest. The asset is tiny (~3 KB) and only loaded
    // once per session on first popover open.
    fetch("/cv-manifest.json")
      .then((r) => (r.ok ? (r.json() as Promise<ManifestShape>) : null))
      .then((m) => {
        if (!cancelled) setVariants(m?.variants ?? []);
      })
      .catch(() => {
        if (!cancelled) setVariants([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, variants]);

  // Dismiss on click outside or Escape.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle(key: keyof ToggleFlags) {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function download() {
    const url = resolveUrl(variants, flags);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = "Morten-Nordbye-CV.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setOpen(false);
  }

  const ready = variants !== null && variants.length > 0;

  return (
    <div ref={wrapperRef} className="relative inline-flex" data-pdf-download>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="group inline-flex items-center gap-2 rounded-full border border-line-2 bg-surface/40 px-5 py-2.5 font-display text-sm text-fg transition-all hover:border-accent hover:text-accent"
      >
        <FileText size={14} />
        Customize CV
        <ChevronDown
          size={14}
          className={"transition-transform " + (open ? "rotate-180" : "")}
        />
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Customize CV download"
          className="absolute left-0 top-full z-30 mt-2 w-72 rounded-2xl border border-line-2 bg-surface/95 p-4 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)] backdrop-blur"
        >
          <p className="mb-3 font-display text-[11px] uppercase tracking-[0.2em] text-fg-3">
            Include in CV
          </p>
          <ul className="space-y-1">
            {TOGGLES.map(({ key, label }) => (
              <li key={key}>
                <label className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-sm text-fg-2 transition-colors hover:bg-line/40">
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={flags[key]}
                    onChange={() => toggle(key)}
                    className="h-4 w-4 cursor-pointer accent-[var(--accent)]"
                  />
                </label>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={download}
            disabled={!ready}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-4 py-2 font-display text-sm text-accent-ink transition-all hover:shadow-[0_0_36px_-8px_var(--accent)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-none"
          >
            <Download size={14} />
            {variants === null
              ? "Loading…"
              : variants.length === 0
                ? "Unavailable in dev"
                : "Download CV"}
          </button>
        </div>
      )}
    </div>
  );
}
