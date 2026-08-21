// Render the live cluster card for the README from the status payload that
// .github/workflows/status-card.yaml fetches off nordbye.it/api/v1/infra.
//
// The cluster publishes facts and nothing else; the drawing happens here so no
// GitHub credential ever has to live inside the cluster. Reads dist/status.json,
// writes dist/status.svg (light) and dist/status-dark.svg; the workflow
// publishes both to the status-data branch and the README picks a theme with
// <picture>.
//
// A payload marked unreachable renders the "can't see the cluster" card rather
// than redrawing yesterday's numbers, so the card never claims to know more
// than it does.
//
// Run locally:  node scripts/render-status-card.mjs

import { readFileSync, writeFileSync } from "node:fs";

// Brand palette, one hue at three steps (nordbye.it/brand). Shared with
// scripts/render-star-history.mjs — keep the two in step.
const DARK = {
  bg: "#0f1410", line: "#2a382c", muted: "#a1ada3", faint: "#708373",
  accent: "#51a45e", accent2: "#8ec798", accent3: "#61b86f",
};
const LIGHT = {
  bg: "#f9fbf9", line: "#d1ddd3", muted: "#415344", faint: "#5f7963",
  accent: "#378144", accent2: "#40a551", accent3: "#3d954c",
};

const W = 840;
const H = 492;
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,monospace";

const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const tspan = (x, y, s, { size = 14, weight = 400, fill, font = FONT, anchor = "start" } = {}) =>
  `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(s)}</text>`;

const eyebrow = (x, y, s, t, anchor = "start") =>
  tspan(x, y, String(s).toUpperCase(), { size: 11, weight: 600, fill: t.faint, font: MONO, anchor });

const STYLE = `
  .reveal{animation:rise .7s cubic-bezier(.2,.7,.3,1) both}
  @keyframes rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  .pulse{animation:pulse 2.2s ease-in-out infinite}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
  .grow{transform-origin:left center;animation:grow 1.4s cubic-bezier(.2,.7,.3,1) both}
  @keyframes grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
`;

function card(t, inner, label, h = H) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h}" viewBox="0 0 ${W} ${h}" role="img" aria-label="${esc(label)}">
  <defs>
    <style>${STYLE}</style>
    <clipPath id="topclip"><rect x="0" y="0" width="${W}" height="2"/></clipPath>
  </defs>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${h - 1}" rx="14" fill="${t.bg}" stroke="${t.line}"/>
  <g clip-path="url(#topclip)">
    <rect x="0" y="0" width="${W}" height="2" fill="${t.accent}"/>
  </g>
  <g class="reveal">${inner}</g>
