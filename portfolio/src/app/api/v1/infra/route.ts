import { readFile } from "node:fs/promises";
import { json } from "@/lib/api";
import { statusSnapshot } from "@/content/infrastructure";

// Live Talos cluster status. The status-publisher CronJob writes a ConfigMap
// every 5 minutes; it's mounted into the pod and read here fresh per request.
// Returns the raw status shape (same as the old /status.json) so the
// /infrastructure page consumes it unchanged. Falls back to the baked
// snapshot when the file isn't mounted (local dev, feed down).
export const dynamic = "force-dynamic";

const STATUS_FILE = process.env.STATUS_FILE ?? "/config/status.json";

export async function GET() {
  try {
    const raw = await readFile(STATUS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return json(parsed, { cache: "public, max-age=30" });
  } catch {
    return json(
      { ...statusSnapshot, source: "snapshot" },
      { cache: "no-store" },
    );
  }
}
