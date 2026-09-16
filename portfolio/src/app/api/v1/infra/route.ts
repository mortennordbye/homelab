import { json } from "@/lib/api";
import { readClusterStatus } from "@/lib/cluster-status";

// Live Talos cluster status: the status-publisher CronJob writes a ConfigMap
// mounted into the pod, read fresh per request. Falls back to the baked
// snapshot when the file isn't mounted (local dev, feed down).
export const dynamic = "force-dynamic";

export async function GET() {
  const { live, data } = await readClusterStatus();

  if (!live) {
    return json({ ...data, source: "snapshot" }, { cache: "no-store" });
  }

  // The publisher writes every 5 min; SWR paints the last answer on a
  // revisit instead of waiting for a new one.
  return json(data, {
    cache: "public, max-age=30, stale-while-revalidate=300",
  });
}