</svg>`;
}

const DOWN_H = 200;

const GB = 1000 ** 3;
const GIB = 1024 ** 3;

// Exact, with separators. Rounded-down counts read as marketing; the whole
// number reads as a measurement, which is what it is.
const fmt = (n) => (n == null ? "—" : Math.round(n).toLocaleString("en-US"));

const gb = (bytes) => (bytes == null ? "—" : `${(bytes / GB).toFixed(2)} GB`);
const gib = (bytes) => (bytes == null ? "—" : `${(bytes / GIB).toFixed(1)} GiB`);

function ago(iso, now) {
  if (!iso) return "—";
  const mins = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 48) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

const daysUntil = (iso, now) =>
  iso ? Math.round((Date.parse(iso) - now) / 86400000) : null;

// A horizontal meter with its own label, used for CPU and memory.
function meter(t, x, y, w, label, used, total, detail) {
  const pct = total ? Math.min(1, used / total) : 0;
  const fill = Math.max(4, w * pct);
  return `
    ${eyebrow(x, y, label, t)}
    ${tspan(x + w, y, `${(pct * 100).toFixed(1)}%`, { size: 12, weight: 700, fill: t.accent, font: MONO, anchor: "end" })}
    <rect x="${x}" y="${y + 10}" width="${w}" height="8" rx="4" fill="${t.line}"/>
    <rect class="grow" x="${x}" y="${y + 10}" width="${fill.toFixed(1)}" height="8" rx="4" fill="${t.accent}"/>
    ${tspan(x, y + 36, detail, { size: 12, weight: 500, fill: t.muted, font: MONO })}`;
}

// One pill per app KEDA is allowed to take to zero. Filled means it's serving
// right now, hollow means it's at zero and the next request wakes it. Wraps
// onto a second row rather than running off the card as apps are added.
function pills(t, x, y, tiles, maxW) {
  const gap = 8;
  const rowH = 30;
  let cx = x;
  let row = 0;
  return tiles
    .map(({ name, state }) => {
      const w = 16 + name.length * 7.1;
      if (cx > x && cx + w > x + maxW) {
        row += 1;
        cx = x;
      }
      const cy = y + row * rowH;
      const asleep = state === "asleep";
      const el = `
        <rect x="${cx.toFixed(1)}" y="${cy}" width="${w.toFixed(1)}" height="24" rx="12"
          fill="${asleep ? "none" : t.accent}" fill-opacity="${asleep ? 0 : 0.16}"
          stroke="${asleep ? t.line : t.accent}" stroke-dasharray="${asleep ? "3 3" : "none"}"/>
        ${tspan(cx + w / 2, cy + 16, name, { size: 11, weight: 600, fill: asleep ? t.faint : t.accent, font: MONO, anchor: "middle" })}`;
      cx += w + gap;
      return el;
    })
    .join("");
}

// 30 cells, one per day, built from the calendar rather than from the array so
// a day the publisher never ran shows as a hole instead of vanishing.
function strip(t, x, y, w, history, now) {
  const byDay = new Map((history ?? []).map((h) => [h.d, h]));
  const cellW = (w - 29 * 3) / 30;
  let ok = 0;
  let total = 0;
  const cells = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now - (29 - i) * 86400000).toISOString().slice(0, 10);
    const e = byDay.get(d);
    const cx = x + i * (cellW + 3);
    if (!e || !e.total) {
      return `<rect x="${cx.toFixed(1)}" y="${y}" width="${cellW.toFixed(1)}" height="18" rx="3" fill="none" stroke="${t.line}" stroke-dasharray="2 2"/>`;
    }
    ok += e.ok;
    total += e.total;
    const ratio = e.ok / e.total;
    const fill = ratio >= 0.995 ? t.accent : ratio >= 0.95 ? t.accent2 : t.faint;
    return `<rect x="${cx.toFixed(1)}" y="${y}" width="${cellW.toFixed(1)}" height="18" rx="3" fill="${fill}" fill-opacity="${ratio >= 0.995 ? 0.9 : 0.8}"/>`;
  }).join("");
  const pct = total ? ((ok / total) * 100).toFixed(2) : null;
  return { cells, pct };
}

function render(t, s, now) {
  const nodes = s.nodes ?? {};
  const apps = s.gitops?.applications ?? {};
  const res = s.resources ?? {};
  const sec = s.security ?? {};
  const obs = s.observability ?? {};
  const allSynced = apps.total && apps.synced === apps.total && apps.healthy === apps.total;
  const nodesOk = nodes.ready === nodes.total;
  const stale = now - Date.parse(s.generatedAt) > 30 * 60000;

  const headline = [
    ["applications", apps.total ? `${apps.synced}/${apps.total}` : "—", allSynced ? "synced · healthy" : "synced", allSynced],
    ["nodes ready", nodes.total ? `${nodes.ready}/${nodes.total}` : "—", `${res.uptimeDays ?? "—"}d since boot`, nodesOk],
    ["pods running", fmt(res.podsRunning), `${res.images ?? "—"} distinct images`, true],
    ["critical alerts", fmt(obs.alerts?.critical), `${fmt(res.restarts24h)} restarts in 24h`, (obs.alerts?.critical ?? 0) === 0],
  ];

  const tileW = (W - 80) / headline.length;
  const tiles = headline
    .map(([label, value, sub, good], i) => {
      const x = 40 + i * tileW;
      return `${tspan(x, 92, value, { size: 23, weight: 700, fill: good ? t.accent : t.muted, font: MONO })}
        ${eyebrow(x, 114, label, t)}
        ${tspan(x, 132, sub, { size: 11, weight: 500, fill: t.muted, font: MONO })}`;
    })
    .join("");

  const cpu = res.cpu ?? {};
  const mem = res.memory ?? {};
  const meters = `
    ${meter(t, 40, 168, 350, "cpu", cpu.used, cpu.allocatable, `${(cpu.used ?? 0).toFixed(2)} of ${(cpu.allocatable ?? 0).toFixed(2)} cores · prometheus`)}
    ${meter(t, 450, 168, 350, "memory", mem.usedBytes, mem.allocatableBytes, `${gib(mem.usedBytes)} of ${gib(mem.allocatableBytes)} · prometheus`)}`;

  const asleep = s.apps?.asleep ?? 0;
  const sleepers = s.apps?.sleepers ?? 0;
  const sleepRow = `
    ${eyebrow(40, 252, `${asleep} of ${sleepers} asleep · the next request wakes them`, t)}
    ${pills(t, 40, 262, s.apps?.tiles ?? [], W - 80)}`;

  const certDays = daysUntil(sec.certs?.nextExpiry, now);
  const facts = [
    [`${sec.secretsAtRuntime ?? "—"} secrets at runtime`, `${sec.secretsInGit ?? 0} in git`],
    [`${fmt(sec.syscalls24h)} syscalls`, "inspected by falco, last 24h"],
    [`${gb(obs.logBytes24h)} of logs`, "shipped to loki, last 24h"],
    [`${sec.networkPolicies ?? "—"} network policies`, sec.policyMode === "audit" ? "audit mode, not enforcing" : "enforcing"],
    [`${s.storage?.claimedGiB ?? "—"} GiB claimed`, `across ${s.storage?.volumes ?? "—"} volumes`],
    [certDays == null ? "cert —" : `cert renews in ${certDays}d`, `${s.gitops?.syncs30d ?? "—"} syncs in 30 days`],
  ];
  const colW = (W - 80) / 3;
  const factRows = facts
    .map(([head, sub], i) => {
      const x = 40 + (i % 3) * colW;
      const y = 362 + Math.floor(i / 3) * 34;
      return `${tspan(x, y, head, { size: 13, weight: 700, fill: t.muted, font: MONO })}
        ${tspan(x, y + 15, sub, { size: 11, weight: 500, fill: t.faint, font: MONO })}`;
    })
    .join("");

  const { cells, pct } = strip(t, 40, 440, 480, s.history, now);
  const last = s.gitops?.lastSync ?? {};

  return `
    <circle class="${stale ? "" : "pulse"}" cx="46" cy="36" r="5" fill="${stale ? t.faint : t.accent}"/>
    ${eyebrow(60, 40, stale ? "cluster · stale" : "cluster · live", t)}
    ${tspan(W - 40, 40, `${s.versions?.talos ?? "—"} talos · ${s.versions?.kubernetes ?? "—"} kubernetes`, { size: 12, weight: 600, fill: t.muted, font: MONO, anchor: "end" })}
    ${tiles}
    <line x1="40" y1="150" x2="${W - 40}" y2="150" stroke="${t.line}"/>
    ${meters}
    <line x1="40" y1="228" x2="${W - 40}" y2="228" stroke="${t.line}"/>
    ${sleepRow}
    <line x1="40" y1="336" x2="${W - 40}" y2="336" stroke="${t.line}"/>
    ${factRows}
    ${cells}
    ${eyebrow(40, 432, `last 30 days${pct ? ` · ${pct}%` : ""}`, t)}
    ${tspan(W - 40, 432, `last deploy · ${last.name ?? "—"} · ${ago(last.at, now)}`, { size: 11, weight: 600, fill: t.faint, font: MONO, anchor: "end" })}
    ${eyebrow(40, 478, "source", t)}
    ${tspan(94, 478, `kubernetes api and prometheus, read in cluster ${(s.generatedAt ?? "").replace("T", " ").replace("Z", "Z")} · nordbye.it/api/v1/infra`, { size: 11, weight: 500, fill: t.faint, font: MONO })}`;
}

// The cluster didn't answer. Say that, and say when it last did.
function renderUnreachable(t, s, now) {
  return `
    <circle cx="46" cy="36" r="5" fill="${t.faint}"/>
    ${eyebrow(60, 40, "cluster · unreachable", t)}
    ${tspan(40, 104, "No answer from the cluster", { size: 30, weight: 700, fill: t.muted })}
    ${tspan(40, 136, s.lastSeen ? `Last seen ${ago(s.lastSeen, now)}. The numbers below are from then.` : "No earlier reading to fall back on.", { size: 14, weight: 500, fill: t.faint })}
    ${tspan(40, DOWN_H - 22, "source · nordbye.it/api/v1/infra", { size: 11, weight: 500, fill: t.faint, font: MONO })}
    ${s.lastSeen ? tspan(40, 168, `${s.gitops?.applications?.synced ?? "—"}/${s.gitops?.applications?.total ?? "—"} applications synced · ${s.nodes?.ready ?? "—"}/${s.nodes?.total ?? "—"} nodes ready`, { size: 14, weight: 600, fill: t.faint, font: MONO }) : ""}`;
}

const src = JSON.parse(readFileSync("dist/status.json", "utf8"));
const now = Date.now();
const down = Boolean(src.unreachable);
const label = down ? "Cluster unreachable" : "Live cluster status";

for (const [name, t] of [["dist/status.svg", LIGHT], ["dist/status-dark.svg", DARK]]) {
  writeFileSync(name, card(t, down ? renderUnreachable(t, src, now) : render(t, src, now), label, down ? DOWN_H : H));
}

console.log(
  down
    ? "✓ unreachable card → dist/status.svg, dist/status-dark.svg"
    : `✓ ${src.gitops?.applications?.synced}/${src.gitops?.applications?.total} apps, ${src.apps?.asleep} asleep → dist/status.svg, dist/status-dark.svg`,
);
