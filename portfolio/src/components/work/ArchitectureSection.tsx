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
    <>
      <div className="overflow-x-auto">
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
    </>
  );
}
