// Render the star history chart for the README from the stargazer days that
// .github/workflows/star-history.yaml collects.
//
// star-history.com stopped serving this repo's chart ("GitHub restricted access
// to star data"), so the chart is drawn here from our own token's read of our
// own stargazers. Reads dist/stars.json, writes dist/stars.svg (light) and
// dist/stars-dark.svg; the workflow publishes both to the stars-data branch and
// the README picks a theme with <picture>.
//
// Run locally:  node scripts/render-star-history.mjs

import { readFileSync, writeFileSync } from "node:fs";

// Brand palette, one hue at three steps (nordbye.it/brand).
const DARK = {
  bg: "#0f1410", line: "#2a382c", muted: "#a1ada3", faint: "#708373",
  accent: "#51a45e", accent2: "#8ec798", accent3: "#61b86f",
};
const LIGHT = {
  bg: "#f9fbf9", line: "#d1ddd3", muted: "#415344", faint: "#5f7963",
  accent: "#378144", accent2: "#40a551", accent3: "#3d954c",
};

const W = 840;
const H = 288;
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,monospace";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const tspan = (x, y, s, { size = 14, weight = 400, fill, font = FONT, anchor = "start" } = {}) =>
  `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(s)}</text>`;

const eyebrow = (x, y, s, t) =>
  tspan(x, y, s.toUpperCase(), { size: 11, weight: 600, fill: t.faint, font: MONO });

const STYLE = `
  .reveal{animation:rise .7s cubic-bezier(.2,.7,.3,1) both}
  @keyframes rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  .shimmer{animation:sweep 3.4s ease-in-out infinite}
  @keyframes sweep{0%{transform:translateX(-45%)}50%{transform:translateX(45%)}100%{transform:translateX(-45%)}}
  .pulse{animation:pulse 2.2s ease-in-out infinite}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
  .draw{stroke-dasharray:4000;stroke-dashoffset:4000;animation:draw 2.4s cubic-bezier(.2,.7,.3,1) forwards}
  @keyframes draw{to{stroke-dashoffset:0}}
  .fadein{opacity:0;animation:fadein 1.2s ease-out .5s forwards}
  @keyframes fadein{to{opacity:1}}`;

