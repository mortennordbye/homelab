import fs from "node:fs";
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import starlightLinksValidator from "starlight-links-validator";

// Counts the pages sync-docs wrote (it runs before Astro), not ../docs, which holds ignored files.
const CONTENT = new URL("./src/content/docs/", import.meta.url);
const pageCount = (dir) =>
  fs.existsSync(new URL(dir, CONTENT)) ? fs.readdirSync(new URL(dir, CONTENT), { recursive: true }).filter((f) => f.endsWith(".md")).length : 0;

// One page: a link. More pages: a collapsed group that lists every page in the folder, so a
// new page shows up without a config change. Its README comes first (sync-docs sets order 0).
// A folder that is gone (a shipped project) drops out of the sidebar.
const area = (dir, label) => {
  const n = pageCount(dir);
  if (n === 0) return null;
  return n > 1 ? { label, collapsed: true, items: [{ autogenerate: { directory: dir } }] } : { slug: dir };
};

// Structure A, by layer. The files in docs/ do not move; only this grouping does.
const sidebar = [
  {
    label: "Overview",
    items: [{ autogenerate: { directory: "architecture" } }, area("assets", "Assets")],
  },
  {
    label: "Foundation",
    items: [area("platform/cluster", "Cluster"), area("platform/storage", "Storage"), area("platform/network", "Network")],
  },
  {
    label: "Platform",
    items: [
      area("platform/delivery", "Delivery"),
      area("platform/data", "Data"),
      area("platform/identity", "Identity"),
      area("platform/secrets", "Secrets"),
      area("platform/policy", "Policy"),
    ],
  },
  {
    label: "Operations",
    items: [area("platform/observability", "Observability"), area("platform/backups", "Backups")],
  },
  {
    label: "Apps",
    items: [
      area("apps/blog", "Blog"),
      area("apps/headroom", "Headroom"),
      area("apps/innestemme", "Innestemme"),
      area("apps/linkgraph", "Linkgraph"),
      area("apps/logeverylift", "logeverylift"),
      area("apps/portfolio", "Portfolio"),
      area("apps/reelsmith", "Reelsmith"),
      area("apps/verksted", "Verksted"),
    ],
  },
  {
    label: "Self-hosted",
    items: [area("apps/media-stack", "Media stack"), area("apps/isponsorblocktv", "Isponsorblocktv")],
  },
  {
    label: "Research",
    items: [area("platform/post-quantum", "Post quantum"), { autogenerate: { directory: "projects" } }],
  },
]
  .map((group) => ({ ...group, items: group.items.filter(Boolean) }))
  .filter((group) => group.items.length > 0);

export default defineConfig({
  site: "https://docs.nordbye.it",
  integrations: [
    starlight({
      title: "Eden docs",
      description: "How the Genesis homelab is built and run",
      head: [
        { tag: "meta", attrs: { property: "og:image", content: "https://docs.nordbye.it/assets/social-preview/social-preview.png" } },
        { tag: "meta", attrs: { name: "twitter:card", content: "summary_large_image" } },
      ],
      social: [{ icon: "github", label: "GitHub", href: "https://github.com/mortennordbye/homelab" }],
      sidebar,
      customCss: [
        "@fontsource-variable/source-serif-4/opsz.css",
        "@fontsource-variable/source-serif-4/opsz-italic.css",
        "@fontsource/fragment-mono/400.css",
        "./src/styles/eden.css",
      ],
      components: {
        Header: "./src/components/Header.astro",
        Sidebar: "./src/components/Sidebar.astro",
        PageTitle: "./src/components/PageTitle.astro",
        PageSidebar: "./src/components/PageSidebar.astro",
        Footer: "./src/components/Footer.astro",
        ThemeProvider: "./src/components/ThemeProvider.astro",
        ThemeSelect: "./src/components/ThemeSelect.astro",
      },
      expressiveCode: {
        themes: ["github-dark-default"],
        styleOverrides: {
          codeBackground: "#090c0a",
          borderColor: "#2a382c",
          borderRadius: "10px",
          codeFontFamily: '"Fragment Mono", ui-monospace, monospace',
          uiFontFamily: '"Fragment Mono", ui-monospace, monospace',
          codeFontSize: "0.84rem",
          frames: {
            editorTabBarBackground: "#090c0a",
            editorActiveTabBackground: "#191f1a",
            terminalTitlebarBackground: "#090c0a",
            terminalBackground: "#090c0a",
            frameBoxShadowCssValue: "none",
          },
        },
      },
      plugins: [starlightLinksValidator()],
    }),
  ],
});
