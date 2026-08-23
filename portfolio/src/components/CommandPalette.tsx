"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";

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

export function CommandPalette({ work, services }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [output, setOutput] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => setMounted(true), []);

  // Close on route change.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

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
      {
        id: "htop",
        label: "htop",
        hint: "system snapshot",
        run: () =>
          print([
            "  PID USER       %CPU %MEM   COMMAND",
            " 1042 morten      4.2  0.8   next-server",
            " 2110 morten      1.1  0.3   kubectl get pods -A",
            " 3301 morten      0.4  0.1   terraform plan",
          ]),
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
  }, [router, pathname, work, services]);

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

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 px-4 pt-[10vh] backdrop-blur-md"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            className="relative w-full max-w-3xl overflow-hidden rounded-xl border border-snow/10 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.8),0_0_0_1px_rgba(0,0,0,0.5)]"
            style={{
              background:
                "linear-gradient(180deg, rgba(8,12,18,0.97) 0%, rgba(5,9,15,0.97) 100%)",
            }}
          >
            {/* CRT scanlines */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 3px)",
              }}
            />

            {/* Title bar — macOS-style traffic lights */}
            <div className="relative flex items-center justify-between border-b border-snow/10 bg-black/40 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Close"
                  onClick={close}
                  className="h-3 w-3 rounded-full bg-[#ff5f57] ring-1 ring-inset ring-black/20 transition-opacity hover:opacity-80"
                />
                <span
                  aria-hidden
                  className="h-3 w-3 rounded-full bg-[#febc2e] ring-1 ring-inset ring-black/20"
                />
                <span
                  aria-hidden
                  className="h-3 w-3 rounded-full bg-[#28c840] ring-1 ring-inset ring-black/20"
                />
              </div>
              <span className="font-mono text-[11px] text-snow/50">
                morten@talos-cp-01 — bash — 80×24
              </span>
              <button
                type="button"
                aria-label="Close"
                onClick={close}
                className="text-snow/40 transition-colors hover:text-fg"
              >
                <X size={14} />
              </button>
            </div>

            {/* Buffer (history + output) */}
            <div className="max-h-64 overflow-y-auto bg-transparent px-5 pt-4 font-mono text-[13px] leading-relaxed text-snow/80">
              {/* Welcome banner */}
              <div className="text-snow/40">
                <div>
                  <span className="text-accent">●</span> connected to{" "}
                  <span className="text-snow/70">talos-cp-01.nordbye.local</span>
                </div>
                <div>
                  Last login: now on console — type{" "}
                  <span className="text-accent">help</span> for available commands.
                </div>
              </div>

              {output.length > 0 && (
                <div className="mt-3 whitespace-pre text-snow/75">
                  {output.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Prompt row */}
            <div className="relative flex items-center gap-2 px-5 py-3 font-mono text-[13px] leading-relaxed">
              <span className="select-none whitespace-nowrap">
                <span className="text-accent">morten</span>
                <span className="text-snow/40">@</span>
                <span className="text-info">talos-cp-01</span>
                <span className="text-snow/40">:</span>
                <span className="text-copper">{pathname}</span>
                <span className="text-snow/40">$</span>
              </span>
              <div className="relative flex-1">
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
                  placeholder="try cd work, whoami, htop…"
                  className="w-full caret-accent bg-transparent text-fg placeholder:text-fg-3 focus:outline-none"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            </div>

            {/* Suggestions */}
            <ul
              id="palette-listbox"
              role="listbox"
              className="max-h-72 overflow-y-auto border-t border-snow/5 pb-2"
            >
              {filtered.length === 0 && (
                <li className="px-5 py-3 font-mono text-[12px] text-danger">
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
                    className={cn(
                      "flex cursor-pointer items-center justify-between gap-4 px-5 py-1.5 font-mono text-[13px] transition-colors",
                      active
                        ? "bg-snow/[0.06] text-fg"
                        : "text-snow/55 hover:text-snow/80",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className={cn(
                          "w-2 select-none",
                          active ? "text-accent" : "text-transparent",
                        )}
                      >
                        ›
                      </span>
                      {cmd.label}
                    </span>
                    {cmd.hint && (
                      <span className="truncate text-[11px] text-snow/35">
                        {cmd.hint}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>

            {/* Status bar */}
            <div className="flex items-center justify-between border-t border-snow/10 bg-black/30 px-5 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-snow/40">
              <span>
                <span className="text-snow/70">↑↓</span> navigate ·{" "}
                <span className="text-snow/70">↵</span> run ·{" "}
                <span className="text-snow/70">esc</span> close
              </span>
              <span>
                {filtered.length} / {commands.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
