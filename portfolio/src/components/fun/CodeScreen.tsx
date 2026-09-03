"use client";

import { Html } from "@react-three/drei";
import { site } from "@/content/site";
import type { SourceExcerpt } from "@/lib/source-excerpt";
import { ACCENT, type PanelProps } from "./Panels";
import { relative, useRepos, type Repo } from "./feed";
import { Housing, PANEL_PX_H, PANEL_PX_W, distanceFactor } from "./Screen";

/**
 * The landscape monitor, showing real source from this repo. Highlighting is a
 * hand-rolled tokeniser: Shiki/Prism would be a large dependency for thirty
 * lines that only have to look like code, and four token classes cover it.
 */

const COLOUR = {
  comment: "#627365",
  string: "#a8d99a",
  key: "#8db4f0",
  number: "#e0b072",
  plain: "#c8d8cb",
  punct: "#5a695d",
} as const;

/**
 * YAML highlighting, hand-rolled.
 *
 * Shiki or Prism would be a large dependency to colour thirty lines at a size
 * where nobody is reading the semantics — the job is for it to look like a
 * manifest at a glance and be readable when you lean in. Four classes cover
 * that: comments, keys, scalars and numbers.
 *
 * Written for YAML rather than TypeScript because the screen shows a Deployment
 * now. Colouring `apiVersion` as a keyword the way a TS tokeniser would gets it
 * exactly backwards — in YAML the interesting token is the key, and the key is
 * whatever sits left of the first colon.
 */
const KEY_LINE = /^(\s*-?\s*)([A-Za-z0-9_.\/-]+)(:)(.*)$/;

function scalarTone(v: string): string {
  const t = v.trim();
  if (!t) return COLOUR.plain;
  if (/^-?\d+(\.\d+)?[a-zA-Z%]*$/.test(t)) return COLOUR.number;
  return COLOUR.string;
}

function Line({ text }: { text: string }) {
  const trimmed = text.trimStart();

  if (trimmed.startsWith("#")) {
    return <span style={{ color: COLOUR.comment }}>{text}</span>;
  }

  const m = text.match(KEY_LINE);
  if (!m) return <span style={{ color: COLOUR.plain }}>{text}</span>;

  const [, indent, key, colon, rest] = m;
  // A trailing comment on a value line still reads as a comment.
  const hash = rest.indexOf(" #");
  const value = hash === -1 ? rest : rest.slice(0, hash);
  const comment = hash === -1 ? "" : rest.slice(hash);

  return (
    <>
      <span style={{ color: COLOUR.punct }}>{indent}</span>
      <span style={{ color: COLOUR.key }}>{key}</span>
      <span style={{ color: COLOUR.punct }}>{colon}</span>
      <span style={{ color: scalarTone(value) }}>{value}</span>
      {comment && <span style={{ color: COLOUR.comment }}>{comment}</span>}
    </>
  );
}

/**
 * The ArgoCD applications view.
 *
 * Not a screenshot and not an iframe — the real ArgoCD sits behind Authentik on
 * a private hostname, so embedding it would either mean exposing it or shipping
 * a picture of it that goes stale. This renders ArgoCD's own vocabulary (Synced
 * / OutOfSync, Healthy / Degraded, per-application rows) from the same feed the
 * television reads, so what it shows is true even though the chrome is ours.
 *
 * The per-application list can be absent — a stale or failed publish leaves
 * only the root application's rollup. Keep the fallback: an empty list drawn
 * without comment reads as "no apps", which is a different claim entirely.
 */
