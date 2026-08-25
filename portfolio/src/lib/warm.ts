/**
 * Idle warming for the below-the-fold WebGL objects.
 *
 * Each object waits for its section to be near the viewport before it loads,
 * which means the chunk and the textures start downloading at the moment the
 * section arrives — the visitor watches the object assemble itself instead of
 * finding it already there. Warming moves that download into the idle time the
 * page has anyway, so the mount finds the module in the registry and the
 * textures in the HTTP cache.
 *
 * It keeps the facade rule the objects are built on: call sites only warm once
 * a real input has happened, so a headless run still never pays for three.js.
 */

/** Runs `warm` when the browser is idle. Returns a cancel for the effect. */
export function warmOnIdle(warm: () => void): () => void {
  // Metered connections opt out: this is fetching ahead of a section the
  // visitor may never reach.
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

/**
 * Pulls image files into the HTTP cache. three.js loads its textures through
 * an <img> as well, so the scene's own request is served from cache rather
 * than from the network.
 */
export function warmImages(urls: readonly string[]): void {
  urls.forEach((url) => {
    const img = new Image();
    img.src = url;
  });
}
