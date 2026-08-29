"use client";

import { useEffect, useState } from "react";

/**
 * The two things the page can say about its own delivery without being told:
 * the commit it was built from, and how long the cluster took to answer for it.
 *
 * It used to open with "served from talos-cp-02", drawn at random from four
 * hard-coded names in the browser. The cluster has six nodes and none of them
 * is called that, so the one line on the site whose whole point was that it
 * could not be faked was the only line that was. `branding/DECISIONS.md` §12
 * calls this stamp a measurement the site takes of itself; a node name is one
 * the browser cannot take, so it is gone until the pod's own `spec.nodeName`
 * reaches the page. See `BACKLOG.md`.
 */
export function FooterStamp({ buildSha, repo }: { buildSha: string; repo: string }) {
  const [ttfb, setTtfb] = useState<number | null>(null);

  useEffect(() => {
    const nav = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    // responseStart, not responseEnd: the wait for the first byte is the part
    // of the number the cluster is answerable for. Absent on a client-side
    // route change into this page, which is why it renders conditionally.
    if (nav?.responseStart) setTtfb(Math.max(1, Math.round(nav.responseStart)));
  }, []);

  return (
    <p className="font-mono">
      build{" "}
      {buildSha === "dev" ? (
        <span className="text-fg-2">dev</span>
      ) : (
        <a
          href={`${repo}/commit/${buildSha}`}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring text-fg-2 underline decoration-line underline-offset-4 hover:text-accent hover:decoration-accent"
        >
          {buildSha}
        </a>
      )}
      {ttfb !== null && (
        <>
          <span className="text-fg-3"> · </span>
          ttfb <span className="text-fg-2">{ttfb} ms</span>
        </>
      )}
    </p>
  );
}
