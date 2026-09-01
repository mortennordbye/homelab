/**
 * Idle warming for the below-the-fold WebGL objects: prefetch chunk + textures
 * during idle time so the section mounts from cache. Call sites must only warm
 * after a real input, so a headless run never pays for three.js.
 */

/** Runs `warm` when the browser is idle. Returns a cancel for the effect. */
export function warmOnIdle(warm: () => void): () => void {
  // Metered connections opt out of speculative fetching.
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } })
    .connection;
  if (conn?.saveData) return () => {};

  if (typeof window.requestIdleCallback !== "function") {
    const t = window.setTimeout(warm, 3000);
    return () => window.clearTimeout(t);
  }
  const id = window.requestIdleCallback(warm, { timeout: 3000 });
  return () => window.cancelIdleCallback(id);
}

/** Pulls images into the HTTP cache; three.js loads textures via <img> too. */
export function warmImages(urls: readonly string[]): void {
  urls.forEach((url) => {
    const img = new Image();
    img.src = url;
  });
}