function ArgoView({ data }: { data: PanelProps }) {
  const apps = data.status?.gitops?.applications?.list ?? [];
  const rootSynced = data.argocd.sync === "Synced";
  const rootHealthy = data.argocd.health === "Healthy";

  const tone = (ok: boolean) => (ok ? ACCENT.green : ACCENT.amber);

  return (
    <div className="flex h-full w-full flex-col" style={{ fontSize: "11px" }}>
      {/* ArgoCD's top bar is its most recognisable feature */}
      <div
        className="flex items-center justify-between"
        style={{
          background: "#202e23",
          padding: "6px 10px",
          borderBottom: `1px solid ${ACCENT.brand}33`,
        }}
      >
        <span style={{ color: "#eaf3eb", letterSpacing: "0.1em" }}>
          APPLICATIONS
        </span>
        <span style={{ color: "#6e8371", fontSize: "9px" }}>
          argocd · genesis
        </span>
      </div>

      {/* rollup strip */}
      <div
        className="flex items-center"
        style={{ gap: "16px", padding: "7px 10px", borderBottom: "1px solid #1b261d" }}
      >
        <span style={{ color: tone(rootSynced) }}>&#8635; {data.argocd.sync}</span>
        <span style={{ color: tone(rootHealthy) }}>&#9829; {data.argocd.health}</span>
        <span style={{ color: "#6e8371" }}>
          synced {relative(data.argocd.syncedAt) ?? "unknown"}
        </span>
      </div>

      <div style={{ flex: 1, overflow: "hidden" }}>
        {apps.length === 0 ? (
          <p style={{ padding: "14px 10px", color: "#536656", lineHeight: 1.5 }}>
            The publisher reports the root application only.
            <br />
            Per-application rows appear when it emits them.
          </p>
        ) : (
          apps.slice(0, 12).map((a) => {
            const s = a.sync === "Synced";
            const hh = a.health === "Healthy";
            return (
              <div
                key={a.name}
                className="flex items-center"
                style={{
                  gap: "10px",
                  padding: "3.5px 10px",
                  borderLeft: `3px solid ${s && hh ? ACCENT.green : ACCENT.amber}`,
                  borderBottom: "1px solid #141e16",
                }}
              >
                <span style={{ flex: 1, color: "#cfe1d2" }}>{a.name}</span>
                <span style={{ width: "78px", color: tone(s) }}>
                  &#8635; {a.sync}
                </span>
                <span style={{ width: "74px", color: tone(hh) }}>
                  &#9829; {a.health}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/**
 * The pinned repositories.
 *
 * They were a cork board on the living room wall with four cards pinned to it.
 * A browser on the desk is where a repository is actually looked at, and it
 * costs the room one wall object and no content: the board's four cards are
 * these four rows, with the description and the counts intact.
 *
 * Chrome is ours rather than GitHub's. Rendering someone else's interface at
 * this fidelity claims a screenshot; the row of name, language and stars is
 * GitHub's vocabulary without pretending to be its page.
 */
function ReposView({ repos }: { repos: Repo[] }) {
  if (!repos.length) {
    return (
      <div
        className="flex h-full w-full items-center justify-center"
        style={{ color: "#516154", fontSize: "11px" }}
      >
        repositories unavailable
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col" style={{ fontSize: "11px" }}>
      {repos.map((r) => (
        <div
          key={r.url}
          style={{ padding: "8px 12px", borderBottom: "1px solid #141d15" }}
        >
          <div className="flex items-baseline" style={{ gap: "10px" }}>
            <span style={{ color: "#8fb6d8" }}>{r.name}</span>
            {r.language && (
              <span style={{ color: "#627365", fontSize: "9px" }}>{r.language}</span>
            )}
            <span style={{ flex: 1 }} />
            <span style={{ color: ACCENT.amber, fontSize: "10px" }}>
              &#9733; {r.stars}
            </span>
            <span style={{ color: "#627365", fontSize: "10px" }}>
              &#9282; {r.forks}
            </span>
          </div>
          {r.description && (
            <div
              style={{
                color: "#7f8f82",
                fontSize: "10px",
                lineHeight: 1.35,
                marginTop: "4px",
              }}
            >
              {r.description}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** The three things the desk monitor can show. */
export type Tab = "code" | "argocd" | "repos";

export function CodeScreen({
  source,
  data,
  tab,
  position,
  rotation,
  width,
  powered,
}: {
  source: SourceExcerpt;
  data: PanelProps;
  /**
   * Which view is up, owned by Scene. Do not move this to local `useState` in
   * a component mounted under the screens — something upstream discards that
   * state; every other piece of room state lives in Scene or FunRoom too.
   */
  tab: Tab;
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  powered: boolean;
}) {
  const h = width * (PANEL_PX_H / PANEL_PX_W);
  const shown = source.lines.length;
  const repos = useRepos();

  return (
    <group position={position} rotation={rotation}>
      <Housing w={width} h={h} powered={powered} />
      <Html
        transform
        occlude="blending"
        distanceFactor={distanceFactor(width, PANEL_PX_W)}
        position={[0, 0, 0.008]}
        zIndexRange={[10, 0]}
        style={{
          width: `${PANEL_PX_W}px`,
          height: `${PANEL_PX_H}px`,
          opacity: powered ? 1 : 0,
          transition: "opacity 520ms ease-out",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        <div
          className="relative flex h-full w-full flex-col overflow-hidden font-mono"
          style={{
            background:
              "linear-gradient(160deg, #0e160f 0%, #0b110c 55%, #080e09 100%)",
            border: "1px solid #65a16e3d",
            color: COLOUR.plain,
            fontSize: "10px",
            lineHeight: "11.6px",
          }}
        >
          {/* Real tabs, both always visible, so the second view is discoverable
              without having to press E to find out it exists. */}
          <div
            className="flex items-stretch"
            style={{ borderBottom: "1px solid #1b261d", fontSize: "9px" }}
          >
            {(
              [
                ["code", "deployment.yaml"],
                ["argocd", "ArgoCD"],
                ["repos", "github"],
              ] as [Tab, string][]
            ).map(([id, label]) => (
              <span
                key={id}
                style={{
                  padding: "6px 12px",
                  color: tab === id ? "#8fb6d8" : "#516154",
                  background: tab === id ? "#121b13" : "transparent",
                  borderRight: "1px solid #1b261d",
                  borderTop: `2px solid ${tab === id ? "#65a16e" : "transparent"}`,
                }}
              >
                {label}
              </span>
            ))}
            <span
              style={{
                flex: 1,
                textAlign: "right",
                padding: "6px 10px",
                color: "#516154",
              }}
            >
              {tab === "code"
                ? shown
                  ? `${shown} of ${source.total} lines`
                  : "source unavailable"
                : tab === "repos"
                  ? `github.com/${site.github}`
                  : "live from the cluster"}
            </span>
          </div>

          {tab === "argocd" ? (
            <ArgoView data={data} />
          ) : tab === "repos" ? (
            <ReposView repos={repos} />
          ) : (
          <div style={{ padding: "6px 10px", whiteSpace: "pre", overflow: "hidden" }}>
            {source.lines.map((l, i) => (
              <div key={i} style={{ display: "flex" }}>
                <span
                  style={{
                    width: "20px",
                    flex: "0 0 20px",
                    color: "#39473b",
                    textAlign: "right",
                    marginRight: "9px",
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ flex: 1 }}>
                  <Line text={l} />
                </span>
              </div>
            ))}
          </div>
          )}

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
