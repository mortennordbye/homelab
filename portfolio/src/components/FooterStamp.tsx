"use client";

import { useEffect, useState } from "react";

/**
 * The two things the page can measure about its own delivery: the commit it
 * was built from, and time to first byte. No node name until the pod's own
 * `spec.nodeName` reaches the page — the stamp only shows measurements the
 * site actually takes (branding/DECISIONS.md §12; see BACKLOG.md).
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
