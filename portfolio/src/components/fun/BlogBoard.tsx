"use client";

import { Html, RoundedBox } from "@react-three/drei";
import { useEffect, useState } from "react";
import type { InfoCard } from "./Hud";
import { Interactive } from "./interaction";

/**
 * A whiteboard on the left wall with the blog pinned to it.
 *
 * Everything on it comes from `/api/v1/blog`, which reads the Hugo RSS feed —
 * including the cover images, which Hugo publishes as `<media:content>`. There
 * is nothing to update here when a post goes out; write the post and it appears
 * on the board, same as the shelf lays itself out from the case studies.
 *
 * The wall it hangs on was empty. Two screens used to face the bookshelf from
 * here and a printer cabinet stood under them; both went, and what was left was
 * three metres of blank plaster in the one part of the room a visitor walks
 * through on the way to the shelf.
 */

/** Authored pixel size of the DOM layer, and the physical width it maps onto. */
const PX_W = 1240;
const PX_H = 780;
const BOARD_W = 1.5;
const BOARD_H = (BOARD_W * PX_H) / PX_W;
/** World metres per authored pixel. */
const S = BOARD_W / PX_W;

const PAD = 46;
const HEADER = 74;
const GAP = 26;
const COLS = 3;
const CELL_W = (PX_W - PAD * 2 - GAP * (COLS - 1)) / COLS;
const CELL_H = (PX_H - PAD * 2 - HEADER - GAP) / 2;

/** Card centre in authored pixels, for index i. */
const cellPx = (i: number) => ({
  x: PAD + (i % COLS) * (CELL_W + GAP) + CELL_W / 2,
  y: PAD + HEADER + Math.floor(i / COLS) * (CELL_H + GAP) + CELL_H / 2,
});

/**
 * Fixed per-slot tilts rather than random ones.
 *
 * The cards want to look stuck on by hand, which means not perfectly square —
 * but a random tilt would reshuffle on every render and make the board feel
 * unreliable in the way the shelf comments warn about. Same reasoning, simpler
 * mechanism: the tilt belongs to the slot, not the post.
 */
const TILT = [-0.9, 0.7, -0.4, 0.8, -0.6, 0.5];
const MAGNET = ["#51a45e", "#c09955", "#8ec798", "#478f53", "#a1ada3", "#61b86f"];

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Formatted by hand rather than with toLocaleDateString, which would render
 *  differently depending on the visitor's locale for no benefit here. */
function shortDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export type BlogPost = {
  title: string;
  url: string;
  publishedAt: string | null;
  image: string | null;
  summary: string | null;
};

/**
 * Fetches the feed once when the room loads.
 *
 * Deliberately not shared with the desk's blog stack, which fetches on open.
 * That one is a list of titles a visitor asks for; this is six cover images on
 * a wall, and they have to be there before anyone looks at the wall.
 */
