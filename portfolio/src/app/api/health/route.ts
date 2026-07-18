import { json } from "@/lib/api";

// Liveness/readiness probe target. Unversioned and always dynamic so it
// reflects the running process, never a build-time cache.
export const dynamic = "force-dynamic";

export function GET() {
  return json({ status: "ok" }, { cache: "no-store" });
}
