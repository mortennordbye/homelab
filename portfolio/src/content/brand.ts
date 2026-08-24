/**
 * Brand system tokens — "Eucalyptus Deepened".
 *
 * Two hues doing two jobs. 130 is the brand and it is ink: links, focus, live
 * state, the one action that matters on a screen. 32 is the material and it is
 * surface: buttons, chips, panels, edges. Nothing is ever both, which is what
 * lets them share a page — solved against the same ground for the same target,
 * a green and a copper land 1.01:1 apart and read as one colour to anyone with
 * a colour-vision deficiency. Separating them by layer avoids that entirely.
 *
 * The brand's saturation is 24, down from 34. As a solid fill beside the wood
 * the old value glared. Every green below holds its exact luminance and only
 * loses saturation, so nothing that was solved has to be re-solved.
 *
 * Every value was solved against its own ground for a target WCAG ratio rather
 * than picked by hand, so the contrast figures below are measured, not
 * aspirational. The categorical data colours were validated for colour-vision
 * deficiency separately, and are deliberately left at their original
 * saturation — re-muting them would invalidate that check.
 *
 * styles/tokens.css ships the dark half of this system verbatim. The light half
 * has no runtime consumer on the site (dark only) and lives on here: the print
 * stylesheet in globals.css and the LaTeX CV in scripts/lib/templates.ts both
 * take their paper and ink values from this file.
 */

/**
 * The theme. Everything else in this file serves it.
 *
 * The colour system above answers "which green"; this answers "why is there a
 * room at all". It is the half that has to be agreed before a token is worth
 * solving, and until recently it lived only in `branding/ART-DIRECTION.md`,
 * which meant the spec page documented the paint and never the building.
 *
 * The register is a merge and both halves are load-bearing: English discipline,
 * Norwegian material and light. Drop either half and it goes wrong in a
 * specific, predictable direction. See `register.intro`.
 */
