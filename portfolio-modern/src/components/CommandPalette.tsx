"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, X } from "lucide-react";
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

function setTheme(next: "dark" | "light") {
  const root = document.documentElement;
  root.classList.toggle("dark", next === "dark");
  root.classList.toggle("light", next === "light");
  root.dataset.theme = next;
  try {
    localStorage.setItem("theme", next);
  } catch {
    /* ignore */
  }
}

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

    const list: Command[] = [
      {
        id: "cd /",
        label: "cd /",
        hint: "go home",
        run: () => router.push("/"),
      },
      ...site.nav.map((n) => ({
        id: `cd ${n.href.replace(/^\//, "").replace(/^#/, "")}`,
        label: `cd ${n.label.toLowerCase()}`,
        hint: n.href,
        run: () => router.push(n.href),
      })),
      {
        id: "cd contact",
        label: "cd contact",
        hint: "scroll to #contact",
        run: () => {
          if (pathname === "/") {
            document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
          } else {
            router.push("/#contact");
          }
        },
      },
      {
        id: "cd portfolio",
        label: "cd portfolio",
        hint: "scroll to #portfolio",
        run: () => {
          if (pathname === "/") {
            document.getElementById("portfolio")?.scrollIntoView({ behavior: "smooth" });
          } else {
            router.push("/#portfolio");
          }
        },
      },
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
        id: "theme dark",
        label: "theme dark",
        hint: "switch to dark mode",
        run: () => setTheme("dark"),
      },
      {
        id: "theme light",
        label: "theme light",
        hint: "switch to light mode",
        run: () => setTheme("light"),
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

    return list;
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
          className="fixed inset-0 z-[100] flex items-start justify-center bg-bg/70 px-4 pt-[12vh] backdrop-blur-md"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-lg border border-line bg-bg-2 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]"
          >
            <div className="flex items-center justify-between border-b border-line bg-bg-2/80 px-4 py-2 font-mono text-xs text-fg-3">
              <span>
                <span className="text-accent">●</span> <span className="text-fg-2">morten@talos-cp-01</span>
                <span className="text-fg-3">:</span>
                <span className="text-fg-2">{pathname}</span>
                <span className="text-fg-3">$</span>
              </span>
              <button
                type="button"
                aria-label="Close"
                onClick={close}
                className="text-fg-3 hover:text-fg"
              >
                <X size={14} />
              </button>
            </div>

            {output.length > 0 && (
              <div className="max-h-56 overflow-y-auto border-b border-line bg-bg px-4 py-3 font-mono text-xs text-fg-2 whitespace-pre">
                {output.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 border-b border-line bg-bg px-4 py-3 font-mono text-sm">
              <span className="text-accent select-none">$</span>
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
                aria-expanded="true"
                aria-controls="palette-listbox"
                aria-activedescendant={
                  filtered[selected] ? `palette-opt-${filtered[selected].id}` : undefined
                }
                placeholder="type a command — try cd work, whoami, theme light…"
                className="flex-1 bg-transparent text-fg placeholder:text-fg-3 focus:outline-none"
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <ul
              id="palette-listbox"
              role="listbox"
              className="max-h-72 overflow-y-auto py-2"
            >
              {filtered.length === 0 && (
                <li className="px-4 py-3 font-mono text-xs text-fg-3">
                  command not found
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
                      "flex cursor-pointer items-center justify-between gap-4 px-4 py-2 font-mono text-sm",
                      active ? "bg-surface text-fg" : "text-fg-2",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <ArrowRight
                        size={12}
                        className={cn(
                          "transition-opacity",
                          active ? "text-accent opacity-100" : "opacity-0",
                        )}
                      />
                      {cmd.label}
                    </span>
                    {cmd.hint && (
                      <span className="truncate text-xs text-fg-3">{cmd.hint}</span>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="flex items-center justify-between border-t border-line bg-bg-2/60 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] text-fg-3">
              <span>
                <span className="text-fg-2">↑↓</span> navigate ·{" "}
                <span className="text-fg-2">↵</span> run ·{" "}
                <span className="text-fg-2">esc</span> close
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
