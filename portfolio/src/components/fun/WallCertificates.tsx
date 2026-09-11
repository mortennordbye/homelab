"use client";

import { RoundedBox } from "@react-three/drei";
import { useEffect, useState } from "react";
import * as THREE from "three";
import { Interactive } from "./interaction";
import type { ShelfCert } from "./shelf";
import { useSurface } from "@/components/materials/surface";
import { OAK } from "@/components/materials/oak";

const CERT_W = 0.14;
const CERT_H = 0.19;
const GAP = 0.025;
/** How many stand on one board before the next board goes up above it. */
const PER_ROW = 7;
const ROW_H = 0.3;
const BOARD = { t: 0.022, d: 0.14 };
/** Leaning back onto the wall, the way a frame stood on a shelf does. */
const LEAN = -0.1;
const BRASS = "#9c7b3f";
const ICON_SIZE = 0.05;
const ICON_PX = 256;

/** Band colour per issuer, muted to sit in lamplight. The band is what keeps a
 *  row of certificates from reading as blank paper. */
const BAND: Record<string, string> = {
  Microsoft: "#3a7cc0",
  "GitHub (Microsoft)": "#7157a8",
  "The Linux Foundation": "#2f8f83",
  "Amazon Web Services": "#d08a2e",
};
const BAND_DEFAULT = "#8b7a5a";

/**
 * The logo printed on a certificate, or null for none. GitHub is tested before
 * Microsoft because its issuer string contains "Microsoft".
 */
function iconFor(c: ShelfCert): string | null {
  const s = `${c.title} ${c.issuer}`;
  if (/kubernetes|\bCK(A|AD|S)\b/i.test(s)) return "/icons/cert/kubernetes.svg";
  if (/github/i.test(s)) return "/icons/cert/github.svg";
  if (/azure|microsoft/i.test(s)) return "/icons/cert/azure.svg";
  if (/\baws\b|amazon/i.test(s)) return "/icons/cert/aws.svg";
  return null;
}

const icons = new Map<string, Promise<THREE.CanvasTexture>>();

/**
 * An SVG from `public/`, drawn into a square canvas and fitted inside it.
 * Same-origin, so it is a texture rather than a DOM layer. Cached per URL: the
 * three Microsoft certificates share one.
 */
function loadIcon(url: string): Promise<THREE.CanvasTexture> {
  let p = icons.get(url);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = ICON_PX;
        c.height = ICON_PX;
        const w = img.naturalWidth || ICON_PX;
        const h = img.naturalHeight || ICON_PX;
        const k = Math.min(ICON_PX / w, ICON_PX / h);
        c.getContext("2d")!.drawImage(img, (ICON_PX - w * k) / 2, (ICON_PX - h * k) / 2, w * k, h * k);
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        resolve(t);
      };
      img.onerror = reject;
      img.src = url;
    });
    icons.set(url, p);
  }
  return p;
}

