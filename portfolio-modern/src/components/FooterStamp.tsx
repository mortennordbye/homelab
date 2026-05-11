"use client";

import { useEffect, useState } from "react";

const NODES = ["talos-cp-01", "talos-cp-02", "talos-w-01", "talos-w-02"];

export function FooterStamp({ buildSha }: { buildSha: string }) {
  const [node, setNode] = useState(NODES[0]);
  const [ms, setMs] = useState<number | null>(null);

  useEffect(() => {
    setNode(NODES[Math.floor(Math.random() * NODES.length)]);
    const nav = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    const elapsed = nav?.responseEnd ?? performance.now();
    setMs(Math.max(1, Math.round(elapsed)));
  }, []);

  return (
    <p className="font-mono">
      <span className="mr-2 inline-block h-1.5 w-1.5 align-middle rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />
      served from <span className="text-fg-2">{node}</span>
      <span className="text-fg-3"> · </span>
      build <span className="text-fg-2">{buildSha}</span>
      <span className="text-fg-3"> · </span>
      <span className="text-fg-2">59.9°N · 10.7°E</span>
      <span className="text-fg-3"> · </span>
      render <span className="text-fg-2">{ms === null ? "…" : `${ms}ms`}</span>
    </p>
  );
}
