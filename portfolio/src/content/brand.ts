/**
 * Brand system tokens — "Eucalyptus Deepened".
 *
 * Hue is locked to 130. Every value was solved against its own ground for a
 * target WCAG ratio rather than picked by hand, so the contrast figures below
 * are measured, not aspirational. The categorical data colours were validated
 * for colour-vision deficiency separately.
 *
 * These are NOT the tokens the live site currently ships (see styles/tokens.css,
 * which is still the arctic-blue system). The /brand route scopes them locally
 * so the spec can exist before the site is migrated onto it.
 */

export type Swatch = {
  name: string;
  hex: string;
  /** contrast against the ground this token is designed to sit on */
  cr?: string;
  use?: string;
};

export type SwatchGroup = {
  title: string;
  intro?: string;
  ground: "light" | "dark";
  swatches: Swatch[];
};

export const brandHue = 130;

export const colorGroups: SwatchGroup[] = [
  {
    title: "Grounds",
    intro:
      "Three depths per mode plus the brand field. The field is for large blocks where the colour itself has to carry the page.",
    ground: "dark",
    swatches: [
      { name: "anchor", hex: "#0f1410", use: "page ground, dark" },
      { name: "anchor-2", hex: "#191f1a", use: "raised surface" },
      { name: "anchor-3", hex: "#222a23", use: "modal, overlay" },
      { name: "field", hex: "#142e18", use: "brand block at scale" },
    ],
  },
  {
    title: "Grounds · light",
    ground: "light",
    swatches: [
      { name: "paper", hex: "#f9fbf9", use: "page ground, light" },
      { name: "paper-2", hex: "#f0f5f1", use: "raised surface" },
      { name: "paper-3", hex: "#e7eee8", use: "inset, sunken" },
    ],
  },
  {
    title: "Ink · on light",
    intro:
      "Hue-locked to 130 at very low saturation, so no neutral on the page reads as default grey.",
    ground: "light",
    swatches: [
      { name: "ink", hex: "#1a201b", cr: "15.95:1", use: "headings" },
      { name: "ink-2", hex: "#415344", cr: "7.94:1", use: "body prose" },
      { name: "ink-3", hex: "#5f7963", cr: "4.59:1", use: "labels, captions" },
      { name: "line", hex: "#d1ddd3", cr: "1.35:1", use: "hairline" },
      { name: "line-2", hex: "#a6bfaa", cr: "1.90:1", use: "input border" },
    ],
  },
  {
    title: "Snow · on dark",
    ground: "dark",
    swatches: [
      { name: "snow", hex: "#e9ebe9", cr: "15.49:1", use: "headings" },
      { name: "snow-2", hex: "#a1ada3", cr: "7.98:1", use: "body prose" },
      { name: "snow-3", hex: "#708373", cr: "4.58:1", use: "labels, captions" },
      { name: "d-line", hex: "#2a382c", cr: "1.50:1", use: "hairline" },
      { name: "d-line-2", hex: "#3e5542", cr: "2.28:1", use: "input border" },
    ],
  },
  {
    title: "Brand",
    intro:
      "One hue, saturation held at 34. Push it higher and eucalyptus becomes grass. No single value clears AA text contrast on both white and near-black — that is arithmetic, not a hue problem — so there are two steps rather than one.",
    ground: "dark",
    swatches: [
      { name: "brand", hex: "#51a45e", cr: "6.03:1 on anchor", use: "accent on dark" },
      { name: "brand-hover", hex: "#65b372", cr: "7.29:1", use: "hover, dark" },
      { name: "brand-active", hex: "#478f53", cr: "4.71:1", use: "pressed, dark" },
      { name: "brand-subtle-d", hex: "#1e3322", use: "tinted block, dark" },
    ],
  },
  {
    title: "Brand · on light",
    ground: "light",
    swatches: [
      { name: "brand-ink", hex: "#378144", cr: "4.61:1 on paper", use: "links, text" },
      { name: "brand-solid", hex: "#358142", cr: "4.81:1 vs white", use: "filled button" },
      { name: "brand-subtle", hex: "#ebf4ed", use: "tinted block, light" },
    ],
  },
];

