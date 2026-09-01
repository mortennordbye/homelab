"use client";

import { Html, RoundedBox } from "@react-three/drei";
import { useCallback, useEffect, useRef, useState } from "react";
import { site } from "@/content/site";
import { certDaysLeft } from "./feed";
import { Interactive } from "./interaction";
import type { PanelProps } from "./Panels";
import {
  PANEL_PX_H,
  PANEL_PX_W,
  PORTRAIT_PX_H,
  PORTRAIT_PX_W,
  distanceFactor,
} from "./Screen";
import type { ShelfData } from "./shelf";

/**
 * A working shell on the middle desk monitor, not a desktop environment —
 * pointer lock means no cursor, and a shell drives the public API, which the
 * site shows nowhere else. Commands are thin; `curl` does a real fetch
 * against the real endpoints, so the output is not a mock.
 */

const ACCENT = "#81b288";

type Line = { kind: "in" | "out" | "err" | "note"; text: string };

const BANNER: Line[] = [
  { kind: "note", text: "nordbye.it — shell" },
  { kind: "note", text: "type `help` for commands, `exit` to step back" },
];

function useCommands(
  shelf: ShelfData,
  data: PanelProps,
  onOpen: (url: string) => void,
) {
  return useCallback(
    async (raw: string): Promise<Line[]> => {
      const [cmd, ...rest] = raw.trim().split(/\s+/);
      const arg = rest.join(" ");
      const out = (...t: string[]): Line[] =>
        t.map((text) => ({ kind: "out", text }) as Line);
      const err = (t: string): Line[] => [{ kind: "err", text: t }];

      switch (cmd) {
        case "":
          return [];

        case "help":
          return out(
            "whoami              who you are talking to",
            "ls [work|certs]     list case studies or certifications",
            "cat work/<slug>     read one case study",
            "social [name]       list social links, or open one",
            "contact             email and phone",
            "brand               colour, type and imagery system",
            // Kept to 57 characters. The portrait monitor fits 60 before the
            // second column wraps — see PORTRAIT_PX_W in Screen.tsx.
            "curl <path>         GET an endpoint, e.g. /api/v1/profile",
            "api                 list the public API endpoints",
            "kubectl get <kind>  apps, nodes or certs from the feed",
            "clear               clear the screen",
            "exit                step back from the desk",
          );

        case "whoami":
          return out(
            `${site.firstName} ${site.lastName}`,
            site.role,
            site.location,
            "",
            site.hero.sub,
          );

        case "ls": {
          const what = arg || "work";
          if (what === "work" || what === "work/")
            return out(
              ...shelf.books.map(
                (b) => `${b.slug.padEnd(36)} ${b.period}`,
              ),
              "",
              `${shelf.books.length} case studies · cat work/<slug> to read one`,
            );
          if (what === "certs" || what === "certs/")
            return out(
              ...shelf.certs.map((c) => `${c.date.padEnd(10)} ${c.title}`),
            );
          return err(`ls: ${what}: no such directory (try work or certs)`);
        }

        case "cat": {
          const slug = arg.replace(/^work\//, "").replace(/\/$/, "");
          const b = shelf.books.find((x) => x.slug === slug);
          if (!b) return err(`cat: ${arg || "(nothing)"}: no such case study`);
          return out(
            b.title,
            `${b.client} · ${b.period}`,
            "",
            b.summary,
            "",
            `stack: ${b.stack.join(", ")}`,
            `read:  ${site.url}/work/${b.slug}`,
          );
        }

        case "social": {
          if (!arg)
            return out(
              ...site.socials.map((s) => `${s.label.padEnd(10)} ${s.href}`),
              "",
              "social <name> to open one",
            );
          const match = site.socials.find(
            (s) => s.label.toLowerCase() === arg.toLowerCase(),
          );
          if (!match) return err(`social: ${arg}: not one of mine`);
          onOpen(match.href);
          return out(`opening ${match.href}`);
        }

        case "contact":
          return out(
            `email  ${site.email}`,
            `phone  ${site.phoneDisplay}`,
            `site   ${site.url}`,
          );

        /**
         * Unlisted on purpose. The brand spec is a working document, not a
         * page anyone browsing the site is meant to land on, so the shell is
         * the only entrance and the route itself is noindex.
         */
        case "brand": {
          onOpen(`${site.url}/brand`);
          return out(
            "brand system — eucalyptus deepened",
            "colour, type, spacing, components, imagery",
            "",
            "opening /brand",
          );
        }

        /**
         * Reads the same feed object the screens read — separate polling would
         * let the shell contradict the television. Every branch that prints
         * cluster state also prints how much to trust it: a green light on old
         * data is a lie.
         */
        case "k":
        case "kubectl": {
          const [verb, kind] = rest;
          const trust: Line[] =
            data.feed === "snapshot"
              ? [{ kind: "note", text: "# build-time snapshot, not the cluster" }]
              : data.stale
                ? [{ kind: "note", text: "# stale — last publish over 15 min ago" }]
                : [];

          if (verb === "version") {
            const v = data.status?.versions;
            return [
              ...out(
                `Server Version:  ${v?.kubernetes ?? "unknown"}`,
                `Talos Version:   ${v?.talos ?? "unknown"}`,
              ),
              ...trust,
            ];
          }

          if (verb !== "get")
            return err("kubectl: try `kubectl get applications|nodes|certs`");

          // Widths chosen against PORTRAIT_PX_W's 60-character line, same as
          // the help text above.
          const row = (a: string, b: string, c: string) =>
            `${a.padEnd(17)}${b.padEnd(12)}${c}`;

          switch (kind) {
            case "applications":
            case "application":
            case "apps":
            case "app": {
              const apps = data.status?.apps ?? [];
              // Mirrors ArgoView on the desk monitor: when the publisher sends
              // only the root rollup, show the root rather than an empty list
              // that reads as "no applications".
              if (!apps.length)
                return [
                  ...out(
                    row("NAME", "SYNC", "HEALTH"),
                    row("genesis (root)", data.argocd.sync, data.argocd.health),
                  ),
                  { kind: "note", text: "# publisher sends the root app only" },
                  ...trust,
                ];
              return [
                ...out(
                  row("NAME", "SYNC", "HEALTH"),
                  ...apps.map((a) => row(a.name, a.sync, a.health)),
                ),
                ...trust,
              ];
            }

            case "nodes":
            case "node":
            case "no":
              return [
                ...out(`${data.nodes.ready}/${data.nodes.total} Ready`),
                { kind: "note", text: "# the feed carries counts, not names" },
                ...trust,
              ];

            case "certificates":
            case "certificate":
            case "certs":
            case "cert": {
              const certs = data.status?.certs ?? [];
              const head = `${"NAME".padEnd(24)}EXPIRES`;
              if (!certs.length) {
                // The publisher always sends the site's own leaf; the per-cert
                // list is one of the optional additions.
                const days = certDaysLeft(data.status?.cert?.notAfter);
                if (days === null)
                  return err("kubectl: the feed reports no certificates");
                const host = site.url.replace(/^https?:\/\//, "");
                return [...out(head, `${host.padEnd(24)}${days}d`), ...trust];
              }
              return [
                ...out(
                  head,
                  ...certs.map((c) => `${c.name.padEnd(24)}${c.daysLeft}d`),
                ),
                ...trust,
              ];
            }

            default:
              return err(
                `kubectl: ${kind || "(nothing)"}: try applications, nodes or certs`,
              );
          }
        }

        case "api":
        case "curl": {
          const path = cmd === "api" ? "/api/v1" : arg;
          if (!path) return err("curl: needs a path, e.g. curl /api/v1/profile");
          if (!path.startsWith("/api/"))
            return err("curl: only this site's /api/ paths, no proxying");
          try {
            const res = await fetch(path, { cache: "no-store" });
            const text = await res.text();
            let body = text;
            try {
              body = JSON.stringify(JSON.parse(text), null, 2);
            } catch {
              /* not JSON: print as-is */
            }
            return [
              { kind: "note", text: `HTTP ${res.status} ${path}` },
              // Long responses are trimmed rather than scrolling forever; the
              // point is to show the endpoint is real, not to be a JSON viewer.
              ...body.split("\n").slice(0, 40).map(
                (text) => ({ kind: "out", text }) as Line,
              ),
              ...(body.split("\n").length > 40
                ? [{ kind: "note", text: "… truncated" } as Line]
                : []),
            ];
          } catch {
            return err(`curl: ${path}: request failed`);
          }
        }

        default:
          return err(`${cmd}: command not found — try \`help\``);
      }
    },
    [shelf, data, onOpen],
  );
}

export function TerminalScreen({
  position,
  rotation,
  width,
  shelf,
  data,
  active,
  onActivate,
  onExit,
  /** Stand the monitor on its end. The shell is the one thing in the room a
   *  tall narrow screen genuinely suits — output scrolls vertically. */
  portrait = false,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  shelf: ShelfData;
  data: PanelProps;
  active: boolean;
  onActivate: () => void;
  onExit: () => void;
  portrait?: boolean;
}) {
  const [lines, setLines] = useState<Line[]>(BANNER);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const openUrl = useCallback((url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);
  const run = useCommands(shelf, data, openUrl);

  // Focus the input when the visitor sits down, so they can just start typing.
  useEffect(() => {
    if (active) inputRef.current?.focus();
  }, [active]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const submit = useCallback(async () => {
    const raw = value;
    setValue("");
    if (raw.trim() === "clear") {
      setLines(BANNER);
      return;
    }
    if (raw.trim() === "exit") {
      setLines((l) => [...l, { kind: "in", text: raw }]);
      onExit();
      return;
    }
    setLines((l) => [...l, { kind: "in", text: raw }]);
    setBusy(true);
    const result = await run(raw);
    setBusy(false);
    setLines((l) => [...l, ...result]);
  }, [value, run, onExit]);

  const pxW = portrait ? PORTRAIT_PX_W : PANEL_PX_W;
  const pxH = portrait ? PORTRAIT_PX_H : PANEL_PX_H;
  const h = width * (pxH / pxW);

  return (
    <group position={position} rotation={rotation}>
      <RoundedBox
        position={[0, 0, -0.018]}
        args={[width + 0.022, h + 0.022, 0.03]}
        radius={0.005}
        smoothness={4}
        castShadow
      >
        <meshStandardMaterial color="#121417" roughness={0.62} metalness={0.25} />
      </RoundedBox>
      <mesh>
        <planeGeometry args={[width, h]} />
        <meshBasicMaterial color="#060b11" />
      </mesh>

      {/* The whole panel is the interaction target. Sitting down is `E`; the
          shell only accepts typing once the pointer is released, because a
          locked pointer swallows keystrokes the room needs for movement. */}
      {!active && (
        <Interactive
          label="the terminal"
          verb="use"
          detail="a shell on the public API"
          onActivate={onActivate}
        >
          <mesh position={[0, 0, 0.01]} visible={false}>
            <planeGeometry args={[width, h]} />
            <meshBasicMaterial />
          </mesh>
        </Interactive>
      )}

      <Html
        transform
        occlude="blending"
        distanceFactor={distanceFactor(width, pxW)}
        position={[0, 0, 0.008]}
        zIndexRange={[10, 0]}
        style={{
          width: `${pxW}px`,
          height: `${pxH}px`,
          pointerEvents: active ? "auto" : "none",
          userSelect: active ? "text" : "none",
        }}
      >
        <div
          className="relative flex h-full w-full flex-col overflow-hidden font-mono"
          style={{
            background:
              "linear-gradient(160deg, #0a1119 0%, #070d14 55%, #060a10 100%)",
            border: `1px solid ${ACCENT}3d`,
            boxShadow: `inset 0 0 60px ${ACCENT}14`,
            color: "#c8d8e8",
            padding: "18px 20px 16px",
            fontSize: "13px",
          }}
          onClick={() => active && inputRef.current?.focus()}
        >
          <div
            className="mb-3 flex items-center justify-between border-b pb-2"
            style={{ borderColor: `${ACCENT}26` }}
          >
            <span
              className="text-[12px] tracking-[0.22em]"
              style={{ color: ACCENT }}
            >
              SHELL
            </span>
            {/* A real target, not just the `esc` hint this used to be. Touch
                visitors have no Esc key, and entering the terminal pauses the
                room — which hides the walk stick and the look handler — so the
                hint was advertising a key they could not press while every
                other way back was gone. A click also carries user activation,
                which a keypress does not. */}
            {active ? (
              <button
                type="button"
                aria-label="leave the terminal"
                onClick={(e) => {
                  e.stopPropagation();
                  onExit();
                }}
                className="focus-ring border px-2 py-0.5 text-[10px] tracking-[0.14em] transition-colors"
                style={{ borderColor: `${ACCENT}3d`, color: ACCENT }}
              >
                close
              </button>
            ) : (
              <span className="text-[10px] tracking-[0.14em] text-[#3f4d5c]">
                press E to use
              </span>
            )}
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto pr-1 leading-[1.5]">
            {lines.map((l, i) => (
              <div
                key={i}
                className="whitespace-pre-wrap break-words"
                style={{
                  color:
                    l.kind === "in"
                      ? "#e8f2fb"
                      : l.kind === "err"
                        ? "#ff9d8a"
                        : l.kind === "note"
                          ? "#5d768a"
                          : "#9fb6cc",
                }}
              >
                {l.kind === "in" ? `$ ${l.text}` : l.text}
              </div>
            ))}
            {busy && <div style={{ color: "#5d768a" }}>…</div>}
          </div>

          <form
            className="mt-2 flex items-center gap-2 border-t pt-2"
            style={{ borderColor: `${ACCENT}1f` }}
            onSubmit={(e) => {
              e.preventDefault();
              if (!busy) void submit();
            }}
          >
            <span style={{ color: ACCENT }}>$</span>
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={!active}
              spellCheck={false}
              autoComplete="off"
              className="flex-1 bg-transparent outline-none"
              style={{ color: "#e8f2fb", fontSize: "13px" }}
              placeholder={active ? "" : "press E to use"}
            />
          </form>

          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "repeating-linear-gradient(0deg, rgba(255,255,255,0.028) 0px, rgba(255,255,255,0.028) 1px, transparent 1px, transparent 3px)",
            }}
          />
        </div>
      </Html>
    </group>
  );
}
