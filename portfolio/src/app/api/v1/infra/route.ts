import { json } from "@/lib/api";
import { readClusterStatus } from "@/lib/cluster-status";

// Live Talos cluster status: the status-publisher CronJob writes a ConfigMap
// mounted into the pod, read fresh per request. Falls back to the baked
// snapshot when the file isn't mounted (local dev, feed down).
export const dynamic = "force-dynamic";

export async function GET() {
  const { live, data } = await readClusterStatus();

  const res = live
    ? // The publisher writes every 5 min; SWR paints the last answer on a
      // revisit instead of waiting for a new one.
      json(data, { cache: "public, max-age=30, stale-while-revalidate=300" })
    : json({ ...data, source: "snapshot" }, { cache: "no-store" });

  // The pod's spec.nodeName via the downward API; FooterStamp reads it.
  if (process.env.NODE_NAME) res.headers.set("x-served-by", process.env.NODE_NAME);
  return res;
}
