"use client";

import { useEffect, useState } from "react";

/**
 * What the page can measure about its own delivery: the commit it was built
 * from, time to first byte, and the node that answered an API call. Only
 * measurements the site actually takes (docs/apps/portfolio/brand/decisions.md §12).
 */
export function FooterStamp({ buildSha, repo }: { buildSha: string; repo: string }) {
  const [ttfb, setTtfb] = useState<number | null>(null);
  const [node, setNode] = useState<string | null>(null);

  useEffect(() => {
    const nav = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    // responseStart, not responseEnd: the wait for the first byte is the part
    // of the number the cluster is answerable for. Absent on a client-side
    // route change into this page, which is why it renders conditionally.
    if (nav?.responseStart) setTtfb(Math.max(1, Math.round(nav.responseStart)));

    // The page itself is prerendered, so this names the pod that answered the
    // API call, which with several replicas need not be the one that served the
    // HTML. Label it as such. no-store: a cached response names a stale pod.
    fetch("/api/v1/infra", { cache: "no-store" })
      .then((r) => setNode(r.headers.get("x-served-by")))
      .catch(() => {});
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
      {node && (
        <>
          <span className="text-fg-3"> · </span>
          api node <span className="text-fg-2">{node}</span>
        </>
      )}
    </p>
  );
}
