import { readFile } from "node:fs/promises";
import { json } from "@/lib/api";
import { statusSnapshot } from "@/content/infrastructure";

// Live Talos cluster status: the status-publisher CronJob writes a ConfigMap
// mounted into the pod, read fresh per request. Falls back to the baked
// snapshot when the file isn't mounted (local dev, feed down).
export const dynamic = "force-dynamic";

const STATUS_FILE = process.env.STATUS_FILE ?? "/config/status.json";

export async function GET() {
  try {
    const raw = await readFile(STATUS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    // The publisher writes every 5 min; SWR paints the last answer on a
    // revisit instead of waiting for a new one.
    return json(parsed, {
      cache: "public, max-age=30, stale-while-revalidate=300",
    });
  } catch {
    return json(
      { ...statusSnapshot, source: "snapshot" },
      { cache: "no-store" },
    );
  }
}
