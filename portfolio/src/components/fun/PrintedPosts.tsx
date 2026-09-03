"use client";

import { Html } from "@react-three/drei";
import { useEffect, useState } from "react";
import type { InfoCard } from "./Hud";
import { Interactive } from "./interaction";
import { PAPER } from "@/components/materials/paper";

/**
 * The blog, as printouts lying on the dining table.
 *
 * It was a 1.5m whiteboard on the living room wall with six cover images
 * magneted to it, which is not a thing a flat has in it. Paper on a table is,
 * and the content survives the move: everything here still comes from
 * `/api/v1/blog`, which reads the Hugo RSS feed including the cover images
 * Hugo publishes as `<media:content>`. Write a post and it appears on the
 * table; there is nothing to update here.
 *
 * Three sheets, not the board's six. A sheet is 0.148 across against the
 * board's 1.5, so a sheet's worth of pixels is what one post gets, and three
 * of them is what fits on a table beside a place mat.
 *
 * The three lie square to each other and the whole row is set askew instead.
 * Paper rotated individually cannot share one flat `Html` layer, and three
 * layers for one object is a fifth of the room's total — the same trade the
 * leaflets in the entré make, for the same reason.
 */

const SHEET_W = 0.148;
const SHEET_H = 0.21;
const SHEET_GAP = 0.015;
const SHEET_PX = 300;

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

/** Fetched once when the room loads: the sheets have to be printed before
 *  anybody walks up to the table, not when they ask. */
function useBlogPosts(): BlogPost[] {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/blog")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { posts?: BlogPost[] }) => {
        if (!cancelled) setPosts((j.posts ?? []).slice(0, 3));
      })
      .catch(() => {
        // A bare table is the correct failure: the room does not claim posts it
        // could not fetch.
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

/**
 * Origin at the middle of the row, on the surface the sheets lie on. The
 * caller sets them down flat, so this group is built in the table's plane and
 * the layer is turned to face up.
 */
export function PrintedPosts({
  position,
  rotation = [0, 0, 0],
  onOpen,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  onOpen: (card: InfoCard) => void;
}) {
  const posts = useBlogPosts();
  const n = Math.max(posts.length, 1);
  const totalW = n * SHEET_W + (n - 1) * SHEET_GAP;
  const xOf = (i: number) => -totalW / 2 + SHEET_W / 2 + i * (SHEET_W + SHEET_GAP);

  const pxW = Math.round((totalW / SHEET_W) * SHEET_PX);
  const pxH = Math.round((SHEET_H / SHEET_W) * SHEET_PX);
  const gapPx = (SHEET_GAP / SHEET_W) * SHEET_PX;

  if (!posts.length) return null;

  return (
    <group position={position} rotation={rotation}>
      {posts.map((p, i) => (
        <group key={p.url} position={[xOf(i), 0, 0]}>
          {/* A few sheets to each printout, so it has an edge and a shadow
              rather than being a decal on the table. */}
          <mesh position={[0, 0.0012, 0]} receiveShadow castShadow>
            <boxGeometry args={[SHEET_W, 0.0024, SHEET_H]} />
            <meshStandardMaterial color="#f4f1ea" roughness={0.9} />
          </mesh>

          <Interactive
            label={p.title}
            verb="read"
            detail={shortDate(p.publishedAt)}
            onActivate={() => onOpen(postCard(p))}
          >
            {(hovered) => (
              <group position={[0, 0.0026, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <mesh visible={false}>
                  <planeGeometry args={[SHEET_W, SHEET_H]} />
                  <meshBasicMaterial />
                </mesh>
                {/* Hover rings the sheet rather than lighting it: the layer
                    above paints the paper opaquely, so a lit mesh under it
                    would never be seen. */}
                <mesh position={[0, 0, -0.0014]} visible={hovered}>
                  <planeGeometry args={[SHEET_W + 0.016, SHEET_H + 0.016]} />
                  <meshBasicMaterial color="#ffd9a6" />
                </mesh>
              </group>
            )}
          </Interactive>
        </group>
      ))}

      <Html
        transform
        occlude="blending"
        rotation={[-Math.PI / 2, 0, 0]}
        distanceFactor={(totalW / pxW) * 400}
        position={[0, 0.0028, 0]}
        zIndexRange={[10, 0]}
        style={{
          width: `${pxW}px`,
          height: `${pxH}px`,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        <div className="flex h-full w-full" style={{ gap: `${gapPx}px` }}>
          {posts.map((p) => (
            <div
              key={p.url}
              className="flex flex-col"
              style={{
                width: `${SHEET_PX}px`,
                flex: `0 0 ${SHEET_PX}px`,
                /* Paper painted here, not left to the mesh: this end of the
                   room has the stove and the lantern behind it, and an unlit
                   plane under a transparent layer renders near-black. */
                background: PAPER.stock,
                color: PAPER.ink,
                padding: "26px 24px",
              }}
            >
              <div
                className="font-mono"
                style={{ fontSize: "15px", letterSpacing: "0.2em", color: "#9a9082" }}
              >
                {shortDate(p.publishedAt).toUpperCase()}
              </div>
              <div
                style={{
                  fontSize: "27px",
                  fontWeight: 600,
                  lineHeight: 1.14,
                  margin: "13px 0 14px",
                }}
              >
                {p.title}
              </div>
              {p.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.image}
                  alt=""
                  style={{
                    width: "100%",
                    height: "150px",
                    objectFit: "cover",
                    filter: "grayscale(1) contrast(1.15) brightness(1.04)",
                  }}
                />
              )}
              <div
                style={{
                  fontSize: "16px",
                  lineHeight: 1.4,
                  color: "#6d6459",
                  marginTop: "14px",
                  overflow: "hidden",
                }}
              >
                {p.summary}
              </div>
            </div>
          ))}
        </div>
      </Html>
    </group>
  );
}
