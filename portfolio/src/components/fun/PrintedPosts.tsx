"use client";

import { Html } from "@react-three/drei";
import { useEffect, useState } from "react";
import type { InfoCard } from "./Hud";
import { Interactive } from "./interaction";

/**
 * The blog, as the latest post covers framed together on the wall.
 *
 * Everything comes from `/api/v1/blog`, which reads the Hugo RSS feed including
 * the covers Hugo publishes as `<media:content>`. Write a post and it is on the
 * wall; there is nothing to update here.
 *
 * The covers are a DOM layer, not textures: they are served from
 * blog.nordbye.it, and a cross-origin texture needs CORS headers the blog does
 * not send. One frame holds all of them so they cost one `Html` layer, and the
 * mat between them is painted in that layer, because a transparent gap in a
 * blended layer shows the page behind the canvas rather than the wall.
 */

/** Covers are authored at 1200x630; anything showing one keeps that ratio. */
const COVER_W = 0.36;
const COVER_H = COVER_W * (630 / 1200);
/** The dark mat around and between the covers. */
const MAT = 0.03;
/** Moulding width and depth. */
const FRAME = 0.024;
const FRAME_D = 0.03;
/** DOM pixels per metre of mat. */
const PX = 900;
const WOOD = "#2a1f17";
const MAT_COLOUR = "#1d1712";

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

/** Fetched once when the room loads: the prints have to be on the wall before
 *  anybody walks up to it, not when they ask. */
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
        // A bare wall is the correct failure: the room does not claim posts it
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

/** Brass edge around a hovered cover. In front of the DOM layer, since a mesh
 *  behind it is painted over. */
function HoverEdge({ w, h }: { w: number; h: number }) {
  const t = 0.004;
  const bars: [number, number, number, number][] = [
    [0, h / 2 + t / 2, w + t * 2, t],
    [0, -h / 2 - t / 2, w + t * 2, t],
    [w / 2 + t / 2, 0, t, h],
    [-w / 2 - t / 2, 0, t, h],
  ];
  return (
    <>
      {bars.map(([x, y, bw, bh]) => (
        <mesh key={`${x},${y}`} position={[x, y, 0.013]}>
          <planeGeometry args={[bw, bh]} />
          <meshBasicMaterial color="#ffd9a6" />
        </mesh>
      ))}
    </>
  );
}

/**
 * Origin at the centre of the frame's back, against the wall, with local +z out
 * into the room.
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
  if (!posts.length) return null;

  const n = posts.length;
  const matW = COVER_W + MAT * 2;
  const matH = n * COVER_H + (n + 1) * MAT;
  const yOf = (i: number) => matH / 2 - MAT - COVER_H / 2 - i * (COVER_H + MAT);

  return (
    <group position={position} rotation={rotation}>
      {/* backing, behind the layer */}
      <mesh position={[0, 0, 0.005]} receiveShadow>
        <boxGeometry args={[matW, matH, 0.01]} />
        <meshStandardMaterial color={MAT_COLOUR} roughness={0.9} />
      </mesh>

      {/* moulding, standing proud of the mat. Nothing here casts: see Bookshelf. */}
      {[1, -1].map((s) => (
        <mesh key={`h${s}`} position={[0, s * (matH / 2 + FRAME / 2), FRAME_D / 2]} receiveShadow>
          <boxGeometry args={[matW + FRAME * 2, FRAME, FRAME_D]} />
          <meshStandardMaterial color={WOOD} roughness={0.55} />
        </mesh>
      ))}
      {[1, -1].map((s) => (
        <mesh key={`v${s}`} position={[s * (matW / 2 + FRAME / 2), 0, FRAME_D / 2]} receiveShadow>
          <boxGeometry args={[FRAME, matH, FRAME_D]} />
          <meshStandardMaterial color={WOOD} roughness={0.55} />
        </mesh>
      ))}

      {posts.map((p, i) => (
        <Interactive
          key={p.url}
          label={p.title}
          verb="read"
          detail={shortDate(p.publishedAt)}
          onActivate={() => onOpen(postCard(p))}
        >
          {(hovered) => (
            <group position={[0, yOf(i), 0]}>
              <mesh position={[0, 0, 0.02]} visible={false}>
                <planeGeometry args={[COVER_W, COVER_H]} />
                <meshBasicMaterial />
              </mesh>
              {hovered && <HoverEdge w={COVER_W} h={COVER_H} />}
            </group>
          )}
        </Interactive>
      ))}

      <Html
        transform
        occlude="blending"
        distanceFactor={400 / PX}
        position={[0, 0, 0.011]}
        zIndexRange={[10, 0]}
        style={{
          width: `${matW * PX}px`,
          height: `${matH * PX}px`,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        <div
          className="flex h-full w-full flex-col"
          style={{ background: MAT_COLOUR, padding: `${MAT * PX}px`, gap: `${MAT * PX}px` }}
        >
          {posts.map((p) => (
            <div
              key={p.url}
              style={{
                width: `${COVER_W * PX}px`,
                height: `${COVER_H * PX}px`,
                flex: "0 0 auto",
                overflow: "hidden",
                background: "#2b231c",
              }}
            >
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.image}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    /* Unlit DOM beside lamplit walls: taken down so the print
                       sits in the light rather than glowing like a screen. */
                    filter: "brightness(0.82) saturate(0.9)",
                  }}
                />
              ) : (
                <div
                  className="flex h-full items-center font-mono"
                  style={{ color: "#cbbfa6", fontSize: "18px", padding: "16px" }}
                >
                  {p.title}
                </div>
              )}
            </div>
          ))}
        </div>
      </Html>
    </group>
  );
}
