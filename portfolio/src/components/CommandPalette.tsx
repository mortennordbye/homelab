"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";
import {
  PHOS_DIM,
  PHOS_LIT,
  PHOS_BRIGHT,
  GLOW,
  GLOW_BRIGHT,
  BEZEL_STYLE,
  SCREEN_STYLE,
  SCANLINES_STYLE,
} from "@/lib/phosphor";

type WorkItem = { slug: string; title: string };
type ServiceItem = { slug: string; title: string };

type Command = {
  id: string;
  label: string;
  hint?: string;
  run: () => void | Promise<void>;
};

type Props = {
  work: WorkItem[];
  services: ServiceItem[];
};

// The slice of /api/v1/infra the screen prints. Everything shown must come
// from here: the screen is only allowed to say what is true.
type Infra = {
  nodes?: { ready: number; total: number; list?: { name: string; role: string; ready: boolean }[] };
  argocd?: { sync: string };
  cert?: { notAfter: string };
};


export function CommandPalette({ work, services }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [output, setOutput] = useState<string[]>([]);
  const [infra, setInfra] = useState<Infra | null>(null);
  // Solved when the feed arrives, not in render — Date.now() is impure there.
  const [certDays, setCertDays] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => setMounted(true), []);

  // Close on route change.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  // Fetched once per session, on first open: the status line and the node
  // table print from it, and a palette nobody opens costs no request.
  useEffect(() => {
    if (!open || infra) return;
    let cancelled = false;
    fetch("/api/v1/infra")
      .then((r) => r.json())
      .then((d: Infra) => {
        if (cancelled) return;
        setInfra(d);
        if (d.cert?.notAfter) {
          setCertDays(
            Math.max(0, Math.round((Date.parse(d.cert.notAfter) - Date.now()) / 86400000)),
          );
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, infra]);

  const close = () => {
    setOpen(false);
    setQuery("");
    setSelected(0);
  };

  const openPalette = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Build command registry.
  const commands: Command[] = useMemo(() => {
    const print = (lines: string[]) => setOutput((o) => [...o, ...lines]);

    // Jump to a section: smooth-scroll if already on /, otherwise navigate.
    const jump = (href: string) => {
      if (href.startsWith("/#") && pathname === "/") {
        const id = href.slice(2);
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      } else {
        router.push(href);
      }
    };

    const list: Command[] = [
      {
        id: "cd /",
        label: "cd /",
        hint: "scroll to top",
        run: () => {
          if (pathname === "/") {
            window.scrollTo({ top: 0, behavior: "smooth" });
          } else {
            router.push("/");
          }
        },
      },
      ...site.nav.map((n) => ({
        id: `cd ${n.label.toLowerCase()}`,
        label: `cd ${n.label.toLowerCase()}`,
        hint: n.href.startsWith("/#") ? `scroll to ${n.href.slice(1)}` : n.href,
        run: () => jump(n.href),
      })),
      {
        id: "ls work",
        label: "ls work",
        hint: "list case studies",
        run: () => print(["work/", ...work.map((w) => `  ${w.slug.padEnd(36)} ${w.title}`)]),
      },
      {
        id: "ls services",
        label: "ls services",
        hint: "list services",
        run: () =>
          print(["services/", ...services.map((s) => `  ${s.slug.padEnd(36)} ${s.title}`)]),
      },
      {
        id: "whoami",
        label: "whoami",
        hint: "print user",
        run: () =>
          print([
            `morten · ${site.role.toLowerCase()} · ${site.location.toLowerCase()}`,
            `uid=1000(morten) gid=1000(homelab) groups=docker,kvm,wheel`,
          ]),
      },
      {
        id: "cat about.md",
        label: "cat about.md",
        hint: "short bio",
        run: () => print([site.description]),
      },
      // Replaced the invented htop table: this one prints the same feed the
      // /infrastructure page reads, so the screen never shows a made-up number.
      {
        id: "kubectl get nodes",
        label: "kubectl get nodes",
        hint: "live from the cluster",
        run: () => {
          const nodes = infra?.nodes?.list;
          if (!nodes?.length) {
            print(["status feed not loaded — try again in a moment"]);
            return;
          }
          print([
            `NAME${" ".repeat(18)}ROLE${" ".repeat(11)}STATUS`,
            ...nodes.map(
              (n) =>
                `${n.name.padEnd(22)}${n.role.padEnd(15)}${n.ready ? "Ready" : "NotReady"}`,
            ),
          ]);
        },
      },
      {
        id: "cd fun",
        label: "cd fun",
        hint: "/fun",
        run: () => jump("/fun"),
      },
      // /brand is deliberately absent from the nav — it is a spec sheet, not a
      // page anyone browsing needs. The palette is where it belongs: findable
      // by anyone who goes looking, invisible to everyone else.
      {
        id: "cd brand",
        label: "cd brand",
        hint: "/brand",
        run: () => jump("/brand"),
      },
      {
        id: "cat brand.md",
        label: "cat brand.md",
        hint: "colour, type and the rules",
        run: () => jump("/brand"),
      },
      {
        id: "clear",
        label: "clear",
        hint: "clear buffer",
        run: () => setOutput([]),
      },
      {
        id: "exit",
        label: "exit",
        hint: "close palette",
        run: () => close(),
      },
    ];

    // Dedupe by id — `site.nav` may emit entries (e.g. "cd contact") that
    // are also defined as hard-coded smooth-scroll commands below. Keep the
    // last definition so the smooth-scroll variants win.
    const seen = new Map<string, Command>();
    for (const cmd of list) seen.set(cmd.id, cmd);
    return [...seen.values()];
  }, [router, pathname, work, services, infra]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) => c.label.toLowerCase().includes(q) || c.hint?.toLowerCase().includes(q),
    );
  }, [commands, query]);

  // Global key listener.
  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inEditable =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        open ? close() : openPalette();
        return;
      }
      if (e.key === "/" && !inEditable && !open) {
        e.preventDefault();
        openPalette();
        return;
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        close();
      }
    };
    const onOpenEvent = () => openPalette();
    window.addEventListener("keydown", onKey);
    window.addEventListener("palette:open", onOpenEvent as EventListener);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("palette:open", onOpenEvent as EventListener);
    };
  }, [mounted, open]);

  // Reset selection when filter narrows past it.
  useEffect(() => {
    setSelected((s) => Math.min(s, Math.max(0, filtered.length - 1)));
  }, [filtered]);

  if (!mounted) return null;

  const run = (cmd: Command) => {
    void cmd.run();
    if (
      cmd.id.startsWith("cd ") ||
      cmd.id === "exit"
    ) {
      close();
    } else {
      setQuery("");
    }
  };

  const statusLine = infra
    ? [
        "genesis",
        infra.nodes ? `${infra.nodes.ready}/${infra.nodes.total} nodes ready` : null,
        infra.argocd ? `argocd ${infra.argocd.sync.toLowerCase()}` : null,
        certDays !== null ? `cert ${certDays}d` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "genesis · reading cluster status…";

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 px-4 pt-[10vh]"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          {/* The bezel. This surface reflects like everything else on the desk;
              only what is inside it emits. */}
          <div className="w-full max-w-3xl rounded-lg p-3.5" style={BEZEL_STYLE}>
            <div
              className="relative overflow-hidden rounded font-mono text-[13px] leading-relaxed"
              style={SCREEN_STYLE}
            >
              {/* Scanlines. Legitimate here — this is an actual screen. */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
                style={SCANLINES_STYLE}
              />

              {/* Status line — read from the cluster, never invented. */}
              <div className="px-5 pt-4 text-[11.5px]" style={{ color: PHOS_DIM }}>
                {statusLine}
              </div>

              {/* Buffer (command output) */}
              {output.length > 0 && (
                <div
                  className="phosphor-scroll max-h-64 overflow-y-auto px-5 pt-3 whitespace-pre"
                  style={{ color: PHOS_LIT }}
                >
                  {output.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              )}

              {/* Prompt row */}
              <div className="flex items-center gap-2 px-5 py-3">
                <span className="select-none whitespace-nowrap">
                  <span style={{ color: PHOS_LIT, textShadow: GLOW }}>morten@genesis</span>
                  <span style={{ color: PHOS_DIM }}>:</span>
                  <span className="text-copper">{pathname}</span>
                  <span style={{ color: PHOS_DIM }}>$</span>
                </span>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setSelected((s) => Math.min(s + 1, filtered.length - 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setSelected((s) => Math.max(s - 1, 0));
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      const cmd = filtered[selected];
                      if (cmd) run(cmd);
                    }
                  }}
                  role="combobox"
                  aria-expanded={true}
                  aria-controls="palette-listbox"
                  aria-activedescendant={
                    filtered[selected] ? `palette-opt-${filtered[selected].id}` : undefined
                  }
                  placeholder="try cd work, whoami, kubectl get nodes…"
                  className="w-full flex-1 caret-accent bg-transparent focus:outline-none"
                  style={{ color: PHOS_BRIGHT, textShadow: GLOW_BRIGHT }}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              {/* Suggestions */}
              <ul
                id="palette-listbox"
                role="listbox"
                className="phosphor-scroll max-h-72 overflow-y-auto pb-2"
                style={{ borderTop: `1px solid rgba(101,161,110,0.12)` }}
              >
                {filtered.length === 0 && (
                  <li className="px-5 py-3 text-[12px] text-danger">
                    zsh: command not found: {query}
                  </li>
                )}
                {filtered.map((cmd, i) => {
                  const active = i === selected;
                  return (
                    <li
                      key={cmd.id}
                      id={`palette-opt-${cmd.id}`}
                      role="option"
                      aria-selected={active}
                      onMouseEnter={() => setSelected(i)}
                      onClick={() => run(cmd)}
                      className="flex cursor-pointer items-center justify-between gap-4 px-5 py-1.5 transition-colors"
                      style={
                        active
                          ? { color: PHOS_BRIGHT, textShadow: GLOW_BRIGHT }
                          : { color: PHOS_DIM }
                      }
                    >
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className="w-2 select-none"
                          style={{ color: active ? PHOS_BRIGHT : "transparent" }}
                        >
                          &gt;
                        </span>
                        {cmd.label}
                      </span>
                      {cmd.hint && (
                        <span
                          className="truncate text-[11px]"
                          style={{ color: PHOS_DIM, textShadow: "none" }}
                        >
                          {cmd.hint}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>

              {/* Status bar */}
              <div
                className="flex items-center justify-between px-5 py-2.5 text-[10px] uppercase tracking-[0.18em]"
                style={{ color: PHOS_DIM, borderTop: "1px solid rgba(101,161,110,0.12)" }}
              >
                <span>↑↓ move · ↵ run · esc close</span>
                <span>
                  {filtered.length} / {commands.length}
                </span>
              </div>
            </div>

            {/* The maker's mark on the bezel, ink on the housing, not emitting. */}
            <div
              className="mt-2.5 text-center font-mono text-[8.5px] tracking-[0.3em] uppercase"
              style={{ color: "rgba(243,226,192,0.4)" }}
            >
              Genesis Works — Oslo
            </div>
          </div>
        </div>
      )}
    </>
  );
}