function card(t, inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Star history">
  <defs>
    <style>${STYLE}</style>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${t.accent}"/><stop offset="0.5" stop-color="${t.accent2}"/><stop offset="1" stop-color="${t.accent3}"/>
    </linearGradient>
    <linearGradient id="glow" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0"/><stop offset="0.5" stop-color="#ffffff" stop-opacity="0.75"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${t.accent}" stop-opacity="0.34"/><stop offset="1" stop-color="${t.accent}" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="topclip"><rect x="0" y="0" width="${W}" height="3"/></clipPath>
  </defs>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="${t.bg}" stroke="${t.line}"/>
  <g clip-path="url(#topclip)">
    <rect x="0" y="0" width="${W}" height="3" fill="url(#accent)"/>
    <rect class="shimmer" x="${W / 2 - 130}" y="0" width="260" height="3" fill="url(#glow)"/>
  </g>
  <g class="reveal">${inner}</g>
</svg>`;
}

function chart(t, days, total, now) {
  const day = 86400000;
  const x0 = 40, chartW = W - 80, base = 246, chartH = 78;
  const t0 = Date.parse(days[0][0]);
  const span = Math.max(now - t0, day);
  const px = (ts) => x0 + ((ts - t0) / span) * chartW;
  const py = (n) => base - (n / total) * chartH;

  // One point per day with a star, sampled so the path stays small as the repo
  // ages. The first and last day and the flat run to now always survive.
  const stride = Math.ceil(days.length / 220);
  const pts = [[x0, base]];
  let run = 0;
  days.forEach(([d, c], i) => {
    run += c;
    if (i % stride === 0 || i === days.length - 1) pts.push([px(Date.parse(d)), py(run)]);
  });
  pts.push([x0 + chartW, py(total)]);
  const r = (p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
  const line = pts.map(r).join(" ");
  const area = `M${r(pts[0])} L${pts.map(r).join(" L")} L${(x0 + chartW).toFixed(1)},${base} Z`;
  const last = pts.at(-1);

  // Month gridlines, thinned so the labels never collide.
  const marks = [];
  let m = new Date(t0);
  m = Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 1);
  while (m < now) {
    marks.push(m);
    const d = new Date(m);
    m = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
  }
  const every = Math.ceil(marks.length / 8);
  const axis = marks
    .filter((_, i) => i % every === 0)
    .map((ms) => {
      const d = new Date(ms);
      const x = px(ms);
      const label = d.getUTCMonth() === 0 ? `${MONTHS[0]} ${d.getUTCFullYear()}` : MONTHS[d.getUTCMonth()];
      return `<line x1="${x.toFixed(1)}" y1="${base - chartH}" x2="${x.toFixed(1)}" y2="${base}" stroke="${t.line}" opacity="0.55"/>
        ${tspan(x, base + 18, label.toUpperCase(), { size: 10, weight: 600, fill: t.faint, font: MONO, anchor: "middle" })}`;
    })
    .join("");

  const first = new Date(t0);
  return `
    ${eyebrow(40, 152, "cumulative stars", t)}
    ${tspan(W - 40, 152, `${MONTHS[first.getUTCMonth()]} ${first.getUTCFullYear()} → today`, { size: 12, weight: 600, fill: t.muted, font: MONO, anchor: "end" })}
    ${axis}
    <line x1="${x0}" y1="${base}" x2="${x0 + chartW}" y2="${base}" stroke="${t.line}"/>
    <path class="fadein" d="${area}" fill="url(#area)"/>
    <polyline class="draw" points="${line}" fill="none" stroke="url(#accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    <circle class="pulse" cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="3.5" fill="${t.accent3}"/>`;
}

const src = JSON.parse(readFileSync("dist/stars.json", "utf8"));
const days = Object.entries(src.days ?? {}).sort(([a], [b]) => a.localeCompare(b));
if (!days.length) {
  console.error("no star days in dist/stars.json");
  process.exit(1);
}
const total = src.total ?? days.reduce((a, [, n]) => a + n, 0);
const now = Date.parse(src.generatedAt ?? new Date().toISOString());
const day = 86400000;

const since = (n) => {
  const cutoff = new Date(now - n * day).toISOString().slice(0, 10);
  return days.reduce((a, [d, c]) => (d >= cutoff ? a + c : a), 0);
};
const peak = days.reduce((best, e) => (e[1] > best[1] ? e : best));

const tiles = [
  ["total stars", `${total}`],
  ["last 30 days", `+${since(30)}`],
  ["last 7 days", `+${since(7)}`],
  [`peak day · ${Number(peak[0].slice(8, 10))} ${MONTHS[Number(peak[0].slice(5, 7)) - 1]}`, `${peak[1]}`],
];

for (const [name, t] of [["dist/stars.svg", LIGHT], ["dist/stars-dark.svg", DARK]]) {
  const tileW = (W - 80) / tiles.length;
  const tilesSvg = tiles
    .map(([label, val], i) => {
      const x = 40 + i * tileW;
      return `${tspan(x, 86, val, { size: 26, weight: 700, fill: t.accent, font: MONO })}
        ${eyebrow(x, 108, label, t)}`;
    })
    .join("");
  const inner = `
    ${eyebrow(40, 40, "star history", t)}
    ${tilesSvg}
    <line x1="40" y1="130" x2="${W - 40}" y2="130" stroke="${t.line}"/>
    ${chart(t, days, total, now)}`;
  writeFileSync(name, card(t, inner));
}

console.log(`✓ ${total} stars over ${days.length} days → dist/stars.svg, dist/stars-dark.svg`);
