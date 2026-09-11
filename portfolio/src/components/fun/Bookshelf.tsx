"use client";

import { RoundedBox } from "@react-three/drei";
import { useMemo } from "react";
import { Interactive } from "./interaction";
import type { ShelfBook } from "./shelf";

/**
 * The case studies as books, standing in a row along a bay and wrapping into
 * the next bay down when one is full. Layout is computed from array length, so
 * a new case study needs no change here. Book dimensions and colour derive from
 * the slug, not randomness, so a case study is always the same book in the
 * same place.
 *
 * Nothing in here casts shadows: the room's main light is a point light, so
 * every caster renders six extra times into a cube shadow map — sixty small
 * meshes halved the frame rate for shadows AO already accounts for. Anything
 * added inside furniture should follow the same rule.
 */

/** How deep a book is, front to back. */
const ITEM_D = 0.21;
const GAP = 0.012;

/** Muted spines that sit with the oak and the dark walls rather than fighting them. */
const SPINES = [
  "#6b5344",
  "#4f5f52",
  "#7a6047",
  "#59544d",
  "#5d6b6f",
  "#75604f",
  "#4a5348",
];

/** Stable pseudo-random in [0,1) from a string, so a slug always looks the same. */
function hash01(s: string, salt = 0): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function Book({
  book,
  w,
  h,
  colour,
  x,
  y,
  z,
  onOpen,
}: {
  book: ShelfBook;
  w: number;
  h: number;
  colour: string;
  x: number;
  y: number;
  z: number;
  onOpen: () => void;
}) {
  const lean = hash01(book.slug, 7) < 0.12 ? 0.09 : 0;
  return (
    <Interactive
      label={book.title}
      verb="read"
      detail={`${book.client} · ${book.period}`}
      onActivate={onOpen}
    >
      {(hovered) => (
        <group position={[x + w / 2, y + h / 2, z]} rotation={[0, 0, lean]}>
          <RoundedBox
            args={[w, h, ITEM_D]}
            radius={0.004}
            smoothness={3}
            receiveShadow
          >
            <meshStandardMaterial
              color={colour}
              roughness={0.78}
              emissive={hovered ? "#ffd9a6" : "#000000"}
              emissiveIntensity={hovered ? 0.28 : 0}
            />
          </RoundedBox>
          {/* head and tail bands, so a spine is not one flat colour */}
          {[h / 2 - 0.016, -h / 2 + 0.016].map((by) => (
            <mesh key={by} position={[0, by, 0.001]}>
              <boxGeometry args={[w * 0.98, 0.006, ITEM_D + 0.004]} />
              <meshStandardMaterial color="#cbbfa6" roughness={0.7} />
            </mesh>
          ))}
        </group>
      )}
    </Interactive>
  );
}

/**
 * Books along bays whose floors are `bayYs`, top bay first, from `x0` across
 * `width`. The first bay starts `firstRowStart` in, to leave room for whatever
 * else stands in it. A book with no bay left is not drawn and nothing says so:
 * when the case studies outgrow the bays, give them another.
 */
export function ShelvedBooks({
  books,
  x0,
  width,
  bayYs,
  firstRowStart = 0,
  z,
  onOpenBook,
}: {
  books: ShelfBook[];
  x0: number;
  width: number;
  bayYs: number[];
  firstRowStart?: number;
  z: number;
  onOpenBook: (b: ShelfBook) => void;
}) {
  const placed = useMemo(() => {
    const out: { book: ShelfBook; x: number; bay: number; w: number; h: number }[] = [];
    let bay = 0;
    let x = firstRowStart;
    for (const book of books) {
      const w = 0.04 + hash01(book.slug, 1) * 0.035;
      const h = 0.19 + hash01(book.slug, 2) * 0.05;
      if (x + w > width && x > (bay === 0 ? firstRowStart : 0)) {
        bay += 1;
        x = 0;
      }
      out.push({ book, x, bay, w, h });
      x += w + GAP;
    }
    return out;
  }, [books, width, firstRowStart]);

  return (
    <>
      {placed
        .filter((p) => p.bay < bayYs.length)
        .map(({ book, x, bay, w, h }) => (
          <Book
            key={book.slug}
            book={book}
            w={w}
            h={h}
            colour={SPINES[Math.floor(hash01(book.slug, 5) * SPINES.length) % SPINES.length]}
            x={x0 + x}
            y={bayYs[bay]}
            z={z}
            onOpen={() => onOpenBook(book)}
          />
        ))}
    </>
  );
}