export const semantic = [
  {
    name: "success",
    light: "#378144",
    dark: "#51a45e",
    bgLight: "#ebf4ed",
    bgDark: "#1e3322",
    crLight: "4.61:1",
    crDark: "6.03:1",
    note: "Success is the brand green. A green brand plus a separate emerald success would be two greens meaning different things, which is worse than reusing one.",
  },
  {
    name: "warning",
    light: "#956b23",
    dark: "#c09955",
    bgLight: "#f6efe4",
    bgDark: "#332a17",
    crLight: "4.59:1",
    crDark: "7.01:1",
    note: "Amber at hue 38, far enough from the brand to never be mistaken for it.",
  },
  {
    name: "danger",
    light: "#ca442f",
    dark: "#d18e83",
    bgLight: "#f9e9e6",
    bgDark: "#331a15",
    crLight: "4.61:1",
    crDark: "6.99:1",
    note: "Destructive actions use this and are spatially separated from the primary action.",
  },
  {
    name: "info",
    light: "#247c99",
    dark: "#5ca9c3",
    bgLight: "#e4f0f5",
    bgDark: "#153039",
    crLight: "4.57:1",
    crDark: "7.00:1",
    note: "Teal-blue at 195. It carries the neutral-positive signal that a green brand can no longer spare.",
  },
];

/** Fixed order, never cycled. A sixth series folds into Other or becomes small multiples. */
export const dataSeries = [
  { name: "series 1", label: "eucalyptus", light: "#2f7d4f", dark: "#4f9e6a" },
  { name: "series 2", label: "plum", light: "#af2c7f", dark: "#c26191" },
  { name: "series 3", label: "blue", light: "#266bba", dark: "#3f8fd0" },
  { name: "series 4", label: "rust", light: "#d15a1f", dark: "#c9713f" },
  { name: "series 5", label: "indigo", light: "#734eca", dark: "#9077d4" },
];

export const typeScale = [
  { role: "display", size: "clamp(2.6rem, 6vw, 4rem)", weight: 500, lh: "1.0", tracking: "-0.022em", face: "display", sample: "Infrastructure that stays up" },
  { role: "h1", size: "clamp(2rem, 4vw, 2.75rem)", weight: 500, lh: "1.08", tracking: "-0.018em", face: "display", sample: "Getting off the shared cluster" },
  { role: "h2", size: "1.6rem", weight: 600, lh: "1.18", tracking: "-0.012em", face: "display", sample: "Three things are load-bearing" },
  { role: "h3", size: "1.15rem", weight: 640, lh: "1.3", tracking: "-0.006em", face: "body", sample: "Ingress and secrets share a failure domain" },
  { role: "body-lg", size: "1.125rem", weight: 400, lh: "1.65", tracking: "0", face: "body", sample: "Platform work is judged on the days nothing happens." },
  { role: "body", size: "1rem", weight: 400, lh: "1.6", tracking: "0", face: "body", sample: "The boring outcome is the default one, by design." },
  { role: "body-sm", size: "0.875rem", weight: 400, lh: "1.55", tracking: "0", face: "body", sample: "Rollback is manual and undocumented." },
  { role: "label", size: "0.7rem", weight: 600, lh: "1.2", tracking: "0.14em", face: "mono", sample: "AVAILABLE · OSLO & REMOTE" },
  { role: "data", size: "0.875rem", weight: 500, lh: "1.5", tracking: "0", face: "mono", sample: "99.982%  p95 142 ms  6 nodes" },
];

export const fonts = [
  {
    role: "Display",
    family: "Fraunces",
    license: "SIL Open Font License 1.1",
    source: "github.com/undercasetype/Fraunces",
    why: "Variable, with optical-size and soft/wonk axes. Carries personality without tipping into Playfair territory, and the site already ships it, so nothing is thrown away.",
    weights: "400, 500, 600",
  },
  {
    role: "Body & UI",
    family: "IBM Plex Sans",
    license: "SIL Open Font License 1.1",
    source: "github.com/IBM/plex",
    why: "Engineered rather than neutral, with genuine technical heritage. Replaces Inter, which reads as the default choice and is one of the clearest AI tells in current interface design.",
    weights: "400, 500, 600",
  },
  {
    role: "Data & code",
    family: "IBM Plex Mono",
    license: "SIL Open Font License 1.1",
    source: "github.com/IBM/plex",
    why: "Same superfamily as the body face, so the two share skeletons. Used for every figure that has to line up, with tabular numerals on.",
    weights: "400, 500",
  },
];

/**
 * Licensing. Verified against the upstream repositories rather than assumed —
 * every face here is OFL-1.1, which permits commercial use, embedding and
 * modification at no cost, with two obligations: ship the licence text, and
 * rename any fork. OFL fonts may not be sold on their own, which never applies
 * to a company using them for its own identity.
 */