export const theme = {
  name: "The Study",
  gloss: "English discipline, Norwegian light",
  rule: "One lamp.",
  line: "The site is not a portfolio. It is a study, and the visitor is being received in it.",
  intro:
    "A portfolio argues for someone. A room does not argue, it simply is, and the person in it does not have to explain why they should be taken seriously because the room settled that before anyone spoke. Every rule in this document exists to protect that difference.",

  /**
   * The most load-bearing paragraph in the file. The register is a merge, and
   * each half fails differently on its own: all English and it becomes a
   * gentlemen's club, all Norwegian and it becomes a cabin. Neither is this.
   */
  register: {
    intro: [
      "A study, with English discipline and Norwegian material. From the English half: order, joinery, fitted bookcases, a proper desk, everything planed and finished and squared. From the Norwegian half: dark oak rather than mahogany, the forest outside the window, and one warm lamp against an afternoon that went dark at three. The wealth is not in what was bought, it is in what was kept, which is what makes generational the right word and luxury the wrong one.",
      "Both halves are needed. Drop the English half and it slides into a cabin: rough-sawn wood, folk pattern, rusticity as a personality. Drop the Norwegian half and it becomes a gentlemen's club: leather buttoning, portraits, mahogany, a crest. The target is the study in a good Oslo house, which is neither.",
    ],
    is: [
      "Calm first. The feeling to aim at is warmth and quiet, not impact. Someone should arrive and breathe out. The expensive quality is a consequence of the calm, never the thing being chased.",
      "Value carried by material and by what was kept. Dark oak that was good when it was cut and is better now, cabinetmaker work rather than carpentry, warm metal on a lamp and a hinge, paper, wool.",
      "One lamp doing all the work, with most of the room in shadow, because there is no reason to light what nobody is looking at. Outside the window it is cold and blue.",
      "The most expensive thing on any screen is the empty part of it.",
    ],
    isNot: [
      "Gold, marble, high-contrast serif capitals, or luxury treated as a visual style. That is money that needs to be noticed, which is the opposite register.",
      "A cabin. No log walls, no rough-sawn edges, no knots left on show, no folk pattern, no plaid, no antlers. The wood is planed, finished and fitted; the forest is the view and the palette, never the construction.",
      "A gentlemen's club. No leather buttoning, no portrait wall, no crest, no mahogany. This is a working study, not an institution someone belongs to.",
      "Dark mode with grey cards on it. A border is not a material and a card is not an object.",
      "Anything that glows. Forests do not glow, and nothing on the page emits light except a screen or a lamp.",
      "Symmetry. The lamp has a direction, so the composition has one too.",
    ],
  },

  /**
   * The four materials, at the values the hero scene actually uses. Lifted from
   * InlineGlobeScene.tsx rather than chosen here, so the spec and the render
   * cannot drift.
   */
  materials: [
    { name: "ground", hex: "#241a12", use: "the room. A dark panelled wall in shadow, warm, never flat black and never neutral grey." },
    { name: "oak", hex: "#4c3722", use: "the desk and the floor. Dark oak, planed and finished. The plane every object stands on." },
    { name: "brass", hex: "#b98f4e", use: "the warm metal on a lamp, a hinge, a rule, an engraved label. Metalness 1." },
    { name: "paper", hex: "#e8e3d6", use: "content meant to be read as printed matter. The only light field, always with an edge." },
  ],

  light: [
    { name: "key", hex: "#ffd49a", use: "the one lamp, upper left, intensity 3. Casts every shadow in the frame." },
    { name: "bounce", hex: "#6f9c72", use: "the forest through the window, dim and cool from the right at 0.5, so the shadow side is not dead." },
    { name: "rake", hex: "#ffca8a", use: "a spot across the tabletop, so the wood reads without lifting the wall." },
    { name: "the lit point", hex: "#7fc48c", use: "green is the forest, not an accent. It appears once per view as a pin or a screen, never as a surface, a border or a glow." },
  ],

  /** How the page behaves, which is the part no palette can express. */
  page: [
    {
      rule: "Arrival is the loading strategy",
      detail:
        "The first frame is a dark threshold with one lit rectangle beyond it, which is the cheapest frame in the whole sequence. It renders immediately while the rest of the room streams in behind it. Not a loading screen dressed as narrative: narrative that happens to also be the preload.",
    },
    {
      rule: "Scrolling is walking",
      detail:
        "One continuous camera move through one room, tied to scroll position and fully reversible. Arrive at the door, cross to the desk, turn to the shelf, look along the wall, read the drawing, end back at the door. It never cuts.",
    },
    {
      rule: "The room gets later",
      detail:
        "Over the length of the page the key rakes a few degrees, so shadows lengthen and the afternoon draws on. The page modifying itself, done with physics rather than effects.",
    },
    {
      rule: "Every section is an object",
      detail:
        "The CV is a bound document, the case studies are prints, contact is an engraved plate. Not a block of page dressed to look like one: each has to work as the thing it depicts before it is allowed to look like it.",
    },
    {
      rule: "One room, two modes",
      detail:
        "The portfolio is the guided version, on rails. /fun is the same geometry with the rails off. The room is built for the portfolio first, because that is where it has to look expensive, and /fun inherits it.",
    },
    {
      rule: "Two faces, no sans",
      detail:
        "Source Serif 4 carries headlines and body alike, using its optical-size axis so one family works honestly from 64px to 13px. Fragment Mono is the engraving: labels, measurements, coordinates. There is no sans anywhere, because serif headline over grotesque body over mono label is the signature of a generated portfolio whatever families are substituted into it.",
    },
    {
      rule: "The way out is at the door",
      detail:
        "The skip into the plain reading view sits at the threshold, where a visitor decides whether to walk in. It is served automatically to reduced-motion, print, crawlers and anything without WebGL. Not a degraded fallback, and it may not look like one.",
    },
  ],

  never: [
    "Reticles, crosshairs, scanlines, scan sweeps, status pills, ENTER buttons, live-feed chrome.",
    "Card borders and glowing hover states.",
    "Glassmorphism, neon, gradients between two brand colours.",
    "Scroll hijack, stagger animations, letter-by-letter reveals, counting numbers.",
    "Stock photography, people, emoji, a second canvas.",
  ],

  tension:
    "The room is calm and a portfolio has to be seen. Taken all the way, the metaphor puts an object between a hiring manager and the fact they came for. That is what the plain view is for, and it is why the plain view has to be good enough to be judged on with the room never loading at all.",
};

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
export const materialHue = 32;

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
      "One hue, saturation held at 24. Higher and eucalyptus becomes grass, which is what it was doing at 34 once it sat as a solid fill next to the wood. No single value clears AA text contrast on both white and near-black — that is arithmetic, not a hue problem — so there are two steps rather than one.",
    ground: "dark",
    swatches: [
      { name: "brand", hex: "#65a16e", cr: "6.10:1 on anchor", use: "accent on dark" },
      { name: "brand-hover", hex: "#7cae83", cr: "7.31:1", use: "hover, dark" },
      { name: "brand-active", hex: "#568d5e", cr: "4.76:1", use: "pressed, dark" },
      { name: "brand-subtle-d", hex: "#1f3322", use: "tinted block, dark" },
    ],
  },
  {
    title: "Material",
    intro:
      "One material at three depths, not three colours. Brass is the only step that works as a standalone solid: 3.02:1 clears the non-text threshold, so a button's shape is perceivable without a border, and it still carries snow at 5.15:1. Two rules follow from the arithmetic. Brass takes snow only — snow-2 on it measures 2.65:1. And snow-3 never sits on wood, where it measures 2.85:1.",
    ground: "dark",
    swatches: [
      { name: "wood", hex: "#4a3520", cr: "1.61:1 on anchor", use: "panels, wells, table headers" },
      { name: "brass", hex: "#7f5a2f", cr: "3.02:1", use: "solid fills, card edges, rules" },
      { name: "brass-hi", hex: "#8a6133", cr: "3.40:1", use: "hover — the lightest brass that still carries snow at AA" },
      { name: "copper", hex: "#c09955", cr: "7.03:1", use: "the ink end of the ramp, used sparingly" },
    ],
  },
  {
    title: "Brand · on light",
    ground: "light",
    swatches: [
      { name: "brand-ink", hex: "#4d7d54", cr: "4.61:1 on paper", use: "links, text" },
      { name: "brand-solid", hex: "#4c7d54", cr: "4.81:1 vs white", use: "filled button" },
      { name: "brand-subtle", hex: "#ecf3ed", use: "tinted block, light" },
    ],
  },
];

