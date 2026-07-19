import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Reads a real file out of this repo so the room can show real code.
 *
 * The file is read from disk rather than pasted into a content module, because
 * a pasted excerpt is a copy that rots: the code on the screen would drift away
 * from the code that runs, and the one thing this screen is for is being
 * genuinely the latter.
 *
 * It has to be a file that actually ships inside the portfolio image. The
 * Kubernetes manifests for this site live in `k8s/talos/apps/portfolio/`, which
 * is outside the Docker build context — reading those would work locally and
 * throw in production.
 */
export type SourceExcerpt = {
  path: string;
  lines: string[];
  /** Total lines in the file, so the screen can say what it is not showing. */
  total: number;
};

/**
 * This site's own Kubernetes Deployment.
 *
 * A copy, and deliberately so. The real file is `k8s/talos/apps/portfolio/
 * deployment.yaml` at the repo root, which the Docker build cannot see — the
 * build context is `./portfolio`. The copy is refreshed by a `cp` step in
 * `.github/workflows/build-portfolio.yaml` immediately before the image is
 * built, so what production shows is always the manifest that is actually
 * deployed. The version committed here is a local-dev convenience and is the
 * only thing that can go stale, and only on your machine.
 *
 * It is the right file to put on that monitor: it is the manifest for the very
 * pod serving the room, and it carries real reasoning in its comments — pod
 * anti-affinity across hypervisors, probes, resource limits — rather than being
 * a decorative slab of syntax.
 */
const SOURCE = "src/content/k8s/deployment.yaml";
/** Shown in the tab. The path a visitor cares about is where it lives in the
 *  repo, not where it was staged for the build. */
const DISPLAY_PATH = "k8s/talos/apps/portfolio/deployment.yaml";
const MAX_LINES = 30;

export function sourceExcerpt(): SourceExcerpt {
  try {
    const text = readFileSync(join(process.cwd(), SOURCE), "utf8");
    const all = text.split("\n");
    return { path: DISPLAY_PATH, lines: all.slice(0, MAX_LINES), total: all.length };
  } catch {
    // A screen with nothing on it is better than a build that fails because a
    // file moved. The room degrades; it does not break.
    return { path: DISPLAY_PATH, lines: [], total: 0 };
  }
}
