"use client";

import { RoundedBox } from "@react-three/drei";
import { useMemo } from "react";
import { Interactive } from "./interaction";
import type { ShelfBook, ShelfCert, ShelfData } from "./shelf";
import { useSurface } from "@/components/materials/surface";
import { OAK } from "@/components/materials/oak";

/**
 * A shelf unit holding the case studies as books and the certifications as a
 * folder of prints. Layout is computed from array length, so new content
 * needs no change here. Book dimensions and colour derive from the slug, not
 * randomness, so a case study is always the same book in the same place.
 *
 * Nothing in here casts shadows: the room's main light is a point light, so
 * every caster renders six extra times into a cube shadow map — sixty small
 * meshes halved the frame rate for shadows AO already accounts for. Anything
 * added inside furniture should follow the same rule.
 */

// Bay height is fixed and the unit grows to fit; the inverse strands short
// rows at the bottom of tall bays.
const UNIT = { w: 0.92, d: 0.42 };
/**
 * How deep the content is, and how far forward it stands. The carcass is deeper
 * than the books now that the printer stands on top of it, and depth taken off
 * `UNIT.d` would give a 0.35m hardback floating in the middle of the board.
 * Width is left alone: at any more than 0.94 the certificates re-flow onto one
 * row and the unit loses a shelf.
 */
const ITEM_D = 0.21;
const FRONT = (UNIT.d - ITEM_D) / 2 - 0.02;
const PLINTH = 0.08;
const BOARD = 0.022;
const BAY = 0.32;
const INNER_W = UNIT.w - BOARD * 2;
const GAP = 0.012;

/** Muted spines that sit with the oak and sage rather than fighting them. */
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

type Placed<T> = { item: T; x: number; row: number; w: number; h: number };

/**
 * How tall the unit comes out for a given set of content. Exported so the
 * lamp standing on top follows the shelf as it grows rows.
 */
export function shelfHeight(shelf: ShelfData): number {
  const rows =
    layout(shelf.books, (b) => 0.04 + hash01(b.slug, 1) * 0.035, () => 0).rows +
    layout(shelf.certs, () => CERT_W, () => 0).rows;
  return PLINTH + BOARD + rows * BAY;
}

/**
 * Fills rows left to right, wrapping to a new row when the next item would
 * overflow. Returns the placements plus the row count the caller needs to size
 * the unit.
 */
function layout<T>(
  items: T[],
  widthOf: (t: T, i: number) => number,
  heightOf: (t: T, i: number) => number,
): { placed: Placed<T>[]; rows: number } {
  const placed: Placed<T>[] = [];
  let row = 0;
  let x = 0;
  items.forEach((item, i) => {
    const w = widthOf(item, i);
    if (x + w > INNER_W && x > 0) {
      row += 1;
      x = 0;
    }
    placed.push({ item, x, row, w, h: heightOf(item, i) });
    x += w + GAP;
  });
  return { placed, rows: row + 1 };
}

