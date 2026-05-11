"use client";

import type { Architecture } from "@/content/schemas";
import { ArchitectureDiagram } from "@/components/work/ArchitectureDiagram";

export function CoverDiagram({ arch }: { arch: Architecture }) {
  return (
    <ArchitectureDiagram
      arch={arch}
      selectedId={null}
      hoveredId={null}
      onHover={() => {}}
      onSelect={() => {}}
    />
  );
}