function useIcon(url: string | null): THREE.CanvasTexture | null {
  const [tex, setTex] = useState<THREE.CanvasTexture | null>(null);
  useEffect(() => {
    if (!url) return;
    let live = true;
    loadIcon(url)
      .then((t) => {
        if (live) setTex(t);
      })
      // A missing logo leaves the certificate without one, not broken.
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [url]);
  return tex;
}

function Certificate({
  cert,
  x,
  onOpen,
}: {
  cert: ShelfCert;
  x: number;
  onOpen: () => void;
}) {
  const icon = useIcon(iconFor(cert));
  return (
    <Interactive
      label={cert.title}
      verb="look at"
      detail={`${cert.issuer} · ${cert.date}`}
      onActivate={onOpen}
    >
      {(hovered) => (
        <group position={[x, BOARD.t + CERT_H / 2, 0.05]} rotation={[LEAN, 0, 0]}>
          {/* frame */}
          <RoundedBox args={[CERT_W, CERT_H, 0.014]} radius={0.003} smoothness={3} receiveShadow>
            <meshStandardMaterial
              color="#2e2219"
              roughness={0.55}
              emissive={hovered ? "#ffd9a6" : "#000000"}
              emissiveIntensity={hovered ? 0.3 : 0}
            />
          </RoundedBox>
          {/* mount */}
          <mesh position={[0, 0, 0.0075]}>
            <planeGeometry args={[CERT_W - 0.02, CERT_H - 0.02]} />
            <meshStandardMaterial color="#e2dac8" roughness={0.9} />
          </mesh>
          {/* issuer band */}
          <mesh position={[0, CERT_H / 2 - 0.032, 0.008]}>
            <planeGeometry args={[CERT_W - 0.036, 0.03]} />
            <meshStandardMaterial color={BAND[cert.issuer] ?? BAND_DEFAULT} roughness={0.7} />
          </mesh>
          {/* logo */}
          {icon && (
            <mesh position={[0, 0.016, 0.0085]}>
              <planeGeometry args={[ICON_SIZE, ICON_SIZE]} />
              <meshStandardMaterial map={icon} transparent alphaTest={0.05} roughness={0.8} />
            </mesh>
          )}
          {/* two printed lines, so the field is not blank */}
          {[-0.024, -0.038].map((ly, i) => (
            <mesh key={ly} position={[0, ly, 0.008]}>
              <planeGeometry args={[CERT_W - (i === 0 ? 0.05 : 0.07), 0.006]} />
              <meshStandardMaterial color="#9d9380" roughness={0.9} />
            </mesh>
          ))}
          {/* seal */}
          <mesh position={[0, -CERT_H / 2 + 0.03, 0.0085]}>
            <circleGeometry args={[0.013, 18]} />
            <meshStandardMaterial color={BRASS} roughness={0.5} metalness={0.35} />
          </mesh>
        </group>
      )}
    </Interactive>
  );
}

/**
 * The certifications, framed and stood on a shelf hung on the wall. Rows follow
 * the content: past PER_ROW a second board goes up above the first.
 *
 * Origin at the wall, level with the top of the lowest board's brackets, with
 * local +z out into the room. Nothing here casts, for the reason in Bookshelf.
 */
export function WallCertificates({
  position,
  rotation = [0, 0, 0],
  certs,
  onOpen,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  certs: ShelfCert[];
  onOpen: (c: ShelfCert) => void;
}) {
  const oak = useSurface("black_oak_veneer", [1.2, 0.3]);
  const rows = Array.from({ length: Math.ceil(certs.length / PER_ROW) }, (_, r) =>
    certs.slice(r * PER_ROW, (r + 1) * PER_ROW),
  );

  return (
    <group position={position} rotation={rotation}>
      {rows.map((row, r) => {
        const len = row.length * (CERT_W + GAP) + GAP;
        return (
          <group key={r} position={[0, r * ROW_H, 0]}>
            <mesh position={[0, BOARD.t / 2, BOARD.d / 2]} receiveShadow>
              <boxGeometry args={[len, BOARD.t, BOARD.d]} />
              <meshStandardMaterial {...oak} color={OAK.case} roughness={0.66} />
            </mesh>
            {/* brackets: a plate on the wall and an arm under the board */}
            {[-1, 1].map((s) => (
              <group key={s} position={[s * (len / 2 - 0.09), 0, 0]}>
                <mesh position={[0, -0.05, 0.003]}>
                  <boxGeometry args={[0.018, 0.1, 0.006]} />
                  <meshStandardMaterial color={BRASS} roughness={0.4} metalness={0.6} />
                </mesh>
                <mesh position={[0, -0.003, BOARD.d * 0.4]}>
                  <boxGeometry args={[0.018, 0.006, BOARD.d * 0.8]} />
                  <meshStandardMaterial color={BRASS} roughness={0.4} metalness={0.6} />
                </mesh>
              </group>
            ))}
            {row.map((c, i) => (
              <Certificate
                key={c.title}
                cert={c}
                x={-len / 2 + GAP + CERT_W / 2 + i * (CERT_W + GAP)}
                onOpen={() => onOpen(c)}
              />
            ))}
          </group>
        );
      })}
    </group>
  );
}
