"use client";

import { RoundedBox } from "@react-three/drei";
import { useMemo } from "react";
import { Interactive } from "./interaction";
import type { ShelfBook, ShelfCert, ShelfData } from "./shelf";
import { useSurface } from "./textures";

/**
 * A shelf unit holding the case studies as books and the certifications as a
 * folder of prints.
 *
 * Everything here is laid out from array length. Shelves are filled in order
 * and a new one is added when the current row runs out of width, so adding a
 * thirteenth case study or a seventh certification needs no change in this
 * file. Hand-placing thirteen books would have been quicker to write and wrong
 * the first time the site gained a fourteenth.
 *
 * Book width, height and colour are derived from the slug rather than random,
 * so a given case study is always the same book in the same place. Random
 * dressing would reshuffle the shelf on every render and make the room feel
 * unreliable in a way that is hard to name but easy to notice.
 *
 * Books and certificates deliberately do not cast shadows. Adding the shelf
 * halved the frame rate, 120fps to 61, and the cause was not the extra picking
 * targets or the extra draw calls — it was that the room's main light is a
 * point light, so its shadow map is a cube and every caster is rendered six
 * more times. Sixty small meshes inside a shelf were paying that for shadows
 * that ambient occlusion already accounts for. Turning off `castShadow` on
 * them restored 120fps exactly. Anything added inside furniture should follow
 * the same rule.
 */

/**
 * Bay height is fixed and the unit grows to fit, rather than the unit being a
 * fixed height carved into however many bays the content needs. Getting this
 * the wrong way round gave two 0.9m-tall bays with a row of paperbacks lost at
 * the bottom of each, because thirteen books happen to fit on one shelf.
 */
/* Widened from 0.52m. At the old width a row held about six books, so the unit
   answered every new case study by growing another shelf upward, and it was
   heading for something taller than the door. A 0.92m bay is a normal piece of
   furniture and roughly doubles what fits per row, which buys a lot of runway
   before the layout has to grow again. Nothing else changes: rows still wrap
   from INNER_W and the unit still sizes itself from the row count. */
const UNIT = { w: 0.92, d: 0.28 };
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
 * How tall the unit comes out for a given set of content.
 *
 * Exported because the room stands a lamp on top of the shelf, and the shelf
 * grows a row whenever the content outgrows the current one. A hard-coded
 * height there would leave the lamp floating in mid-air or buried in a board
 * the first time a case study is added — which is the same failure the shelf
 * was written to avoid for its own contents.
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
        <group position={[x + w / 2, y + h / 2, 0]} rotation={[0, 0, lean]}>
          <RoundedBox
            args={[w, h, UNIT.d - 0.07]}
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
              <boxGeometry args={[w * 0.98, 0.006, UNIT.d - 0.066]} />
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
 * One certificate, standing upright and facing out like a framed print.
 *
 * These were first modelled the way certificates actually sit in a drawer: a
 * flat stack of sheets. That failed a check worth repeating — from a standing
 * eye line, only the top two of six could ever be put under the crosshair,
 * because looking down at a horizontal stack always hits the top sheet. Four
 * certificates existed and were unreachable.
 *
 * Standing them up fixes it for the same reason books work at ankle height:
 * an upright face is targetable from anywhere in front of it, a horizontal one
 * only from directly above. Anything meant to be looked at should present a
 * face to the room.
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
          position={[x + CERT_W / 2, y + CERT_H / 2, -0.03]}
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
  const oak = useSurface("oak_veneer_01", [1.6, 1.2]);

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
          <meshStandardMaterial {...oak} color="#b39a72" roughness={0.66} />
        </mesh>
      ))}
      {/* back */}
      <mesh position={[0, height / 2, -UNIT.d / 2 + 0.006]} receiveShadow>
        <boxGeometry args={[UNIT.w - BOARD * 2, height, 0.012]} />
        <meshStandardMaterial {...oak} color="#a8906a" roughness={0.72} />
      </mesh>
      {/* plinth, top, and one board under each row */}
      {[PLINTH, height - BOARD / 2, ...Array.from({ length: totalRows }, (_, r) => rowY(r) - BOARD / 2)].map(
        (y, i) => (
          <mesh key={i} position={[0, y, 0]} castShadow receiveShadow>
            <boxGeometry args={[UNIT.w - BOARD * 2, BOARD, UNIT.d]} />
            <meshStandardMaterial {...oak} color="#b39a72" roughness={0.66} />
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
