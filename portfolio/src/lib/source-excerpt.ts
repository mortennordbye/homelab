import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Reads a real file from disk so the room screen shows code that cannot drift
 * from what runs. The file must ship inside the Docker build context
 * (./portfolio) — repo-root paths work locally and throw in production.
 */
export type SourceExcerpt = {
  path: string;
  lines: string[];
  /** Total lines in the file, so the screen can say what it is not showing. */
  total: number;
};

// A copy of k8s/talos/apps/portfolio/deployment.yaml, which is outside the
// build context. build-portfolio.yaml refreshes it with a cp step before the
// image build; only the committed copy can go stale, and only locally.
const SOURCE = "src/content/k8s/deployment.yaml";
/** Tab label: the repo path, not where the copy was staged for the build. */
const DISPLAY_PATH = "k8s/talos/apps/portfolio/deployment.yaml";
const MAX_LINES = 30;

export function sourceExcerpt(): SourceExcerpt {
  try {
    const text = readFileSync(join(process.cwd(), SOURCE), "utf8");
    const all = text.split("\n");
    return { path: DISPLAY_PATH, lines: all.slice(0, MAX_LINES), total: all.length };
  } catch {
    // Empty screen over a failed build if the file moves.
    return { path: DISPLAY_PATH, lines: [], total: 0 };
  }
}