export const semantic = [
  {
    name: "success",
    light: "#4d7d54",
    dark: "#65a16e",
    bgLight: "#ecf3ed",
    bgDark: "#1f3322",
    crLight: "4.61:1",
    crDark: "6.10:1",
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
    note: "Amber at hue 38, far enough from the brand to never be mistaken for it. It does share a hex with copper, the ink end of the material ramp, so a Result mark and a Watch mark are currently one colour told apart only by their label. Known, tracked, not yet fixed.",
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
  { name: "series 1", label: "eucalyptus", light: "#4a7952", dark: "#5f9c68" },
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

/**
 * Two faces, and no sans anywhere.
 *
 * Serif headline over grotesque body over mono label is the signature of a
 * generated portfolio, whatever families get substituted into it. Setting body
 * copy in the display serif breaks that pattern harder than any font swap
 * does, and Source Serif's optical-size axis is what makes it honest: the
 * headline gets a lighter cut at 60 and paragraphs get a sturdier one at 12,
 * which is how metal type actually worked.
 *
 * Both faces were checked against Google Fonts popularity rank, out of 1,942
 * families, as a proxy for how worn a choice is. The faces this replaces sat at
 * 5 (Inter), 59 (JetBrains Mono) and 93 (Fraunces), all inside the top five per
 * cent and all staples of generated design.
 */
export const fonts = [
  {
    role: "Display & body",
    family: "Source Serif 4",
    license: "SIL Open Font License 1.1",
    source: "github.com/adobe-fonts/source-serif",
    why: "Frank Grießhammer for Adobe, drawn after Fournier. A working book face with a genuine optical-size axis, so one family carries headlines at 64px and case studies at 13px without either being a scaled version of the other. It satisfies both halves of the register at once: classical proportion for the English half, no ornament anywhere for the Norwegian one. It is also the least fashionable face available, which is the point — nothing about it will date.",
    weights: "400, 600 · opsz 8–60",
    rank: "133 of 1,942",
  },
  {
    role: "Labels & data",
    family: "Fragment Mono",
    license: "SIL Open Font License 1.1",
    source: "github.com/weiweihuanghuang/fragment-mono",
    why: "Wei Huang, after Nimbus Sans. The engraving on the brass: measurements, coordinates, part numbers, the leader labels, and anything that has to line up. Quiet enough to recede behind the serif, which is the whole job — it names things and never speaks.",
    weights: "400, italic",
    rank: "642 of 1,942",
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
    { item: "Source Serif 4", license: "SIL OFL 1.1", commercial: "Yes", note: "Verified at github.com/adobe-fonts/source-serif. Adobe, Frank Grießhammer." },
    { item: "Fragment Mono", license: "SIL OFL 1.1", commercial: "Yes", note: "Verified at github.com/weiweihuanghuang/fragment-mono, which ships OFL.txt. Wei Huang, after URW's Nimbus Sans." },
    { item: "Lucide icons", license: "ISC", commercial: "Yes", note: "lucide-react, already a dependency" },
    { item: "Colour values", license: "Not copyrightable", commercial: "Yes", note: "A hex value cannot be owned. Only a logo or name can." },
  ],
  obligations: [
    "Keep the OFL licence text with any distributed font files. Self-hosting through next/font satisfies this as long as the licence ships in the repository.",
    "If a face is ever modified, the derivative must be renamed. Using the fonts as-is avoids this entirely.",
    "OFL forbids selling the fonts by themselves. Using them in a product, a website or client deliverables is not selling them.",
  ],
  open: [
    "The site still ships Inter, JetBrains Mono and Fraunces from layout.tsx. The two faces above are the decision, not yet the deployment. Until the swap lands, this table describes the intent and not the bytes.",
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

/**
 * Two surfaces, two opposite rules, and the split is deliberate.
 *
 * On the site an image is a rendered object standing in a lit room, because the
 * site is a room and anything flat pasted into it reads as a UI panel. Off the
 * site it is flat and geometric, because a feed re-compresses what it is given
 * and a render turns to mud where a flat card survives.
 *
 * Applying either rule to the other surface is what makes a brand look
 * borrowed. See `branding/ART-DIRECTION.md` for the on-site half in full.
 */
export const imagery = {
  intro:
    "An image obeys one of two rules depending on where it will be looked at. On the site it is a rendered object under the room's one lamp. Off the site — covers, OG cards, anything a feed will re-compress — it is flat and geometric. The palette is shared; the treatment is not.",

  onsite: {
    intro:
      "Anything rendered into the site itself: hero objects, section objects, the room. One warm key at the upper left, four materials, and nothing that emits light except screens and lamps.",
    rules: [
      "Four materials and no others: warm near-black ground, oak, polished brass, warm off-white paper. A fifth material means the composition has gone wrong.",
      "One lamp, upper left. Highlights sit on the top-left edge and shadows fall long to the lower right. An even glow on all four sides is lit from nowhere and reads as a UI panel.",
      "Brass is the only bright thing, and it is bright because it reflects the lamp. Nothing on the page emits its own light except a screen or a lamp.",
      "Green is a lit point, never a surface: a pin, a status dot, a screen. Once per view at most, and never a fill, a border or a glow.",
      "Every object stands on something, at a plausible size, with a contact shadow that touches its base. Depth is shadow and material change, never a 1px border.",
      "Nothing is centred. The lamp has a direction, so the composition has one too.",
    ],
  },

  offsite: {
    intro:
      "Anything that leaves the site and gets re-compressed on the way: blog covers, OG cards, LinkedIn and Reddit images, diagrams in posts. Flat, geometric, and built to survive a downscale.",
    grounds: ["#142e18", "#0f1410", "#1f3322"],
    marks: ["#65a16e", "#a1ada3", "#e9ebe9"],
    rules: [
      "Ground the image on field or anchor. Never a white or light-grey canvas — those read as stock.",
      "One accent element maximum. If the composition needs a second colour, use snow-2 rather than a second hue.",
      "No gradient between two brand colours. The palette has no contrast to spare inside its own hue family, and a sage-to-green ramp reads as a template.",
      "Geometry over illustration: rules, grids of squares, concentric rings, isometric blocks. No 3D-rendered blobs, no people, no stock photography.",
      "No photorealism and no renders out here, however good they look on the site. A lit object loses its modelling to feed compression and arrives as a brown smear.",
      "Text on an image sits on a solid block of anchor, never directly on the artwork, so contrast is guaranteed rather than hoped for.",
      "Export at 2400×1260 for OG and 1600×900 for in-post covers. Keep type above 40px at export size so it survives feed downscaling.",
    ],
    prompt:
      "flat vector composition, deep eucalyptus green ground #142e18, single sage accent #65a16e, geometric forms only (concentric rings, thin rules, isometric blocks), generous negative space, no text, no people, no gradients, no photorealism, high contrast, editorial technical illustration",
  },
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