function useBlogPosts(): BlogPost[] {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/blog")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { posts?: BlogPost[] }) => {
        if (!cancelled) setPosts((j.posts ?? []).slice(0, 6));
      })
      .catch(() => {
        // A board with nothing on it is the correct failure: the room does not
        // claim posts it could not fetch.
        if (!cancelled) setPosts([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return posts;
}

function postCard(p: BlogPost): InfoCard {
  return {
    kicker: "blog",
    title: p.title,
    subtitle: shortDate(p.publishedAt),
    rows: [],
    body: p.summary ?? undefined,
    href: p.url,
    hrefLabel: "read the post",
  };
}

export function BlogBoard({
  position,
  rotation = [0, 0, 0],
  onOpen,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  onOpen: (card: InfoCard) => void;
}) {
  const posts = useBlogPosts();

  return (
    <group position={position} rotation={rotation}>
      {/* aluminium frame, standing proud of the writing surface */}
      <RoundedBox
        position={[0, 0, -0.012]}
        args={[BOARD_W + 0.05, BOARD_H + 0.05, 0.032]}
        radius={0.006}
        smoothness={4}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#b8bcc2" roughness={0.34} metalness={0.78} />
      </RoundedBox>

      {/* the writing surface. Gloss, because a whiteboard that is not slightly
          shiny reads as a sheet of paper. */}
      <mesh position={[0, 0, 0.004]} receiveShadow>
        <planeGeometry args={[BOARD_W, BOARD_H]} />
        <meshStandardMaterial color="#f4f5f6" roughness={0.16} metalness={0.02} />
      </mesh>

      {/* marker tray along the bottom rail */}
      <RoundedBox
        position={[0, -BOARD_H / 2 - 0.032, 0.026]}
        args={[BOARD_W * 0.42, 0.018, 0.05]}
        radius={0.005}
        smoothness={3}
        castShadow
      >
        <meshStandardMaterial color="#a9adb3" roughness={0.38} metalness={0.7} />
      </RoundedBox>
      {[-0.07, 0.02].map((x, i) => (
        <mesh
          key={x}
          position={[x, -BOARD_H / 2 - 0.026, 0.042]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        >
          <cylinderGeometry args={[0.008, 0.008, 0.1, 12]} />
          <meshStandardMaterial color={i ? "#2f6fb8" : "#c0392b"} roughness={0.4} />
        </mesh>
      ))}

      <Html
        transform
        occlude="blending"
        distanceFactor={(BOARD_W / PX_W) * 400}
        position={[0, 0, 0.008]}
        zIndexRange={[10, 0]}
        style={{
          width: `${PX_W}px`,
          height: `${PX_H}px`,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {/* The board's face is carried by the DOM, not by the mesh behind it.
            The mesh is unlit on this wall — neither lamp reaches it — so a
            white plane there renders near-black and the whiteboard came out
            looking like a switched-off television. Painting the surface here
            means it reads as white regardless of where the lamps are.

            Warm off-white rather than #fff: a pure white panel is the only
            cold, bright thing in a room deliberately lit at nine in the
            evening, and it looked like a hole cut in the wall. */}
        <div
          className="relative h-full w-full"
          style={{
            padding: `${PAD}px`,
            color: "#1a201b",
            background:
              "linear-gradient(155deg, #efeae0 0%, #e7e1d5 55%, #ded8cb 100%)",
            boxShadow: "inset 0 0 90px rgba(90,74,52,0.16)",
          }}
        >
          <div
            className="flex items-baseline justify-between"
            style={{ height: `${HEADER}px` }}
          >
            <span
              className="font-mono"
              style={{ fontSize: "30px", letterSpacing: "0.16em", color: "#1a201b" }}
            >
              FROM THE BLOG
            </span>
            <span
              className="font-mono"
              style={{ fontSize: "19px", color: "#5f7963" }}
            >
              blog.nordbye.it
            </span>
          </div>

          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${COLS}, ${CELL_W}px)`,
              gap: `${GAP}px`,
            }}
          >
            {posts.map((p, i) => (
              <div
                key={p.url}
                style={{
                  width: `${CELL_W}px`,
                  height: `${CELL_H}px`,
                  transform: `rotate(${TILT[i % TILT.length]}deg)`,
                  background: "#ffffff",
                  boxShadow: "0 6px 16px rgba(20,28,38,0.22)",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {/* magnet holding it on */}
                <div
                  style={{
                    position: "absolute",
                    top: "8px",
                    left: "50%",
                    marginLeft: "-9px",
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    background: MAGNET[i % MAGNET.length],
                    boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                    zIndex: 2,
                  }}
                />
                {p.image ? (
                  /* A plain img, not next/image, and the rule is disabled on
                     purpose rather than worked around. This is a DOM layer
                     inside a WebGL canvas mounted at a fixed authored size, so
                     there is no layout for the optimiser to reason about and no
                     LCP to protect. Routing it through next/image would also
                     put every blog cover through the portfolio pod's optimiser
                     — server work on the cluster for images the blog origin
                     already serves at ~65KB each. */
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image}
                    alt=""
                    style={{
                      width: "100%",
                      height: `${Math.round((CELL_W * 9) / 16)}px`,
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: `${Math.round((CELL_W * 9) / 16)}px`,
                      background: "linear-gradient(140deg,#e7eee8,#d1ddd3)",
                    }}
                  />
                )}
                <div style={{ padding: "10px 12px" }}>
                  <div
                    style={{
                      fontSize: "20px",
                      lineHeight: "1.25",
                      fontWeight: 600,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {p.title}
                  </div>
                  <div
                    className="font-mono"
                    style={{ marginTop: "5px", fontSize: "15px", color: "#5f7963" }}
                  >
                    {shortDate(p.publishedAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {posts.length === 0 && (
            <p
              className="font-mono"
              style={{ fontSize: "20px", color: "#5f7963", paddingTop: "40px" }}
            >
              the feed is not answering just now
            </p>
          )}
        </div>
      </Html>

      {/* Pick targets, one per card.
          These are separate invisible planes rather than the DOM being
          clickable, because the room has no cursor — everything is picked with
          the crosshair. Their positions are computed from the same grid the
          cards are laid out on, so they cannot drift apart. */}
      {posts.map((p, i) => {
        const c = cellPx(i);
        return (
          <Interactive
            key={p.url}
            label={p.title}
            verb="read"
            detail={shortDate(p.publishedAt)}
            onActivate={() => onOpen(postCard(p))}
          >
            {(hovered) => (
              <group
                position={[
                  (c.x - PX_W / 2) * S,
                  (PX_H / 2 - c.y) * S,
                  0.009,
                ]}
              >
                <mesh visible={false}>
                  <planeGeometry args={[CELL_W * S, CELL_H * S]} />
                  <meshBasicMaterial />
                </mesh>
                {/* highlight sits behind the DOM layer so it frames the card */}
                <mesh position={[0, 0, -0.003]} visible={hovered}>
                  <planeGeometry args={[CELL_W * S + 0.018, CELL_H * S + 0.018]} />
                  <meshBasicMaterial color="#ffd9a6" />
                </mesh>
              </group>
            )}
          </Interactive>
        );
      })}
    </group>
  );
}
