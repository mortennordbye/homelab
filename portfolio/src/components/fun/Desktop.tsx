"use client";

import { Html } from "@react-three/drei";
import { RoundedBox } from "@/components/scene/RoundedBox";
import {
  Award,
  BookOpen,
  Bomb,
  Briefcase,
  Flag,
  FileCode,
  Folder,
  Gamepad2,
  FolderGit2,
  Globe,
  Grid3x3,
  Lamp,
  Power,
  SlidersHorizontal,
  Tv,
  Volume2,
  Wifi,
  X,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { site } from "@/content/site";
import type { SourceExcerpt } from "@/lib/source-excerpt";
import { Interactive } from "./interaction";
import type { PanelProps } from "./Panels";
import type { BlogPost } from "./PrintedPosts";
import type { LightKey, Lights } from "./Room";
import { distanceFactor } from "./Screen";
import type { ShelfData } from "./shelf";
import { SnakeChannel } from "./TvChannels";
import { certDaysLeft, relative, useRepos } from "./feed";

/**
 * The landscape desk monitor as a small GNOME-style desktop: top bar, dock,
 * draggable windows. E zooms onto it (`ScreenFocus` in FunRoom) and frees the
 * cursor; from across the room it is simply a screen with windows on it.
 *
 * Its apps do things or link out; they never carry a second copy of what the
 * site's own pages say. Files opens the real case-study, blog and repository
 * pages in a new tab; the browser's ArgoCD and Grafana are mock interfaces over
 * the same live feed the television reads, and say so.
 *
 * All state lives in DesktopScreen, outside the Html: drei's Html renders its
 * children in a root of its own, and state kept down there does not survive.
 */

export const DESK_PX_W = 1280;
export const DESK_PX_H = 752;
const TOP = 30;
/** Above any window: window z counts up by one per focus. */
const SHELL_Z = 1_000_000;

/* Adwaita, dark. */
const UI = {
  bg: "#242424",
  view: "#1e1e1e",
  header: "#303030",
  border: "#1b1b1b",
  fg: "#ffffff",
  dim: "#9a9996",
  accent: "#3584e4",
  hover: "rgba(255,255,255,0.08)",
};

type AppId = "files" | "web" | "room" | "mines" | "snake" | "editor";
type Win = { id: AppId; x: number; y: number; z: number };

const APPS: Record<AppId, { title: string; icon: LucideIcon; w: number; h: number; tint: string }> = {
  files: { title: "Files", icon: Folder, w: 640, h: 420, tint: "#3d8fd6" },
  web: { title: "Web", icon: Globe, w: 900, h: 560, tint: "#4a90d9" },
  room: { title: "Room", icon: SlidersHorizontal, w: 420, h: 380, tint: "#8f6bd1" },
  mines: { title: "Mines", icon: Bomb, w: 340, h: 420, tint: "#c64600" },
  snake: { title: "Snake", icon: Gamepad2, w: 560, h: 440, tint: "#2ec27e" },
  editor: { title: "Text Editor", icon: FileCode, w: 600, h: 460, tint: "#e5a50a" },
};
const DOCK: AppId[] = ["files", "web", "room", "editor", "mines", "snake"];

export type RoomControls = {
  lights: Lights;
  onToggleLight: (k: LightKey) => void;
  channel: string;
  onNextChannel: () => void;
};

/* ---------------------------------------------------------------- shell -- */

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function TopBar({ active, onActivities, onExit }: { active: boolean; onActivities: () => void; onExit: () => void }) {
  const now = useClock();
  const day = now.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const time = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return (
    <div
      className="absolute inset-x-0 top-0 flex items-center justify-between px-3"
      style={{ height: TOP, background: "#000", color: UI.fg, fontSize: 14, fontWeight: 600, zIndex: SHELL_Z }}
    >
      <button type="button" onClick={onActivities} className="rounded-full px-3 py-0.5 hover:bg-white/10">
        Activities
      </button>
      <span>
        {day} {time}
      </span>
      <span className="flex items-center gap-3">
        {active && <span style={{ color: UI.dim, fontWeight: 400, fontSize: 12 }}>E to step back</span>}
        <Wifi size={15} />
        <Volume2 size={15} />
        <button type="button" onClick={onExit} aria-label="leave the computer" className="rounded-full p-1 hover:bg-white/10">
          <Power size={15} />
        </button>
      </span>
    </div>
  );
}

function Dock({ open, onLaunch }: { open: AppId[]; onLaunch: (id: AppId) => void }) {
  return (
    <div
      className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-end gap-2 rounded-[20px] px-3 py-2"
      style={{ background: "rgba(40,40,40,0.85)", border: "1px solid rgba(255,255,255,0.08)", zIndex: SHELL_Z }}
    >
      {DOCK.map((id) => {
        const A = APPS[id];
        return (
          <button key={id} type="button" onClick={() => onLaunch(id)} className="flex flex-col items-center" title={A.title}>
            <span className="grid size-12 place-content-center rounded-[12px]" style={{ background: A.tint }}>
              <A.icon size={26} color="#fff" />
            </span>
            <span className="mt-1 size-1 rounded-full" style={{ background: open.includes(id) ? "#fff" : "transparent" }} />
          </button>
        );
      })}
    </div>
  );
}

function Overview({ onLaunch, onClose }: { onLaunch: (id: AppId) => void; onClose: () => void }) {
  return (
    <div
      className="absolute inset-0 grid place-content-center"
      style={{ top: TOP, background: "rgba(0,0,0,0.6)", zIndex: SHELL_Z - 1 }}
      onClick={onClose}
    >
      <div className="grid grid-cols-3 gap-10">
        {DOCK.map((id) => {
          const A = APPS[id];
          return (
            <button
              key={id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLaunch(id);
              }}
              className="flex flex-col items-center gap-2 rounded-[16px] p-4 hover:bg-white/10"
            >
              <span className="grid size-20 place-content-center rounded-[18px]" style={{ background: A.tint }}>
                <A.icon size={40} color="#fff" />
              </span>
              <span style={{ color: UI.fg, fontSize: 15 }}>{A.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Window({
  win,
  focused,
  onFocus,
  onClose,
  onMove,
  children,
}: {
  win: Win;
  focused: boolean;
  onFocus: () => void;
  onClose: () => void;
  onMove: (x: number, y: number) => void;
  children: React.ReactNode;
}) {
  const A = APPS[win.id];
  const drag = useRef<{ px: number; py: number; x: number; y: number; scale: number } | null>(null);
  return (
    <div
      className="absolute flex flex-col overflow-hidden rounded-[12px]"
      style={{
        left: win.x,
        top: win.y,
        width: A.w,
        height: A.h,
        zIndex: win.z,
        background: UI.bg,
        color: UI.fg,
        boxShadow: focused ? "0 12px 40px rgba(0,0,0,0.55)" : "0 6px 20px rgba(0,0,0,0.45)",
        border: `1px solid ${UI.border}`,
      }}
      onPointerDown={onFocus}
    >
      {/* Header bar, the drag handle. The desktop is scaled into the room, so a
          screen pixel is not a desktop pixel: deltas are divided by the scale. */}
      <div
        className="relative flex shrink-0 cursor-default items-center justify-center"
        style={{ height: 40, background: UI.header, borderBottom: `1px solid ${UI.border}` }}
        onPointerDown={(e) => {
          const root = (e.currentTarget.closest("[data-desk]") as HTMLElement | null)?.getBoundingClientRect();
          drag.current = { px: e.clientX, py: e.clientY, x: win.x, y: win.y, scale: root ? root.width / DESK_PX_W : 1 };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          onMove(d.x + (e.clientX - d.px) / d.scale, d.y + (e.clientY - d.py) / d.scale);
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700 }}>{A.title}</span>
        <button
          type="button"
          aria-label={`close ${A.title}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onClose}
          className="absolute right-2 grid size-6 place-content-center rounded-full"
          style={{ background: "rgba(255,255,255,0.1)" }}
        >
          <X size={14} />
        </button>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

/* ----------------------------------------------------------------- apps -- */

const open = (url: string) => window.open(url, "_blank", "noopener");

type Place = "work" | "certs" | "blog" | "repos";

function FilesApp({
  shelf,
  place,
  onPlace,
  posts,
  certPick,
  onCertPick,
}: {
  shelf: ShelfData;
  place: Place;
  onPlace: (p: Place) => void;
  posts: BlogPost[] | null;
  certPick: number | null;
  onCertPick: (i: number | null) => void;
}) {
  const repos = useRepos();
  const PLACES: [Place, string, LucideIcon][] = [
    ["work", "Case studies", Briefcase],
    ["certs", "Certificates", Award],
    ["blog", "Blog", BookOpen],
    ["repos", "Repositories", FolderGit2],
  ];
  const row = (key: string, icon: LucideIcon, title: string, sub: string, onClick: () => void) => {
    const I = icon;
    return (
      <button key={key} type="button" onClick={onClick} className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-white/5">
        <I size={18} color={UI.accent} />
        <span className="min-w-0 flex-1">
          <span className="block truncate" style={{ fontSize: 14 }}>{title}</span>
          <span className="block truncate" style={{ fontSize: 12, color: UI.dim }}>{sub}</span>
        </span>
      </button>
    );
  };
  const cert = certPick !== null ? shelf.certs[certPick] : null;
  return (
    <div className="flex h-full">
      <div className="w-44 shrink-0 py-2" style={{ background: "#2a2a2a" }}>
        {PLACES.map(([id, label, I]) => (
          <button
            key={id}
            type="button"
            onClick={() => onPlace(id)}
            className="mx-2 flex w-[calc(100%-1rem)] items-center gap-2 rounded-md px-3 py-1.5 text-left"
            style={{ background: place === id ? UI.hover : "transparent", fontSize: 14 }}
          >
            <I size={16} />
            {label}
          </button>
        ))}
      </div>
      <div className="min-w-0 flex-1 overflow-y-auto py-1" style={{ background: UI.view }}>
        {place === "work" &&
          shelf.books.map((b) => row(b.slug, Briefcase, b.title, `${b.client} · ${b.period}`, () => open(`/work/${b.slug}`)))}
        {place === "blog" &&
          (posts === null ? (
            <p className="px-4 py-3" style={{ color: UI.dim, fontSize: 13 }}>Loading…</p>
          ) : posts.length === 0 ? (
            <p className="px-4 py-3" style={{ color: UI.dim, fontSize: 13 }}>The blog feed could not be read.</p>
          ) : (
            posts.map((p) => row(p.url, BookOpen, p.title, p.publishedAt?.slice(0, 10) ?? "blog.nordbye.it", () => open(p.url)))
          ))}
        {place === "repos" &&
          (repos.length
            ? repos.map((r) => row(r.url, FolderGit2, r.name, r.description ?? `github.com/${site.github}`, () => open(r.url)))
            : <p className="px-4 py-3" style={{ color: UI.dim, fontSize: 13 }}>Repositories unavailable.</p>)}
        {place === "certs" &&
          (cert ? (
            <div className="px-5 py-4">
              <button type="button" onClick={() => onCertPick(null)} style={{ color: UI.accent, fontSize: 13 }}>
                ‹ Certificates
              </button>
              <Award size={40} color="#e5a50a" className="mt-4" />
              <h3 className="mt-3" style={{ fontSize: 18, fontWeight: 700 }}>{cert.title}</h3>
              <p style={{ color: UI.dim, fontSize: 14 }}>{cert.issuer} · {cert.date}</p>
              {cert.credentialId && <p className="mt-2" style={{ color: UI.dim, fontSize: 12 }}>Credential {cert.credentialId}</p>}
            </div>
          ) : (
            shelf.certs.map((c, i) => row(c.title, Award, c.title, `${c.issuer} · ${c.date}`, () => onCertPick(i)))
          ))}
      </div>
    </div>
  );
}

type Page = "argocd" | "grafana";

function WebApp({ page, onPage, data }: { page: Page; onPage: (p: Page) => void; data: PanelProps }) {
  const url = page === "argocd" ? "https://argocd.genesis.lan/applications" : "https://grafana.genesis.lan/d/genesis";
  const marks: [string, () => void][] = [
    ["Argo CD", () => onPage("argocd")],
    ["Grafana", () => onPage("grafana")],
    ["nordbye.it ↗", () => open("/")],
    ["GitHub ↗", () => open(`https://github.com/${site.github}`)],
  ];
  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 px-3 py-2" style={{ background: UI.header }}>
        <div className="flex-1 truncate rounded-md px-3 py-1" style={{ background: "#1e1e1e", color: UI.dim, fontSize: 13 }}>
          {url}
        </div>
      </div>
      <div className="flex shrink-0 gap-1 px-2 py-1" style={{ background: "#2a2a2a", borderBottom: `1px solid ${UI.border}` }}>
        {marks.map(([label, go]) => (
          <button key={label} type="button" onClick={go} className="rounded px-2 py-0.5 hover:bg-white/10" style={{ fontSize: 12 }}>
            {label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{page === "argocd" ? <ArgoPage data={data} /> : <GrafanaPage data={data} />}</div>
      <div className="shrink-0 truncate px-3 py-1" style={{ background: "#2a2a2a", color: UI.dim, fontSize: 11 }}>
        Mock interface over the room&apos;s live status feed · {data.stale ? "stale" : "live"}
        {data.status?.generatedAt ? ` · updated ${relative(data.status.generatedAt)}` : ""}
      </div>
    </div>
  );
}

const ARGO_OK = "#18be94";
const ARGO_WARN = "#f4c030";

function ArgoPage({ data }: { data: PanelProps }) {
  const list = data.status?.gitops?.applications?.list ?? [];
  const apps = list.length ? list : [{ name: "root", sync: data.argocd.sync, health: data.argocd.health }];
  const synced = apps.filter((a) => a.sync === "Synced").length;
  const healthy = apps.filter((a) => a.health === "Healthy").length;
  return (
    <div className="flex h-full" style={{ background: "#dee6eb", color: "#363c4a" }}>
      <div className="flex w-14 shrink-0 flex-col items-center gap-4 pt-3" style={{ background: "#0f2733" }}>
        <span className="grid size-9 place-content-center rounded-full" style={{ background: "#fff", color: "#ef7b4d", fontWeight: 800 }}>
          ⚓
        </span>
        <Grid3x3 size={18} color="#8fa4b1" />
      </div>
      <div className="min-w-0 flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between">
          <span style={{ fontSize: 18, fontWeight: 600 }}>Applications</span>
          <span className="flex gap-2" style={{ fontSize: 12 }}>
            <span className="rounded px-2 py-0.5" style={{ background: "#fff" }}>
              <span style={{ color: ARGO_OK }}>♥</span> Healthy {healthy}
            </span>
            <span className="rounded px-2 py-0.5" style={{ background: "#fff" }}>
              <span style={{ color: ARGO_OK }}>✓</span> Synced {synced}
            </span>
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {apps.map((a) => {
            const ok = a.sync === "Synced" && a.health === "Healthy";
            return (
              <div key={a.name} className="rounded bg-white p-3 shadow-sm" style={{ borderLeft: `4px solid ${ok ? ARGO_OK : ARGO_WARN}` }}>
                <div className="truncate" style={{ fontSize: 14, fontWeight: 600 }}>{a.name}</div>
                <div className="mt-1" style={{ fontSize: 11, color: "#6d7f8b" }}>Project: default</div>
                <div className="mt-2 flex gap-3" style={{ fontSize: 12 }}>
                  <span style={{ color: a.health === "Healthy" ? ARGO_OK : ARGO_WARN }}>♥ {a.health}</span>
                  <span style={{ color: a.sync === "Synced" ? ARGO_OK : ARGO_WARN }}>✓ {a.sync}</span>
                </div>
                <div className="mt-1 truncate" style={{ fontSize: 11, color: "#6d7f8b" }}>k8s/talos/apps/{a.name}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Gauge({ label, value }: { label: string; value: number | null }) {
  const v = value === null ? 0 : Math.max(0, Math.min(1, value));
  const r = 52;
  const len = Math.PI * r;
  const tone = v > 0.85 ? "#f2495c" : v > 0.7 ? "#ff9830" : "#73bf69";
  return (
    <GPanel title={label}>
      <svg viewBox="0 0 140 84" className="w-full">
        <path d="M18 76 A52 52 0 0 1 122 76" fill="none" stroke="#2c3235" strokeWidth="12" />
        <path d="M18 76 A52 52 0 0 1 122 76" fill="none" stroke={tone} strokeWidth="12" strokeDasharray={`${len * v} ${len}`} />
        <text x="70" y="72" textAnchor="middle" fill="#ccccdc" fontSize="22" fontWeight="600">
          {value === null ? "–" : `${Math.round(v * 100)}%`}
        </text>
      </svg>
    </GPanel>
  );
}

function GPanel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-sm p-2 ${className}`} style={{ background: "#181b1f", border: "1px solid #2c3235" }}>
      <div style={{ fontSize: 12, color: "#ccccdc", fontWeight: 600 }}>{title}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Stat({ title, value, ok }: { title: string; value: string; ok: boolean }) {
  return (
    <GPanel title={title}>
      <div style={{ fontSize: 34, fontWeight: 600, color: ok ? "#73bf69" : "#ff9830", lineHeight: 1.3 }}>{value}</div>
    </GPanel>
  );
}

function GrafanaPage({ data }: { data: PanelProps }) {
  const cap = data.status?.capacity;
  const hist = data.status?.history ?? [];
  const certs = data.status?.security?.certs?.list ?? [];
  const apps = data.status?.gitops?.applications;
  const days = certDaysLeft(data.status?.cert?.notAfter);
  return (
    <div className="h-full overflow-y-auto p-3" style={{ background: "#111217", color: "#ccccdc" }}>
      <div className="mb-2 flex items-center justify-between" style={{ fontSize: 13 }}>
        <span>Home › Dashboards › <b>Genesis</b></span>
        <span className="rounded px-2 py-0.5" style={{ background: "#181b1f", border: "1px solid #2c3235" }}>Last 30 days</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <Stat title="Nodes ready" value={`${data.nodes.ready}/${data.nodes.total}`} ok={data.nodes.ready === data.nodes.total} />
        <Stat
          title="Apps synced"
          value={apps?.total ? `${apps.synced ?? 0}/${apps.total}` : data.argocd.sync}
          ok={apps?.total ? apps.synced === apps.total : data.argocd.sync === "Synced"}
        />
        <Gauge label="CPU requested" value={cap ? cap.cpuRequested / cap.cpuAllocatable : null} />
        <Gauge label="Memory requested" value={cap ? cap.memRequestedGi / cap.memAllocatableGi : null} />
      </div>
      <GPanel title="Availability per day" className="mt-2">
        {hist.length ? (
          <div className="flex h-24 items-end gap-[3px]">
            {hist.map((h) => {
              const r = h.total ? h.ok / h.total : 0;
              return (
                <div
                  key={h.d}
                  title={h.d}
                  className="flex-1"
                  style={{ height: `${Math.max(6, r * 100)}%`, background: r >= 0.999 ? "#73bf69" : r > 0.95 ? "#ff9830" : "#f2495c" }}
                />
              );
            })}
          </div>
        ) : (
          <div className="grid h-24 place-content-center" style={{ color: "#6e7079", fontSize: 13 }}>No data</div>
        )}
      </GPanel>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Stat title="Pods" value={cap ? `${cap.pods}/${cap.podCapacity}` : "–"} ok />
        <GPanel title="Certificates">
          {certs.length ? (
            certs.slice(0, 4).map((c) => (
              <div key={c.name} className="flex justify-between" style={{ fontSize: 12 }}>
                <span className="truncate">{c.name}</span>
                <span style={{ color: c.daysLeft > 21 ? "#73bf69" : "#ff9830" }}>{c.daysLeft} d</span>
              </div>
            ))
          ) : (
            <div style={{ fontSize: 12 }}>{days === null ? "No data" : `site certificate: ${days} d left`}</div>
          )}
        </GPanel>
      </div>
    </div>
  );
}

/* At module level: declared inside RoomApp it would be a new component every
   render, and the re-render a click's pointerdown causes would swap the button
   out from under the click. */
function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
      style={{ background: on ? UI.accent : "#545454" }}
    >
      <span className="absolute top-0.5 size-5 rounded-full bg-white transition-[left]" style={{ left: on ? 22 : 2 }} />
    </button>
  );
}

function RoomApp({ room }: { room: RoomControls }) {
  const LAMPS: [LightKey, string][] = [
    ["lantern", "Lantern"],
    ["desk", "Desk lamp"],
    ["stove", "Wood stove"],
  ];
  return (
    <div className="h-full overflow-y-auto p-4" style={{ background: UI.view }}>
      <div style={{ fontSize: 13, color: UI.dim, fontWeight: 600 }}>Lights</div>
      <div className="mt-2 overflow-hidden rounded-[10px]" style={{ background: "#303030" }}>
        {LAMPS.map(([k, label], i) => (
          <div key={k} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: i ? `1px solid ${UI.border}` : "none" }}>
            <Lamp size={18} />
            <span className="flex-1" style={{ fontSize: 14 }}>{label}</span>
            <Switch on={room.lights[k]} onClick={() => room.onToggleLight(k)} />
          </div>
        ))}
      </div>
      <div className="mt-5" style={{ fontSize: 13, color: UI.dim, fontWeight: 600 }}>Television</div>
      <div className="mt-2 flex items-center gap-3 rounded-[10px] px-4 py-3" style={{ background: "#303030" }}>
        <Tv size={18} />
        <span className="flex-1" style={{ fontSize: 14 }}>{room.channel}</span>
        <button type="button" onClick={room.onNextChannel} className="rounded-md px-3 py-1" style={{ background: "#454545", fontSize: 13 }}>
          Next channel
        </button>
      </div>
    </div>
  );
}

/* Mines: 9x9 with 10 mines, laid on the first reveal so it can never lose. */
const MW = 9;
const MINES = 10;
type Cell = { mine: boolean; open: boolean; flag: boolean; n: number };
type MinesState = { cells: Cell[] | null; flags: Set<number>; opened: Set<number>; state: "play" | "won" | "lost" };
const NEW_MINES: MinesState = { cells: null, flags: new Set(), opened: new Set(), state: "play" };

const around = (i: number) => {
  const x = i % MW;
  const y = Math.floor(i / MW);
  const out: number[] = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if ((dx || dy) && nx >= 0 && ny >= 0 && nx < MW && ny < MW) out.push(ny * MW + nx);
    }
  return out;
};

function layMines(safe: number): Cell[] {
  const keep = new Set([safe, ...around(safe)]);
  const mines = new Set<number>();
  while (mines.size < MINES) {
    const i = Math.floor(Math.random() * MW * MW);
    if (!keep.has(i)) mines.add(i);
  }
  return Array.from({ length: MW * MW }, (_, i) => ({
    mine: mines.has(i),
    open: false,
    flag: false,
    n: around(i).filter((j) => mines.has(j)).length,
  }));
}

function revealMines(s: MinesState, i: number): MinesState {
  if (s.state !== "play" || s.flags.has(i) || s.opened.has(i)) return s;
  const cells = s.cells ?? layMines(i);
  if (cells[i].mine) return { ...s, cells, opened: new Set([...s.opened, i]), state: "lost" };
  const opened = new Set(s.opened);
  const stack = [i];
  while (stack.length) {
    const j = stack.pop()!;
    if (opened.has(j) || s.flags.has(j)) continue;
    opened.add(j);
    if (cells[j].n === 0) stack.push(...around(j));
  }
  const won = opened.size === MW * MW - MINES;
  return { ...s, cells, opened, state: won ? "won" : "play" };
}

function flagMines(s: MinesState, i: number): MinesState {
  if (s.state !== "play" || s.opened.has(i)) return s;
  const flags = new Set(s.flags);
  if (flags.has(i)) flags.delete(i);
  else flags.add(i);
  return { ...s, flags };
}

const NUM = ["", "#3584e4", "#2ec27e", "#e01b24", "#813d9c", "#c64600", "#1c71d8", "#000", "#5e5c64"];

function MinesApp({ s, onReveal, onFlag, onReset }: { s: MinesState; onReveal: (i: number) => void; onFlag: (i: number) => void; onReset: () => void }) {
  return (
    <div className="flex h-full flex-col items-center gap-3 p-4" style={{ background: UI.view }}>
      <div className="flex w-full items-center justify-between" style={{ fontSize: 14 }}>
        <span>
          <Flag size={14} className="mr-1 inline" /> {MINES - s.flags.size}
        </span>
        <span style={{ color: s.state === "lost" ? "#ff7b63" : s.state === "won" ? "#8ff0a4" : UI.dim }}>
          {s.state === "lost" ? "Boom." : s.state === "won" ? "Cleared!" : "Right-click to flag"}
        </span>
        <button type="button" onClick={onReset} className="rounded-md px-2 py-0.5" style={{ background: "#454545", fontSize: 12 }}>
          New
        </button>
      </div>
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${MW}, 32px)` }}>
        {Array.from({ length: MW * MW }, (_, i) => {
          const c = s.cells?.[i];
          const opened = s.opened.has(i) || (s.state === "lost" && c?.mine);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onReveal(i)}
              onContextMenu={(e) => {
                e.preventDefault();
                onFlag(i);
              }}
              className="grid size-8 place-content-center rounded-[4px]"
              style={{ background: opened ? "#2e2e2e" : "#4a4a4a", fontSize: 15, fontWeight: 800, color: c ? NUM[c.n] : undefined }}
            >
              {opened ? (c?.mine ? <Bomb size={16} color="#ff7b63" /> : c && c.n > 0 ? c.n : "") : s.flags.has(i) ? <Flag size={14} color="#ff7b63" /> : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SnakeApp({ playing, onPlay, onExit }: { playing: boolean; onPlay: () => void; onExit: () => void }) {
  if (playing) return <SnakeChannel area={{ w: 558, h: 398 }} playing onExit={onExit} />;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4" style={{ background: "#07100a" }}>
      <div style={{ fontSize: 44, letterSpacing: "0.3em", color: "#65a16e" }} className="font-mono">
        SNAKE
      </div>
      <button type="button" onClick={onPlay} className="rounded-md px-4 py-1.5" style={{ background: "#2ec27e", color: "#000", fontWeight: 700 }}>
        Play
      </button>
      <div className="font-mono" style={{ color: "#8a9a8d", fontSize: 13 }}>
        arrows or WASD steer · Esc ends the game
      </div>
    </div>
  );
}

/* YAML colouring for the editor: comments, keys, scalars and numbers. */
const KEY_LINE = /^(\s*-?\s*)([A-Za-z0-9_./-]+)(:)(.*)$/;
const TONE = { comment: "#8a9a8d", key: "#62a0ea", value: "#8ff0a4", number: "#f8e45c", plain: "#deddda", punct: "#77767b" };

function YamlLine({ text }: { text: string }) {
  if (text.trimStart().startsWith("#")) return <span style={{ color: TONE.comment }}>{text}</span>;
  const m = text.match(KEY_LINE);
  if (!m) return <span style={{ color: TONE.plain }}>{text}</span>;
  const [, indent, key, colon, rest] = m;
  const hash = rest.indexOf(" #");
  const value = hash === -1 ? rest : rest.slice(0, hash);
  const t = value.trim();
  return (
    <>
      <span>{indent}</span>
      <span style={{ color: TONE.key }}>{key}</span>
      <span style={{ color: TONE.punct }}>{colon}</span>
      <span style={{ color: /^-?\d+(\.\d+)?[a-zA-Z%]*$/.test(t) ? TONE.number : TONE.value }}>{value}</span>
      {hash !== -1 && <span style={{ color: TONE.comment }}>{rest.slice(hash)}</span>}
    </>
  );
}

function EditorApp({ source }: { source: SourceExcerpt }) {
  return (
    <div className="h-full overflow-auto py-2 font-mono" style={{ background: UI.view, fontSize: 13, lineHeight: "19px", whiteSpace: "pre" }}>
      {source.lines.length === 0 ? (
        <p className="px-4" style={{ color: UI.dim }}>Source unavailable.</p>
      ) : (
        source.lines.map((l, i) => (
          <div key={i} className="flex">
            <span className="w-10 shrink-0 pr-3 text-right" style={{ color: "#5e5c64" }}>{i + 1}</span>
            <YamlLine text={l} />
          </div>
        ))
      )}
    </div>
  );
}

/* -------------------------------------------------------------- monitor -- */

export function DesktopScreen({
  position,
  rotation,
  width,
  powered,
  active,
  onActivate,
  onExit,
  data,
  source,
  shelf,
  room,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  powered: boolean;
  /** Zoomed in, with the cursor free: the desktop takes clicks. */
  active: boolean;
  onActivate: () => void;
  onExit: () => void;
  data: PanelProps;
  source: SourceExcerpt;
  shelf: ShelfData;
  room: RoomControls;
}) {
  const h = width * (DESK_PX_H / DESK_PX_W);

  // A browser on Grafana, so the screen reads as a desktop from across the room.
  const [wins, setWins] = useState<Win[]>([{ id: "web", x: 190, y: 64, z: 1 }]);
  const [overview, setOverview] = useState(false);
  const [page, setPage] = useState<Page>("grafana");
  const [place, setPlace] = useState<Place>("work");
  const [certPick, setCertPick] = useState<number | null>(null);
  const [posts, setPosts] = useState<BlogPost[] | null>(null);
  const [mines, setMines] = useState<MinesState>(NEW_MINES);
  const [snake, setSnake] = useState(false);

  const top = wins.reduce((m, w) => Math.max(m, w.z), 0);
  const focus = useCallback((id: AppId) => {
    setWins((ws) => {
      const z = ws.reduce((m, w) => Math.max(m, w.z), 0);
      return ws.map((w) => (w.id === id && w.z !== z ? { ...w, z: z + 1 } : w));
    });
  }, []);
  const launch = useCallback((id: AppId) => {
    setOverview(false);
    setWins((ws) => {
      const z = ws.reduce((m, w) => Math.max(m, w.z), 0) + 1;
      if (ws.some((w) => w.id === id)) return ws.map((w) => (w.id === id ? { ...w, z } : w));
      const A = APPS[id];
      const n = ws.length;
      return [...ws, { id, x: Math.min(DESK_PX_W - A.w - 20, 120 + n * 36), y: Math.min(DESK_PX_H - A.h - 90, TOP + 24 + n * 30), z }];
    });
  }, []);
  const close = useCallback((id: AppId) => {
    setWins((ws) => ws.filter((w) => w.id !== id));
    if (id === "snake") setSnake(false);
  }, []);
  const move = useCallback((id: AppId, x: number, y: number) => {
    const A = APPS[id];
    setWins((ws) =>
      ws.map((w) =>
        w.id === id
          ? { ...w, x: Math.max(-A.w + 80, Math.min(DESK_PX_W - 80, x)), y: Math.max(TOP, Math.min(DESK_PX_H - 50, y)) }
          : w,
      ),
    );
  }, []);

  // The blog list is fetched the first time Files shows it, never with the room.
  useEffect(() => {
    if (place !== "blog" || posts !== null) return;
    let cancelled = false;
    fetch("/api/v1/blog")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { posts?: BlogPost[] }) => !cancelled && setPosts(j.posts ?? []))
      .catch(() => !cancelled && setPosts([]));
    return () => {
      cancelled = true;
    };
  }, [place, posts]);

  const body = (id: AppId) => {
    switch (id) {
      case "files":
        return <FilesApp shelf={shelf} place={place} onPlace={(p) => { setPlace(p); setCertPick(null); }} posts={posts} certPick={certPick} onCertPick={setCertPick} />;
      case "web":
        return <WebApp page={page} onPage={setPage} data={data} />;
      case "room":
        return <RoomApp room={room} />;
      case "mines":
        return (
          <MinesApp
            s={mines}
            onReveal={(i) => setMines((s) => revealMines(s, i))}
            onFlag={(i) => setMines((s) => flagMines(s, i))}
            onReset={() => setMines(NEW_MINES)}
          />
        );
      case "snake":
        // Only while at the computer: a running game takes every key.
        return <SnakeApp playing={snake && active} onPlay={() => setSnake(true)} onExit={() => setSnake(false)} />;
      case "editor":
        return <EditorApp source={source} />;
    }
  };

  return (
    <group position={position} rotation={rotation}>
      <RoundedBox position={[0, 0, -0.018]} args={[width + 0.022, h + 0.022, 0.03]} radius={0.005} smoothness={4} castShadow>
        <meshStandardMaterial color="#131614" roughness={0.62} metalness={0.25} />
      </RoundedBox>
      <mesh>
        <planeGeometry args={[width, h]} />
        <meshBasicMaterial color="#0b0d10" />
      </mesh>

      {/* The whole screen is the target while you are not using it. */}
      {!active && (
        <Interactive label="the computer" verb="use" detail="a desktop on the homelab" onActivate={onActivate}>
          <mesh position={[0, 0, 0.01]} visible={false}>
            <planeGeometry args={[width, h]} />
            <meshBasicMaterial />
          </mesh>
        </Interactive>
      )}

      <Html
        transform
        occlude="blending"
        geometry={<planeGeometry args={[width, h]} />}
        distanceFactor={distanceFactor(width, DESK_PX_W)}
        position={[0, 0, 0.008]}
        zIndexRange={[10, 0]}
        style={{
          width: `${DESK_PX_W}px`,
          height: `${DESK_PX_H}px`,
          opacity: powered ? 1 : 0,
          transition: "opacity 520ms ease-out",
          pointerEvents: active ? "auto" : "none",
          userSelect: "none",
        }}
      >
        <div
          data-desk
          className="relative h-full w-full overflow-hidden"
          style={{
            fontFamily: 'Cantarell, "Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
            background:
              "radial-gradient(ellipse at 30% 110%, #2f4a7a 0%, transparent 55%), radial-gradient(ellipse at 85% -10%, #6b3f8f 0%, transparent 50%), linear-gradient(160deg, #1b2440 0%, #141a2c 60%, #0e1220 100%)",
            color: UI.fg,
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <TopBar active={active} onActivities={() => setOverview((o) => !o)} onExit={onExit} />
          {wins.map((w) => (
            <Window
              key={w.id}
              win={w}
              focused={w.z === top}
              onFocus={() => focus(w.id)}
              onClose={() => close(w.id)}
              onMove={(x, y) => move(w.id, x, y)}
            >
              {body(w.id)}
            </Window>
          ))}
          {overview && <Overview onLaunch={launch} onClose={() => setOverview(false)} />}
          <Dock open={wins.map((w) => w.id)} onLaunch={launch} />
        </div>
      </Html>
    </group>
  );
}
