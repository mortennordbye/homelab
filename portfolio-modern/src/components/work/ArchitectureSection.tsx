"use client";

import { useMemo, useState } from "react";
import type { Architecture } from "@/content/schemas";
import { ArchitectureDiagram } from "./ArchitectureDiagram";
import { ArchitectureDrawer } from "./ArchitectureDrawer";

export function ArchitectureSection({ arch }: { arch: Architecture }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const selectedNode = useMemo(
    () => arch.nodes.find((n) => n.id === selectedId) ?? null,
    [arch.nodes, selectedId],
  );

  return (
    <section className="mt-16">
      <div className="border-b border-line pb-4 font-display text-xs uppercase tracking-[0.2em] text-fg-3">
        architecture
      </div>
      <p className="mt-4 max-w-2xl text-sm text-fg-3">
        Hover a node to highlight its connections. Click one to read what it
        does and why it is there.
      </p>

      <div className="mt-8 overflow-x-auto">
        <div className="min-w-[720px]">
          <ArchitectureDiagram
            arch={arch}
            selectedId={selectedId}
            hoveredId={hoveredId}
            onHover={setHoveredId}
            onSelect={setSelectedId}
          />
        </div>
      </div>

      <ArchitectureDrawer
        node={selectedNode}
        onClose={() => setSelectedId(null)}
      />
    </section>
  );
}
