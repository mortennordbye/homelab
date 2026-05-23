// Static layout data for the labels + logos that orbit the globe. Kept
// separate from InlineGlobeScene so we can render them as HTML overlays
// without pulling three.js into the InlineGlobe bundle.

export type SpaceLabel = {
  text: string;
  ndc: [number, number];
  z: number;
  size: number;
  color?: string;
};

export type SpaceLogo = {
  slug: string;
  ndc: [number, number];
  z: number;
  scale: number;
};

export const SPACE_LABELS: SpaceLabel[] = [
  { text: "git push --force", ndc: [-0.25, 0.78], z: -8, size: 0.24, color: "#ffb27a" },
  { text: "sudo rm -rf /", ndc: [0.42, 0.78], z: -9, size: 0.24, color: "#ffb27a" },
  { text: ":wq", ndc: [0.92, -0.20], z: -10, size: 0.24 },
];

export const SPACE_LOGOS: SpaceLogo[] = [
  // Top strip — below the nav, above the headline
  { slug: "prometheus", ndc: [-0.62, -0.72], z: -8, scale: 0.50 },
  { slug: "kubernetes", ndc: [-0.42, -0.66], z: -7, scale: 0.55 },
  { slug: "docker", ndc: [-0.22, -0.70], z: -7, scale: 0.45 },
  { slug: "github", ndc: [-0.04, -0.68], z: -7, scale: 0.40 },
  { slug: "linux", ndc: [0.14, -0.68], z: -7, scale: 0.50 },
  { slug: "helm", ndc: [0.40, -0.72], z: -8, scale: 0.45 },
  { slug: "nodedotjs", ndc: [0.62, -0.72], z: -8, scale: 0.45 },
  // Left strip — argo lifted to the top strip (its old [-0.92, -0.55] slot
  // collided with the AVAILABLE eyebrow on the left column).
  { slug: "argo", ndc: [-0.82, -0.78], z: -9, scale: 0.55 },
  { slug: "go", ndc: [-0.94, 0.20], z: -9, scale: 0.55 },
  { slug: "python", ndc: [-0.88, 0.55], z: -9, scale: 0.50 },
  // Right strip
  { slug: "elasticsearch", ndc: [0.92, -0.55], z: -9, scale: 0.55 },
  { slug: "redis", ndc: [0.95, 0.10], z: -10, scale: 0.55 },
  { slug: "rabbitmq", ndc: [0.90, 0.62], z: -9, scale: 0.50 },
  // Bottom strip
  { slug: "terraform", ndc: [-0.42, 0.86], z: -8, scale: 0.50 },
  { slug: "nginx", ndc: [-0.05, 0.92], z: -9, scale: 0.45 },
  { slug: "grafana", ndc: [0.30, 0.86], z: -8, scale: 0.50 },
  { slug: "ansible", ndc: [0.55, 0.92], z: -9, scale: 0.45 },
  { slug: "cilium", ndc: [0.74, 0.86], z: -8, scale: 0.50 },
  { slug: "postgresql", ndc: [-0.68, 0.92], z: -9, scale: 0.50 },
];

// Three.js camera: fov 50°, position z = 5.5. World-height factor at a given
// scene depth z (which is negative further from camera). Same math the old
// 3D Text/Sprite components used, so the HTML overlay matches their on-screen
// size exactly.
const HALF_FOV_TAN = Math.tan((50 * Math.PI) / 360);

export function viewportFraction(worldSize: number, z: number): number {
  const distance = 5.5 + Math.abs(z);
  return worldSize / (2 * distance * HALF_FOV_TAN);
}

export function ndcToPercent(ndc: [number, number]): { left: string; top: string } {
  return {
    left: `${((ndc[0] + 1) / 2) * 100}%`,
    top: `${((ndc[1] + 1) / 2) * 100}%`,
  };
}
