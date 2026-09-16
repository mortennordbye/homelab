import { readFile } from "node:fs/promises";
import { statusSnapshot } from "@/content/infrastructure";

// The status-publisher CronJob writes a ConfigMap that is mounted into the web
// pod. Read fresh per request; the pod holds no Kubernetes API access of its own.
const STATUS_FILE = process.env.STATUS_FILE ?? "/config/status.json";

export type ClusterStatus = {
  generatedAt?: string;
  build?: string;
  deployedAt?: string;
  argocd?: { sync?: string; health?: string; syncedAt?: string };
  nodes?: { ready?: number; total?: number };
  versions?: { kubernetes?: string; talos?: string };
  cert?: { notAfter?: string };
  history?: { d: string; ok: number; total: number }[];
};

/**
 * `live: false` means the file was not mounted — local dev, or the feed is
 * down. Callers must say which one they are showing rather than presenting the
 * baked fallback as current cluster state.
 */
export async function readClusterStatus(): Promise<{
  live: boolean;
  data: ClusterStatus;
}> {
  try {
    return { live: true, data: JSON.parse(await readFile(STATUS_FILE, "utf8")) };
  } catch {
    return { live: false, data: statusSnapshot as ClusterStatus };
  }
}