export const licensing = {
  cleared: [
    { item: "Fraunces", license: "SIL OFL 1.1", commercial: "Yes", note: "Verified at github.com/undercasetype/Fraunces" },
    { item: "IBM Plex Sans", license: "SIL OFL 1.1", commercial: "Yes", note: "Verified at github.com/IBM/plex" },
    { item: "IBM Plex Mono", license: "SIL OFL 1.1", commercial: "Yes", note: "Same repository and licence as Plex Sans" },
    { item: "JetBrains Mono", license: "SIL OFL 1.1", commercial: "Yes", note: "Currently on the site; interchangeable with Plex Mono" },
    { item: "Lucide icons", license: "ISC", commercial: "Yes", note: "lucide-react, already a dependency" },
    { item: "Colour values", license: "Not copyrightable", commercial: "Yes", note: "A hex value cannot be owned. Only a logo or name can." },
  ],
  obligations: [
    "Keep the OFL licence text with any distributed font files. Self-hosting through next/font satisfies this as long as the licence ships in the repository.",
    "If a face is ever modified, the derivative must be renamed. Using the fonts as-is avoids this entirely.",
    "OFL forbids selling the fonts by themselves. Using them in a product, a website or client deliverables is not selling them.",
  ],
  open: [
    "The wordmark and mark have not been trademark-searched. Before the company name is registered, run a Brønnøysund and EUIPO search on the name and a figurative search on the mark.",
    "next/font self-hosts the faces at build time, so no request reaches Google at runtime. That keeps the site clear of the German Google-Fonts-and-GDPR line of cases.",
  ],
};

export const spacing = [
  { token: "1", px: 4 }, { token: "2", px: 8 }, { token: "3", px: 12 },
  { token: "4", px: 16 }, { token: "6", px: 24 }, { token: "8", px: 32 },
  { token: "12", px: 48 }, { token: "16", px: 64 }, { token: "24", px: 96 },
];

export const radii = [
  { token: "none", px: 0, use: "cards, panels, buttons — the default" },
  { token: "sm", px: 2, use: "inputs, chips" },
  { token: "md", px: 4, use: "images, media" },
  { token: "full", px: 999, use: "status dots only, never buttons" },
];

export const motion = [
  { token: "press", ms: 80, ease: "cubic-bezier(0.4, 0, 1, 1)", use: "pressed feedback" },
  { token: "hover", ms: 150, ease: "cubic-bezier(0.22, 1, 0.36, 1)", use: "hover, focus" },
  { token: "enter", ms: 240, ease: "cubic-bezier(0.22, 1, 0.36, 1)", use: "entering elements" },
  { token: "exit", ms: 160, ease: "cubic-bezier(0.4, 0, 1, 1)", use: "exiting, ~65% of enter" },
];

export const imagery = {
  intro:
    "Covers, OG cards and diagrams share the palette so a generated image never fights the page it sits on. The rule is that images use the field and ink colours only — the accent appears once, if at all.",
  grounds: ["#142e18", "#0f1410", "#1e3322"],
  marks: ["#51a45e", "#a1ada3", "#e9ebe9"],
  rules: [
    "Ground the image on field or anchor. Never a white or light-grey canvas — those read as stock.",
    "One accent element maximum. If the composition needs a second colour, use snow-2 rather than a second hue.",
    "No gradient between two brand colours. The palette has no contrast to spare inside its own hue family, and a sage-to-green ramp reads as a template.",
    "Geometry over illustration: rules, grids of squares, concentric rings, isometric blocks. No 3D-rendered blobs, no people, no stock photography.",
    "Text on an image sits on a solid block of anchor, never directly on the artwork, so contrast is guaranteed rather than hoped for.",
    "Export at 2400×1260 for OG and 1600×900 for in-post covers. Keep type above 40px at export size so it survives feed downscaling.",
  ],
  prompt:
    "flat vector composition, deep eucalyptus green ground #142e18, single sage accent #51a45e, geometric forms only (concentric rings, thin rules, isometric blocks), generous negative space, no text, no people, no gradients, no photorealism, high contrast, editorial technical illustration",
};

export const a11y = [
  {
    rule: "Contrast",
    detail:
      "Body text at 7:1 or better, secondary at 4.5:1, non-text UI and large type at 3:1. Every token in this document states the ratio it was solved for.",
  },
  {
    rule: "Focus",
    detail:
      "A 2px ring in the brand colour with a 2px offset, on every interactive element. Never removed, and never replaced by a colour change alone.",
  },
  {
    rule: "Never colour alone",
    detail:
      "Status carries an icon and a text label as well as a hue. Charts carry a legend and direct labels. Removing all colour must not remove any meaning.",
  },
  {
    rule: "Targets",
    detail:
      "Interactive elements are at least 44×44px with 8px between them, with hit areas extended beyond the visual bounds where the mark is smaller.",
  },
  {
    rule: "Motion",
    detail:
      "Transforms and opacity only. Everything respects prefers-reduced-motion, and no animation blocks input.",
  },
  {
    rule: "Disabled",
    detail:
      "Reduced emphasis plus a real disabled attribute and a changed cursor. Never something that looks interactive and does nothing.",
  },
];
