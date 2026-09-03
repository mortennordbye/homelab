import * as THREE from "three";

/**
 * Procedural oak — costs no request. Colour only: no normal or roughness map,
 * so it holds up on a small object under a fixed camera and goes flat on a
 * large surface you can walk up to. Anything at room scale takes
 * `black_oak_veneer` through useSurface instead.
 */
export function makeOak(repeat = 3) {
  const size = 1024;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const x = c.getContext("2d")!;
  x.fillStyle = "#4c3722";
  x.fillRect(0, 0, size, size);
  for (let i = 0; i < 260; i++) {
    const y = Math.random() * size;
    const dark = Math.random() * 0.5;
    x.strokeStyle = `rgba(${40 + Math.random() * 30},${26 + Math.random() * 20},${14 + Math.random() * 12},${0.1 + dark * 0.3})`;
    x.lineWidth = 0.7 + Math.random() * 3.4;
    x.beginPath();
    x.moveTo(0, y);
    for (let s = 0; s <= size; s += 64) {
      x.lineTo(s, y + Math.sin(s * 0.006 + i) * 7 + (Math.random() - 0.5) * 3);
    }
    x.stroke();
  }
  for (let i = 0; i < 40; i++) {
    x.strokeStyle = `rgba(30,18,10,${0.05 + Math.random() * 0.09})`;
    x.lineWidth = 6 + Math.random() * 16;
    const y = Math.random() * size;
    x.beginPath();
    x.moveTo(0, y);
    x.lineTo(size, y + (Math.random() - 0.5) * 40);
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  return t;
}

/**
 * Tints for the `black_oak_veneer` surface. One table so every oak surface on
 * the site lands on the same wood: shelf boards, cabinet carcass and the desk
 * in the room are all this plank at three depths.
 */
export const OAK = {
  /** Shelf boards, uprights, a desk top. */
  case: "#6a5541",
  /** Cabinet and sideboard panels. */
  carcass: "#54422f",
  /** A back panel, deliberately darker so it does not read as a lit wall. */
  back: "#33281d",
} as const;