function Book({
  book,
  w,
  h,
  colour,
  x,
  y,
  onOpen,
}: {
  book: ShelfBook;
  w: number;
  h: number;
  colour: string;
  x: number;
  y: number;
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
        <group position={[x + w / 2, y + h / 2, FRONT]} rotation={[0, 0, lean]}>
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

const CERT_W = 0.14;
const CERT_H = 0.19;

/**
 * One certificate, standing upright and facing out. Upright, because a face
 * is targetable from anywhere in front of it — a flat stack only ever offers
 * its top sheet to the crosshair. Anything meant to be looked at should
 * present a face to the room.
 */
function Certificate({
  cert,
  x,
  y,
  onOpen,
}: {
  cert: ShelfCert;
  x: number;
  y: number;
  onOpen: () => void;
}) {
  const tilt = 0.06 + hash01(cert.title, 11) * 0.05;
  return (
    <Interactive
      label={cert.title}
      verb="look at"
      detail={`${cert.issuer} · ${cert.date}`}
      onActivate={onOpen}
    >
      {(hovered) => (
        <group
          position={[x + CERT_W / 2, y + CERT_H / 2, FRONT - 0.03]}
          rotation={[tilt, (hash01(cert.title, 13) - 0.5) * 0.08, 0]}
        >
          {/* frame */}
          <RoundedBox
            args={[CERT_W, CERT_H, 0.012]}
            radius={0.003}
            smoothness={3}
            receiveShadow
          >
            <meshStandardMaterial
              color="#8d7350"
              roughness={0.6}
              emissive={hovered ? "#ffd9a6" : "#000000"}
              emissiveIntensity={hovered ? 0.3 : 0}
            />
          </RoundedBox>
          {/* mount and printed field */}
          <mesh position={[0, 0, 0.0075]}>
            <planeGeometry args={[CERT_W - 0.018, CERT_H - 0.018]} />
            <meshStandardMaterial color="#f5f2e9" roughness={0.88} />
          </mesh>
          <mesh position={[0, 0.012, 0.008]}>
            <planeGeometry args={[CERT_W - 0.05, CERT_H - 0.075]} />
            <meshStandardMaterial color="#e8e3d5" roughness={0.9} />
          </mesh>
          {/* seal */}
          <mesh position={[0, -CERT_H / 2 + 0.028, 0.0085]}>
            <circleGeometry args={[0.012, 18]} />
            <meshStandardMaterial color="#9c7b3f" roughness={0.5} metalness={0.35} />
          </mesh>
        </group>
      )}
    </Interactive>
  );
}

export function Bookshelf({
  position,
  rotation = [0, 0, 0],
  shelf,
  onOpenBook,
  onOpenCert,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  shelf: ShelfData;
  onOpenBook: (b: ShelfBook) => void;
  onOpenCert: (c: ShelfCert) => void;
}) {
  const oak = useSurface("black_oak_veneer", [1.6, 1.2]);

  const { placed, rows } = useMemo(
    () =>
      layout(
        shelf.books,
        (b) => 0.04 + hash01(b.slug, 1) * 0.035,
        (b) => 0.19 + hash01(b.slug, 2) * 0.05,
      ),
    [shelf.books],
  );

  // Certificates wrap across rows on the same rule as the books, so a seventh
  // one adds a shelf rather than overflowing the unit.
  const certLayout = useMemo(
    () => layout(shelf.certs, () => CERT_W, () => CERT_H),
    [shelf.certs],
  );

  // Certificates take the top rows, books the rest. Row 0 is the top shelf.
  const certRows = certLayout.rows;
  const totalRows = rows + certRows;
  const height = PLINTH + BOARD + totalRows * BAY;
  const rowY = (r: number) => PLINTH + BOARD + (totalRows - 1 - r) * BAY;

  return (
    <group position={position} rotation={rotation}>
      {/* sides */}
      {[-(UNIT.w - BOARD) / 2, (UNIT.w - BOARD) / 2].map((x) => (
        <mesh key={x} position={[x, height / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[BOARD, height, UNIT.d]} />
          <meshStandardMaterial {...oak} color={OAK.case} roughness={0.66} />
        </mesh>
      ))}
      {/* back */}
      <mesh position={[0, height / 2, -UNIT.d / 2 + 0.006]} receiveShadow>
        <boxGeometry args={[UNIT.w - BOARD * 2, height, 0.012]} />
        <meshStandardMaterial {...oak} color={OAK.carcass} roughness={0.72} />
      </mesh>
      {/* plinth, top, and one board under each row */}
      {[PLINTH, height - BOARD / 2, ...Array.from({ length: totalRows }, (_, r) => rowY(r) - BOARD / 2)].map(
        (y, i) => (
          <mesh key={i} position={[0, y, 0]} castShadow receiveShadow>
            <boxGeometry args={[UNIT.w - BOARD * 2, BOARD, UNIT.d]} />
            <meshStandardMaterial {...oak} color={OAK.case} roughness={0.66} />
          </mesh>
        ),
      )}

      {/* certificates on the top rows */}
      {certLayout.placed.map(({ item, x, row }) => (
        <Certificate
          key={item.title}
          cert={item}
          x={-INNER_W / 2 + x}
          y={rowY(row)}
          onOpen={() => onOpenCert(item)}
        />
      ))}

      {/* books fill the rows beneath them */}
      {placed.map(({ item, x, row, w, h }) => (
        <Book
          key={item.slug}
          book={item}
          w={w}
          h={h}
          colour={SPINES[Math.floor(hash01(item.slug, 5) * SPINES.length) % SPINES.length]}
          x={-INNER_W / 2 + x}
          y={rowY(certRows + row)}
          onOpen={() => onOpenBook(item)}
        />
      ))}
    </group>
  );
}
